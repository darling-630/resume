const nodemailer = require('nodemailer');

exports.sendOTPEmail = async (to, otp) => {
  // Configure transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Admin OTP',
    text: `Your OTP is: ${otp}`,
  };

  // Send email
  await transporter.sendMail(mailOptions);
};