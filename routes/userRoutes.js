const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const multer = require('multer');
const path = require('path');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Protect all user routes
router.use(auth, roleCheck('user'));

// User: Upload resume
router.post('/upload', upload.single('resume'), resumeController.uploadResume);

// User: View own resumes
router.get('/resumes', resumeController.getUserResumes);

module.exports = router;