import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: [6, 'OTP must be exactly 6 digits'],
  },
  attempts: {
    type: Number,
    default: 0,
    max: [5, 'Maximum 5 attempts allowed'],
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB will automatically delete expired documents
  },
}, {
  timestamps: true,
});

// Index for better query performance
otpSchema.index({ email: 1, otp: 1 });
otpSchema.index({ expiresAt: 1 });

// Static method to create new OTP
otpSchema.statics.createOTP = async function(email, otp, expiryMinutes = 5) {
  // Delete any existing OTPs for this email
  await this.deleteMany({ email });
  
  // Create new OTP
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
  
  return await this.create({
    email,
    otp,
    expiresAt,
  });
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp) {
  const otpRecord = await this.findOne({
    email,
    otp,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
  
  if (!otpRecord) {
    // Check if there's an OTP record for this email to provide specific error
    const existingOTP = await this.findOne({ email, isUsed: false });
    
    if (!existingOTP) {
      throw new Error('No valid OTP found for this email');
    }
    
    if (existingOTP.expiresAt <= new Date()) {
      throw new Error('OTP has expired');
    }
    
    // Increment attempts
    existingOTP.attempts += 1;
    await existingOTP.save();
    
    if (existingOTP.attempts >= 5) {
      await existingOTP.deleteOne();
      throw new Error('Maximum OTP attempts exceeded. Please request a new OTP');
    }
    
    throw new Error(`Invalid OTP. ${5 - existingOTP.attempts} attempts remaining`);
  }
  
  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();
  
  return true;
};

// Static method to check if OTP exists for email
otpSchema.statics.hasValidOTP = async function(email) {
  const otpRecord = await this.findOne({
    email,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
  
  return !!otpRecord;
};

// Static method to clean up expired OTPs (manual cleanup if needed)
otpSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lte: new Date() },
  });
  
  return result.deletedCount;
};

// Static method to get remaining time for OTP
otpSchema.statics.getRemainingTime = async function(email) {
  const otpRecord = await this.findOne({
    email,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
  
  if (!otpRecord) {
    return 0;
  }
  
  const now = new Date();
  const remaining = Math.max(0, Math.floor((otpRecord.expiresAt - now) / 1000));
  
  return remaining; // Returns remaining seconds
};

// Instance method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return this.expiresAt <= new Date();
};

// Instance method to check if OTP can be used
otpSchema.methods.canBeUsed = function() {
  return !this.isUsed && !this.isExpired() && this.attempts < 5;
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;