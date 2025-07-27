import crypto from 'crypto';

/**
 * Generate a secure 6-digit OTP
 * @returns {string} 6-digit OTP string
 */
export const generateOTP = () => {
  // Generate a random 6-digit number using crypto for security
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

/**
 * Generate OTP with custom length
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} OTP string of specified length
 */
export const generateCustomOTP = (length = 6) => {
  if (length < 4 || length > 10) {
    throw new Error('OTP length must be between 4 and 10 digits');
  }
  
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Generate alphanumeric OTP
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} Alphanumeric OTP string
 */
export const generateAlphanumericOTP = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }
  
  return result;
};

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @param {number} expectedLength - Expected length (default: 6)
 * @returns {boolean} True if valid format
 */
export const validateOTPFormat = (otp, expectedLength = 6) => {
  if (!otp || typeof otp !== 'string') {
    return false;
  }
  
  // Check if OTP is exactly the expected length and contains only digits
  const otpRegex = new RegExp(`^\\d{${expectedLength}}$`);
  return otpRegex.test(otp);
};

/**
 * Generate OTP with expiry information
 * @param {number} expiryMinutes - Expiry time in minutes (default: 5)
 * @returns {object} Object containing OTP and expiry time
 */
export const generateOTPWithExpiry = (expiryMinutes = 5) => {
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
  
  return {
    otp,
    expiresAt,
    expiryMinutes,
  };
};

export default {
  generateOTP,
  generateCustomOTP,
  generateAlphanumericOTP,
  validateOTPFormat,
  generateOTPWithExpiry,
};