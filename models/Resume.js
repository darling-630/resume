import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  // User who uploaded the resume
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  
  // Original file information
  originalFileName: {
    type: String,
    required: [true, 'Original file name is required'],
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  
  // Parsed resume data
  parsedData: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    skills: [{
      type: String,
      trim: true,
      maxlength: [50, 'Each skill cannot exceed 50 characters'],
    }],
    experience: [{
      company: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters'],
      },
      position: {
        type: String,
        trim: true,
        maxlength: [100, 'Position cannot exceed 100 characters'],
      },
      duration: {
        type: String,
        trim: true,
        maxlength: [50, 'Duration cannot exceed 50 characters'],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
      },
    }],
    education: [{
      institution: {
        type: String,
        trim: true,
        maxlength: [100, 'Institution name cannot exceed 100 characters'],
      },
      degree: {
        type: String,
        trim: true,
        maxlength: [100, 'Degree cannot exceed 100 characters'],
      },
      fieldOfStudy: {
        type: String,
        trim: true,
        maxlength: [100, 'Field of study cannot exceed 100 characters'],
      },
      graduationYear: {
        type: String,
        trim: true,
        maxlength: [10, 'Graduation year cannot exceed 10 characters'],
      },
    }],
    summary: {
      type: String,
      trim: true,
      maxlength: [2000, 'Summary cannot exceed 2000 characters'],
    },
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingError: {
    type: String,
    trim: true,
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ 'parsedData.email': 1 });
resumeSchema.index({ 'parsedData.name': 1 });
resumeSchema.index({ processingStatus: 1 });

// Virtual for file URL
resumeSchema.virtual('fileUrl').get(function() {
  return `/uploads/${this.fileName}`;
});

// Static method to get resumes by user
resumeSchema.statics.getByUser = function(userId, options = {}) {
  const query = { userId, isActive: true };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .populate('userId', 'username email');
};

// Static method to get all resumes (admin only)
resumeSchema.statics.getAllResumes = function(options = {}) {
  const query = { isActive: true };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .populate('userId', 'username email role');
};

// Static method to search resumes
resumeSchema.statics.searchResumes = function(searchTerm, options = {}) {
  const query = {
    isActive: true,
    $or: [
      { 'parsedData.name': { $regex: searchTerm, $options: 'i' } },
      { 'parsedData.email': { $regex: searchTerm, $options: 'i' } },
      { 'parsedData.skills': { $in: [new RegExp(searchTerm, 'i')] } },
      { 'parsedData.experience.company': { $regex: searchTerm, $options: 'i' } },
      { 'parsedData.experience.position': { $regex: searchTerm, $options: 'i' } },
    ],
  };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .populate('userId', 'username email');
};

// Instance method to update processing status
resumeSchema.methods.updateProcessingStatus = function(status, error = null) {
  this.processingStatus = status;
  if (error) {
    this.processingError = error;
  }
  return this.save();
};

// Instance method to mark as deleted (soft delete)
resumeSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

// Ensure virtual fields are serialized
resumeSchema.set('toJSON', { virtuals: true });
resumeSchema.set('toObject', { virtuals: true });

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;