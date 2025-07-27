const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filePath: { type: String, required: true },
  parsedData: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experience: String,
    education: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);