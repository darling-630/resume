const User = require('../models/User');
const bcrypt = require('bcrypt');

// Admin: Create user account
exports.createUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, role: 'user' });
    res.status(201).json({ message: 'User created', user: { username: user.username, id: user._id } });
  } catch (err) {
    res.status(500).json({ message: 'User creation failed', error: err.message });
  }
};