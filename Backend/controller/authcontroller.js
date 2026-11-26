const crypto = require('node:crypto');
const User = require('../model/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utilis/sendEmail');
const { verifyGoogleToken } = require('../utilis/googleToken');

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

function hashOtp(email, otp) {
    return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${otp}`).digest('hex');
}

function issueOtp(user) {
    const otp = crypto.randomInt(100000, 1000000).toString();
    user.verificationOtpHash = hashOtp(user.email, otp);
    user.verificationOtpExpiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
    user.verificationOtpAttempts = 0;
    user.verificationOtpSentAt = new Date();
    return otp;
}

async function deliverVerificationOtp(user, otp) {
    await sendEmail(
        user.email,
        'Verify your Gayatri Traders account',
        `Your account verification code is ${otp}. It expires in 10 minutes. Do not share it with anyone.`
    );
}

const registerUser = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Enter a valid name and email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                message: existingUser.verified
                    ? 'An account already exists for this email.'
                    : 'This account still needs email verification. Request a new code instead.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ name, email, password: hashedPassword, authProvider: 'password' });
        const otp = issueOtp(user);
        await user.save();
        try {
            await deliverVerificationOtp(user, otp);
        } catch (emailError) {
            await User.deleteOne({ _id: user._id });
            console.error('Registration verification email failed:', emailError.message);
            return res.status(503).json({ message: 'Email delivery is unavailable. Check the email configuration and try again.' });
        }

        return res.status(201).json({ message: 'Verification code sent. Verify your email before signing in.' });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'An account already exists for this email.' });
        console.error('Registration failed:', error.message);
        return res.status(500).json({ message: 'Could not register this account.' });
    }
};

const verifyEmail = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (!email || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'Enter the email and 6-digit verification code.' });
    }

    try {
        const user = await User.findOne({ email, authProvider: 'password' });
        if (!user || user.verified || !user.verificationOtpHash) {
            return res.status(400).json({ message: 'Verification code is invalid or expired.' });
        }
        if (user.verificationOtpAttempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({ message: 'Too many attempts. Request a new verification code.' });
        }
        if (!user.verificationOtpExpiresAt || user.verificationOtpExpiresAt.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Verification code has expired. Request a new one.' });
        }

        const expected = Buffer.from(user.verificationOtpHash, 'hex');
        const received = Buffer.from(hashOtp(email, otp), 'hex');
        if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
            user.verificationOtpAttempts += 1;
            await user.save();
            return res.status(400).json({ message: 'Verification code is invalid.' });
        }

        user.verified = true;
        user.verificationOtpHash = null;
        user.verificationOtpExpiresAt = null;
        user.verificationOtpAttempts = 0;
        user.verificationOtpSentAt = null;
        await user.save();
        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Email verification failed:', error.message);
        return res.status(500).json({ message: 'Could not verify this email.' });
    }
};

const resendVerification = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    try {
        const user = await User.findOne({ email, authProvider: 'password', verified: false });
        if (!user) return res.status(200).json({ message: 'If verification is needed, a new code will be sent.' });
        if (user.verificationOtpSentAt && Date.now() - user.verificationOtpSentAt.getTime() < OTP_RESEND_DELAY_MS) {
            return res.status(429).json({ message: 'Wait one minute before requesting another code.' });
        }

        const otp = issueOtp(user);
        await user.save();
        await deliverVerificationOtp(user, otp);
        return res.status(200).json({ message: 'A new verification code has been sent.' });
    } catch (error) {
        console.error('Could not resend verification email:', error.message);
        return res.status(503).json({ message: 'Could not send a verification code. Check the email configuration.' });
    }
};

const loginUser = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    try {
        const user = await User.findOne({ email });
        if (!user || !user.password || !(await bcrypt.compare(password || '', user.password))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        if (!user.verified && user.role !== 'admin') {
            return res.status(403).json({ message: 'Verify your email before signing in.' });
        }
        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Login failed:', error.message);
        return res.status(500).json({ message: 'Could not sign in.' });
    }
};

const googleLogin = async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ message: 'Google sign-in is not configured.' });

    let identity;
    try {
        identity = await verifyGoogleToken(req.body.credential, clientId);
    } catch (error) {
        console.error('Google credential verification failed:', error.message);
        const status = error.message.includes('public keys') ? 503 : 401;
        return res.status(status).json({
            message: status === 503
                ? 'Google sign-in is temporarily unavailable.'
                : 'Google sign-in could not be verified. Please try again.'
        });
    }

    try {
        let user = await User.findOne({ email: identity.email });
        if (!user) {
            user = new User({
                name: identity.name,
                email: identity.email,
                authProvider: 'google',
                googleId: identity.googleId,
                verified: true
            });
        } else {
            user.name = identity.name;
            user.googleId = identity.googleId;
            user.verified = true;
        }
        await user.save();
        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Could not save Google account:', error.message);
        return res.status(500).json({ message: 'Could not sign in with Google.' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password -verificationOtpHash -googleId');
        return res.json(users);
    } catch (error) {
        console.error('Could not fetch users:', error.message);
        return res.status(500).json({ message: 'Could not fetch users.' });
    }
};

module.exports = { registerUser, verifyEmail, resendVerification, loginUser, googleLogin, getUsers };
