import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send OTP email to admin
 * @param {string} email - Recipient email address
 * @param {string} otp - OTP code to send
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<object>} Email sending result
 */
export const sendOTPEmail = async (email, otp, expiryMinutes = 5) => {
  try {
    const transporter = createTransporter();
    
    // Verify transporter configuration
    await transporter.verify();
    
    const mailOptions = {
      from: {
        name: 'Resume Management System',
        address: process.env.EMAIL_FROM,
      },
      to: email,
      subject: 'Admin Login OTP - Resume Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Login OTP</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              background-color: #007bff;
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              margin: -20px -20px 20px -20px;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              letter-spacing: 5px;
              margin: 20px 0;
              border: 2px dashed #007bff;
            }
            .warning {
              background-color: #fff3cd;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Admin Login Verification</h1>
              <p>Resume Management System</p>
            </div>
            
            <h2>Hello Admin,</h2>
            <p>You have requested to log in to the Resume Management System. Please use the following One-Time Password (OTP) to complete your login:</p>
            
            <div class="otp-code">
              ${otp}
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul>
                <li>This OTP will expire in <strong>${expiryMinutes} minutes</strong></li>
                <li>Do not share this OTP with anyone</li>
                <li>If you didn't request this login, please ignore this email</li>
                <li>Maximum 5 attempts allowed before requesting a new OTP</li>
              </ul>
            </div>
            
            <p>If you're having trouble logging in, please contact your system administrator.</p>
            
            <div class="footer">
              <p>This is an automated email from Resume Management System.</p>
              <p>Please do not reply to this email.</p>
              <p>Generated at: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Admin Login OTP - Resume Management System
        
        Hello Admin,
        
        You have requested to log in to the Resume Management System.
        Your One-Time Password (OTP) is: ${otp}
        
        Important:
        - This OTP will expire in ${expiryMinutes} minutes
        - Do not share this OTP with anyone
        - Maximum 5 attempts allowed
        
        If you didn't request this login, please ignore this email.
        
        Generated at: ${new Date().toLocaleString()}
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('OTP email sent successfully:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'OTP email sent successfully',
    };
    
  } catch (error) {
    console.error('Error sending OTP email:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send OTP email',
    };
  }
};

/**
 * Send notification email about new user creation
 * @param {string} adminEmail - Admin email address
 * @param {object} userData - New user data
 * @returns {Promise<object>} Email sending result
 */
export const sendUserCreationNotification = async (adminEmail, userData) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Resume Management System',
        address: process.env.EMAIL_FROM,
      },
      to: adminEmail,
      subject: 'New User Account Created - Resume Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New User Created</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 15px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New User Account Created</h2>
            </div>
            <div class="content">
              <p><strong>A new user account has been successfully created:</strong></p>
              <ul>
                <li><strong>Username:</strong> ${userData.username}</li>
                <li><strong>Created at:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Account ID:</strong> ${userData._id || 'N/A'}</li>
              </ul>
              <p>The user can now log in with their credentials and upload resumes.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'User creation notification sent successfully',
    };
    
  } catch (error) {
    console.error('Error sending user creation notification:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send user creation notification',
    };
  }
};

/**
 * Test email configuration
 * @returns {Promise<object>} Configuration test result
 */
export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    return {
      success: true,
      message: 'Email configuration is valid',
    };
    
  } catch (error) {
    console.error('Email configuration test failed:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Email configuration is invalid',
    };
  }
};

export default {
  sendOTPEmail,
  sendUserCreationNotification,
  testEmailConfiguration,
};