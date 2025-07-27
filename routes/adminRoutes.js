const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const resumeController = require('../controllers/resumeController');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

// Protect all admin routes
router.use(auth, roleCheck('admin'));

// Admin: Create user
router.post('/create-user', userController.createUser);

// Admin: View all resumes
router.get('/resumes', resumeController.getAllResumes);

module.exports = router;