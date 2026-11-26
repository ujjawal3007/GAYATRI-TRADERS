const mongoose = require ('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function passwordRequired() {
            return this.authProvider === 'password';
        },
        default: null
    },
    authProvider: { type: String, enum: ['password', 'google'], default: 'password' },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationOtpHash: { type: String, default: null },
    verificationOtpExpiresAt: { type: Date, default: null },
    verificationOtpAttempts: { type: Number, default: 0 },
    verificationOtpSentAt: { type: Date, default: null },
    googleId: { type: String, default: null }
});


module.exports = mongoose.models.User || mongoose.model('User', userSchema);