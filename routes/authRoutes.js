const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Admin OTP login
router.post('/admin/send-otp', authController.sendAdminOTP);
router.post('/admin/verify-otp', authController.verifyAdminOTP);

// User login
router.post('/user/login', authController.userLogin);

module.exports = router;