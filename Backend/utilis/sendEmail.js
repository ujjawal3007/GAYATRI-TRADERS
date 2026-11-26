const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  const emailUser = process.env.EMAIL_USER || process.env.EMAIL_User;
  if (!emailUser || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured to send email.");
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: process.env.EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: emailUser,
    to,
    subject,
    text,
  };
  return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;