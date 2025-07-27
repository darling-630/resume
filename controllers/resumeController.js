const Resume = require('../models/Resume');
const { parseResume } = require('../utils/resumeParser');
const path = require('path');

// User: Upload resume and parse
exports.uploadResume = async (req, res) => {
  try {
    const filePath = req.file.path;
    const parsedData = await parseResume(filePath);
    const resume = await Resume.create({
      user: req.user.id,
      filePath,
      parsedData,
    });
    res.status(201).json(resume);
  } catch (err) {
    res.status(500).json({ message: 'Resume upload failed', error: err.message });
  }
};

// User: View own resumes
exports.getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id });
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch resumes', error: err.message });
  }
};

// Admin: View all parsed resumes
exports.getAllResumes = async (req, res) => {
  try {
    const resumes = await Resume.find().populate('user', 'username email');
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all resumes', error: err.message });
  }
};