const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String }, // Not required for admin (OTP login)
  email: { type: String, required: function() { return this.role === 'admin'; }, unique: true },
  role: { type: String, enum: ['admin', 'user'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);