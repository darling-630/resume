const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/otpGenerator');
const { sendOTPEmail } = require('../utils/emailSender');

// Admin: Send OTP to email
exports.sendAdminOTP = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await OTP.create({ email, code, expiresAt });
    await sendOTPEmail(email, code);
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending OTP', error: err.message });
  }
};

// Admin: Verify OTP and return JWT
exports.verifyAdminOTP = async (req, res) => {
  const { email, code } = req.body;
  try {
    const otpDoc = await OTP.findOne({ email, code });
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    await OTP.deleteMany({ email }); // Invalidate all OTPs for this email
    const admin = await User.findOne({ email, role: 'admin' });
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
};

// User: Login with username & password
exports.userLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, role: 'user' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};