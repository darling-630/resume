import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { testEmailConfiguration } from '../utils/emailSender.js';

// Load environment variables
dotenv.config();

/**
 * Setup script for initializing the MERN Resume Backend
 * This script helps with initial configuration and admin setup
 */

const setup = async () => {
  try {
    console.log('🚀 Starting MERN Resume Backend Setup...\n');

    // Check environment variables
    console.log('📋 Checking environment configuration...');
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS',
      'ADMIN_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
    
    console.log('✅ Environment variables are properly configured\n');

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB\n');

    // Test email configuration
    console.log('📧 Testing email configuration...');
    const emailTest = await testEmailConfiguration();
    
    if (emailTest.success) {
      console.log('✅ Email configuration is working\n');
    } else {
      console.error('❌ Email configuration failed:', emailTest.error);
      console.error('Please check your email settings in .env file\n');
    }

    // Check for existing admin
    console.log('👤 Checking admin user configuration...');
    const existingAdmin = await User.findAdmin();
    
    if (existingAdmin) {
      console.log(`✅ Admin user already exists: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      console.log(`   Last Login: ${existingAdmin.lastLogin || 'Never'}\n`);
    } else {
      console.log('ℹ️  No admin user found in database');
      console.log('   Admin will be created automatically on first OTP verification');
      console.log(`   Admin email: ${process.env.ADMIN_EMAIL}\n`);
    }

    // Display configuration summary
    console.log('📊 Configuration Summary:');
    console.log(`   Server Port: ${process.env.PORT || 5000}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: ${process.env.MONGODB_URI}`);
    console.log(`   Admin Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`   JWT Expiry: ${process.env.JWT_EXPIRE || '7d'}`);
    console.log(`   OTP Expiry: ${process.env.OTP_EXPIRY_MINUTES || 5} minutes`);
    console.log(`   Max File Size: ${Math.round((process.env.MAX_FILE_SIZE || 5000000) / 1024 / 1024)}MB\n`);

    // Check uploads directory
    console.log('📁 Checking uploads directory...');
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadsDir = path.join(__dirname, '../uploads');
      
      await fs.access(uploadsDir);
      console.log('✅ Uploads directory exists and is accessible\n');
    } catch (error) {
      console.error('❌ Uploads directory not accessible:', error.message);
      console.error('Please ensure the uploads directory exists and has proper permissions\n');
    }

    console.log('✅ Setup completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test admin login by sending OTP to admin email');
    console.log('3. Create user accounts via admin panel');
    console.log('4. Upload and test resume parsing functionality');
    console.log('\n📚 API Documentation:');
    console.log('   Health Check: GET /api/health');
    console.log('   Admin OTP: POST /api/auth/admin/send-otp');
    console.log('   User Login: POST /api/auth/user/login');
    console.log('\nRefer to README.md for complete API documentation.');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    
    if (error.name === 'MongooseError') {
      console.error('\nMongoDB connection issues:');
      console.error('- Ensure MongoDB is running');
      console.error('- Check MONGODB_URI in .env file');
      console.error('- Verify network connectivity');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup();
}

export default setup;