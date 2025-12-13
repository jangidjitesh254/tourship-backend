# 🏰 Tourship Backend API

**Rajasthan Tourism Intelligence System - Backend Server**

A robust Node.js/Express backend with MongoDB for the Tourship tourism management platform.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [API Endpoints](#-api-endpoints)
- [User Schema](#-user-schema)
- [Authentication](#-authentication)
- [Error Handling](#-error-handling)
- [Environment Variables](#-environment-variables)

---

## ✨ Features

- ✅ User Registration & Authentication (JWT)
- ✅ Password Hashing (bcrypt)
- ✅ Input Validation (express-validator)
- ✅ Rate Limiting
- ✅ CORS Configuration
- ✅ Security Headers (Helmet)
- ✅ Error Handling
- ✅ User Profile Management
- ✅ Password Reset Flow
- ✅ Admin User Management
- ✅ Pagination & Filtering

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | Web Framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| express-validator | Input Validation |
| helmet | Security Headers |
| cors | Cross-Origin Resource Sharing |
| morgan | HTTP Logging |
| dotenv | Environment Variables |

---

## 📁 Project Structure

```
tourship-backend/
├── src/
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   ├── controllers/
│   │   └── authController.js # Authentication logic
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── errorHandler.js   # Error handling
│   │   └── validators.js     # Input validation
│   ├── models/
│   │   └── User.js           # User schema
│   ├── routes/
│   │   ├── authRoutes.js     # Auth endpoints
│   │   └── userRoutes.js     # User management
│   ├── utils/
│   │   └── helpers.js        # Utility functions
│   └── server.js             # Entry point
├── public/
│   └── uploads/              # File uploads
├── .env                      # Environment variables
├── .env.example              # Env template
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js (v18+)
- MongoDB (local or Atlas)
- npm or yarn

### Step 1: Install Dependencies

```bash
cd tourship-backend
npm install
```

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

### Step 3: Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas:**
Update `MONGODB_URI` in `.env` with your connection string.

### Step 4: Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start at: `http://localhost:5000`

---

## 📡 API Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |
| GET | `/api` | API information |

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| PUT | `/api/auth/profile` | Update profile | ✅ |
| PUT | `/api/auth/change-password` | Change password | ✅ |
| POST | `/api/auth/forgot-password` | Request password reset | ❌ |
| PUT | `/api/auth/reset-password/:token` | Reset password | ❌ |
| DELETE | `/api/auth/account` | Delete account | ✅ |
| POST | `/api/auth/logout` | Logout | ✅ |

### User Management (Admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |
| GET | `/api/users/stats/overview` | User statistics | Admin |

---

## 📝 User Schema

```javascript
{
  // Basic Info
  email: String (required, unique)
  password: String (required, hashed)
  phone: String (required, 10 digits)
  
  // Personal Info
  firstName: String (required)
  lastName: String
  profilePicture: String
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  
  // Address
  address: {
    street: String
    city: String
    state: String (default: 'Rajasthan')
    pincode: String (6 digits)
    country: String (default: 'India')
  }
  
  // Tourist Info
  nationality: String
  touristType: 'domestic' | 'international'
  passportNumber: String
  preferredLanguage: 'english' | 'hindi' | 'rajasthani' | 'other'
  
  // Preferences
  preferences: {
    notifications: { email, sms, push }
    interests: ['forts', 'palaces', 'temples', ...]
  }
  
  // Account Status
  isVerified: Boolean
  isActive: Boolean
  role: 'user' | 'admin' | 'staff'
  
  // Timestamps
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔐 Authentication

### Register

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "phone": "9876543210",
  "firstName": "John",
  "lastName": "Doe",
  "address": {
    "city": "Jaipur",
    "pincode": "302001"
  }
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Using Token

Include the token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## ⚠️ Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRE` | Token expiry | 7d |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |

---

## 🧪 Testing with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "phone": "9876543210",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📄 License

MIT License - Team Ashoka

---

## 👥 Team

**Team Ashoka**
- Jitesh Jangir (Team Lead)
- Email: jangidjitesh254@gmail.com
- Phone: +91 7665450060
- College: Vivekananda Global University, Jaipur
