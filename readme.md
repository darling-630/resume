# MERN Resume Parser Backend

## Folder Structure

```
models/         # Mongoose schemas (User.js, Resume.js, OTP.js)
controllers/    # Business logic (authController.js, userController.js, resumeController.js)
routes/         # Express routers (authRoutes.js, adminRoutes.js, userRoutes.js)
middlewares/    # JWT auth and role check (auth.js, roleCheck.js)
utils/          # Helper utilities (otpGenerator.js, emailSender.js, resumeParser.js)
uploads/        # Uploaded resume files (PDF/DOCX)
server.js       # Main server entry point
.env            # Environment variables
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```
3. Start the server:
   ```bash
   npm start
   ```

## API Overview

- **Admin**
  - POST `/api/auth/admin/send-otp` — Send OTP to admin email
  - POST `/api/auth/admin/verify-otp` — Verify OTP, receive JWT
  - POST `/api/admin/create-user` — Create user (username, password)
  - GET `/api/admin/resumes` — View all parsed resumes
- **User**
  - POST `/api/auth/user/login` — Login with credentials
  - POST `/api/user/upload` — Upload resume (PDF/DOCX)
  - GET `/api/user/resumes` — View own resumes

## Notes
- Use Bearer JWT token for all protected routes.
- Admin and user roles are enforced via middleware.
- Resume parsing supports PDF and DOCX (basic field extraction).