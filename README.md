# MERN Stack Resume Management System

A comprehensive MERN stack backend application for managing resume uploads and parsing with role-based authentication (Admin and User roles).

## Features

### 🔐 Authentication & Authorization
- **Admin Authentication**: OTP-based login via email (5-minute expiry)
- **User Authentication**: Username/password based login with JWT tokens
- **Role-based Access Control**: Separate permissions for admin and user roles
- **Secure Password Hashing**: bcrypt with salt rounds for password security

### 👥 User Management (Admin Only)
- Create user accounts with username and password
- View all users with pagination and search
- Update user information and status
- Reset user passwords
- Soft delete/deactivate user accounts
- User statistics and analytics

### 📄 Resume Management
- **File Upload**: Support for PDF and DOCX files (max 5MB)
- **Smart Parsing**: Extract structured data from resumes:
  - Name, Email, Phone
  - Skills and Technologies
  - Work Experience
  - Education Background
- **File Storage**: Secure local file storage with unique naming
- **Role-based Access**:
  - Users: Upload and manage their own resumes
  - Admins: View and manage all resumes

### 📊 Data Analytics
- User registration and activity statistics
- Resume upload and processing statistics
- Success/failure rates for resume parsing
- Recent activity tracking

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens and OTP via email
- **File Processing**: PDF-parse, Mammoth for document parsing
- **Email Service**: Nodemailer for OTP delivery
- **Security**: Helmet, CORS, Rate limiting, bcrypt
- **Validation**: Express-validator for input validation
- **File Upload**: Multer for multipart/form-data handling

## Project Structure

```
mern-resume-backend/
├── controllers/           # Business logic
│   ├── authController.js  # Authentication handling
│   ├── userController.js  # User management
│   └── resumeController.js # Resume operations
├── middlewares/           # Express middlewares
│   ├── auth.js           # JWT authentication
│   └── roleCheck.js      # Role-based access control
├── models/               # Mongoose schemas
│   ├── User.js          # User data model
│   ├── Resume.js        # Resume data model
│   └── OTP.js           # OTP data model
├── routes/              # API routes
│   ├── authRoutes.js    # Authentication endpoints
│   ├── adminRoutes.js   # Admin-only endpoints
│   └── userRoutes.js    # User endpoints
├── utils/               # Utility functions
│   ├── otpGenerator.js  # OTP generation
│   ├── emailSender.js   # Email service
│   └── resumeParser.js  # Resume parsing logic
├── uploads/             # File storage directory
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
└── .env.example        # Environment variables template
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Gmail account for email service (or other SMTP provider)

### 1. Clone Repository
```bash
git clone <repository-url>
cd mern-resume-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/mern-resume-app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Admin Configuration
ADMIN_EMAIL=admin@company.com

# File Upload Configuration
MAX_FILE_SIZE=5000000
ALLOWED_FILE_TYPES=pdf,docx

# OTP Configuration
OTP_EXPIRY_MINUTES=5
```

### 4. Start MongoDB
Ensure MongoDB is running on your system.

### 5. Run the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Admin Login
```http
# Send OTP to admin email
POST /api/auth/admin/send-otp
Content-Type: application/json

{
  "email": "admin@company.com"
}

# Verify OTP and get token
POST /api/auth/admin/verify-otp
Content-Type: application/json

{
  "email": "admin@company.com",
  "otp": "123456"
}
```

#### User Login
```http
POST /api/auth/user/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt-token>
```

### Admin Endpoints

#### User Management
```http
# Create new user
POST /api/admin/users
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "SecurePass123"
}

# Get all users
GET /api/admin/users?page=1&limit=20&search=username&status=active
Authorization: Bearer <admin-jwt-token>

# Get user by ID
GET /api/admin/users/{userId}
Authorization: Bearer <admin-jwt-token>

# Update user
PUT /api/admin/users/{userId}
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "username": "updateduser",
  "isActive": true
}

# Reset user password
POST /api/admin/users/{userId}/reset-password
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "newPassword": "NewSecurePass123"
}

# Delete/deactivate user
DELETE /api/admin/users/{userId}?permanent=false
Authorization: Bearer <admin-jwt-token>
```

#### Resume Management
```http
# Get all resumes
GET /api/admin/resumes?page=1&limit=20&search=name&status=completed
Authorization: Bearer <admin-jwt-token>

# Get resume statistics
GET /api/admin/resumes/stats
Authorization: Bearer <admin-jwt-token>
```

### User Endpoints

#### Resume Operations
```http
# Upload resume
POST /api/user/resumes/upload
Authorization: Bearer <user-jwt-token>
Content-Type: multipart/form-data

resume: [PDF or DOCX file]

# Get user's resumes
GET /api/user/resumes?page=1&limit=10&status=completed
Authorization: Bearer <user-jwt-token>

# Get specific resume
GET /api/user/resumes/{resumeId}
Authorization: Bearer <user-jwt-token>

# Download resume file
GET /api/user/resumes/{resumeId}/download
Authorization: Bearer <user-jwt-token>

# Reprocess resume
POST /api/user/resumes/{resumeId}/reprocess
Authorization: Bearer <user-jwt-token>

# Delete resume
DELETE /api/user/resumes/{resumeId}
Authorization: Bearer <user-jwt-token>
```

#### User Profile
```http
# Get user profile with stats
GET /api/user/profile
Authorization: Bearer <user-jwt-token>

# Get user dashboard
GET /api/user/dashboard
Authorization: Bearer <user-jwt-token>
```

## Usage Examples

### 1. Admin Workflow
```bash
# 1. Send OTP to admin email
curl -X POST http://localhost:5000/api/auth/admin/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com"}'

# 2. Verify OTP (check email for 6-digit code)
curl -X POST http://localhost:5000/api/auth/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "otp": "123456"}'

# 3. Create new user (use token from step 2)
curl -X POST http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "SecurePass123"}'
```

### 2. User Workflow
```bash
# 1. Login as user
curl -X POST http://localhost:5000/api/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "SecurePass123"}'

# 2. Upload resume (use token from step 1)
curl -X POST http://localhost:5000/api/user/resumes/upload \
  -H "Authorization: Bearer <user-token>" \
  -F "resume=@/path/to/resume.pdf"

# 3. View uploaded resumes
curl -X GET http://localhost:5000/api/user/resumes \
  -H "Authorization: Bearer <user-token>"
```

## Resume Parsing Features

The system automatically extracts the following information from uploaded resumes:

- **Personal Information**: Name, email, phone number
- **Skills**: Technical skills and technologies
- **Work Experience**: Company names, positions, duration, descriptions
- **Education**: Institutions, degrees, graduation years
- **Summary**: First 2000 characters as overview

### Supported File Formats
- PDF (.pdf)
- Microsoft Word (.docx)

### File Size Limits
- Maximum file size: 5MB
- Automatic file cleanup on errors

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure authentication with expiration
- **Rate Limiting**: Prevents brute force attacks
- **CORS Protection**: Configurable cross-origin requests
- **Helmet Security**: Security headers for Express
- **Input Validation**: Comprehensive request validation
- **File Type Validation**: Only allowed file types accepted
- **Role-based Access**: Strict permission controls

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `EMAIL_HOST` | SMTP host | Required |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username | Required |
| `EMAIL_PASS` | SMTP password | Required |
| `ADMIN_EMAIL` | Admin email address | Required |
| `MAX_FILE_SIZE` | Max upload size in bytes | `5000000` |
| `OTP_EXPIRY_MINUTES` | OTP expiration time | `5` |

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)",
  "errors": [
    {
      "field": "fieldname",
      "message": "Validation error message"
    }
  ]
}
```

## Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

### Code Style
- ES6+ modules with import/export
- Async/await for asynchronous operations
- Comprehensive error handling
- Detailed logging and comments

## Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production MongoDB instance
4. Set up proper email service (not Gmail for production)
5. Configure reverse proxy (nginx)
6. Set up SSL certificates
7. Configure monitoring and logging

### Docker Support (Optional)
You can containerize the application:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check existing issues in the repository
2. Create new issue with detailed description
3. Include environment details and error logs

---

**Note**: This is a backend-only implementation. You'll need to create a frontend application (React, Vue, Angular) to interact with these APIs for a complete MERN stack application.