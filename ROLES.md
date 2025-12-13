# 🎭 Tourship Role System

## Overview

Tourship has 4 user roles, each with different capabilities and features:

| Role | Description | Verification Required |
|------|-------------|----------------------|
| 🧳 **Tourist** | Regular users exploring Rajasthan | No |
| 🎯 **Guide** | Licensed tour guides | Yes |
| 🏢 **Organiser** | Travel agencies & tour operators | Yes |
| 👑 **Admin** | System administrators | Created by super admin |

---

## 🧳 Tourist (Default)

### Features
- Book tours and packages
- Check-in at attractions (QR)
- Create and save itineraries
- Rate and review attractions/guides
- Earn loyalty points

### Profile Fields
```javascript
touristProfile: {
  travelPreferences: ['solo', 'couple', 'family', 'adventure', ...],
  visitedAttractions: [...],
  savedItineraries: [...],
  bookingHistory: [...],
  loyaltyPoints: 0,
  membershipTier: 'bronze' // bronze, silver, gold, platinum
}
```

### Registration
```bash
POST /api/auth/register
{
  "email": "tourist@example.com",
  "password": "password123",
  "phone": "9876543210",
  "firstName": "Rahul",
  "lastName": "Sharma",
  "role": "tourist"  // Optional, defaults to tourist
}
```

---

## 🎯 Guide

### Features
- Create tour offerings
- Manage availability schedule
- Receive bookings
- Get verified badge
- Access guide dashboard

### Profile Fields
```javascript
guideProfile: {
  licenseNumber: "RJ-GUIDE-12345",
  experienceYears: 5,
  specializations: ['historical', 'cultural', 'photography', ...],
  languagesSpoken: [
    { language: 'english', proficiency: 'fluent' },
    { language: 'hindi', proficiency: 'native' }
  ],
  operatingDistricts: ['jaipur', 'udaipur', 'jodhpur'],
  hourlyRate: 500,
  dailyRate: 3000,
  availability: {
    monday: { available: true, slots: ['morning', 'afternoon'] },
    ...
  },
  isVerified: false,
  verificationStatus: 'pending', // pending, under_review, approved, rejected
  averageRating: 4.5,
  totalReviews: 120,
  totalTours: 450,
  bio: "Experienced guide with passion for Rajasthani history...",
  tagline: "Making history come alive!"
}
```

### Registration
```bash
POST /api/auth/register
{
  "email": "guide@example.com",
  "password": "password123",
  "phone": "9876543211",
  "firstName": "Vikram",
  "lastName": "Singh",
  "role": "guide",
  "guideProfile": {
    "licenseNumber": "RJ-GUIDE-12345",
    "experienceYears": 5,
    "specializations": ["historical", "cultural"],
    "languagesSpoken": [
      { "language": "english", "proficiency": "fluent" },
      { "language": "hindi", "proficiency": "native" }
    ],
    "operatingDistricts": ["jaipur", "udaipur"],
    "hourlyRate": 500,
    "dailyRate": 3000
  }
}
```

### Guide API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/guide/all` | List all verified guides | Public |
| GET | `/api/guide/:id` | Get guide details | Public |
| GET | `/api/guide/me/profile` | Get own profile | Guide |
| PUT | `/api/guide/me/profile` | Update profile | Guide |
| POST | `/api/guide/me/submit-verification` | Submit for verification | Guide |
| PUT | `/api/guide/me/availability` | Update availability | Guide |
| GET | `/api/guide/me/dashboard` | Dashboard stats | Guide |

### Verification Process
1. Guide registers with `role: "guide"`
2. Completes profile (license, languages, districts)
3. Submits for verification: `POST /api/guide/me/submit-verification`
4. Admin reviews and approves/rejects
5. Once verified, guide can receive bookings

---

## 🏢 Organiser (Travel Agency/Tour Operator)

### Features
- Create tour packages
- Manage company profile
- Process bookings
- Get verified business badge
- Access analytics dashboard

### Profile Fields
```javascript
organiserProfile: {
  companyName: "Royal Rajasthan Tours",
  companyType: "tour_operator", // travel_agency, tour_operator, hotel, transport, event_organizer
  registrationNumber: "REG-12345",
  gstNumber: "29ABCDE1234F1Z5",
  establishedYear: 2010,
  employeeCount: "11-50",
  annualTourists: "2000-10000",
  businessEmail: "info@royalrajasthan.com",
  businessPhone: "1800-123-4567",
  website: "https://royalrajasthan.com",
  businessAddress: {
    street: "MI Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001"
  },
  servicesOffered: ['guided_tours', 'package_tours', 'hotel_booking', 'transport'],
  operatingRegions: ['jaipur', 'udaipur', 'jodhpur', 'all_rajasthan'],
  isVerified: false,
  verificationStatus: 'pending',
  averageRating: 4.3,
  totalReviews: 89,
  totalPackages: 25,
  totalBookings: 1500,
  description: "Premium tour operator specializing in heritage tours...",
  tagline: "Experience Royal Rajasthan",
  logo: "https://..."
}
```

### Registration
```bash
POST /api/auth/register
{
  "email": "agency@example.com",
  "password": "password123",
  "phone": "9876543212",
  "firstName": "Anil",
  "lastName": "Mehta",
  "role": "organiser",
  "organiserProfile": {
    "companyName": "Royal Rajasthan Tours",
    "companyType": "tour_operator",
    "registrationNumber": "REG-12345",
    "businessEmail": "info@royalrajasthan.com",
    "servicesOffered": ["guided_tours", "package_tours"],
    "operatingRegions": ["jaipur", "udaipur"]
  }
}
```

### Organiser API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/organiser/all` | List verified organisers | Public |
| GET | `/api/organiser/:id` | Get organiser details | Public |
| GET | `/api/organiser/me/profile` | Get own profile | Organiser |
| PUT | `/api/organiser/me/profile` | Update profile | Organiser |
| POST | `/api/organiser/me/submit-verification` | Submit for verification | Organiser |
| GET | `/api/organiser/me/dashboard` | Dashboard stats | Organiser |
| POST | `/api/organiser/me/packages` | Create package | Verified Organiser |

---

## 👑 Admin

### Features
- Manage all users
- Verify guides & organisers
- View analytics & reports
- Ban/unban users
- Create other admins (super admin only)

### Profile Fields
```javascript
adminProfile: {
  department: "operations", // operations, support, marketing, technical, management, super_admin
  permissions: [
    'manage_users',
    'manage_guides',
    'manage_organisers',
    'manage_attractions',
    'manage_bookings',
    'view_analytics',
    'manage_content',
    'manage_settings',
    'verify_users',
    'financial_access',
    'full_access'  // Super admin
  ],
  assignedDistricts: ['jaipur', 'udaipur', 'all']
}
```

### Admin Creation (By Super Admin)
```bash
POST /api/admin/create-admin
Authorization: Bearer <super_admin_token>

{
  "email": "newadmin@tourship.com",
  "password": "admin123",
  "phone": "9876543299",
  "firstName": "Admin",
  "lastName": "User",
  "department": "operations",
  "permissions": ["manage_users", "verify_users", "view_analytics"]
}
```

### Admin API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/admin/dashboard` | Dashboard stats | Admin |
| GET | `/api/admin/analytics/registrations` | Registration analytics | view_analytics |
| GET | `/api/admin/users` | List all users | manage_users |
| GET | `/api/admin/users/:id` | Get user details | manage_users |
| PUT | `/api/admin/users/:id` | Update user | manage_users |
| DELETE | `/api/admin/users/:id` | Delete user | manage_users |
| PUT | `/api/admin/users/:id/ban` | Ban/unban user | manage_users |
| GET | `/api/admin/verifications/pending` | Pending verifications | verify_users |
| PUT | `/api/admin/verify/guide/:id` | Verify guide | verify_users |
| PUT | `/api/admin/verify/organiser/:id` | Verify organiser | verify_users |
| POST | `/api/admin/create-admin` | Create admin | full_access |

---

## 📊 Complete API Reference

### Authentication (All Roles)

```
POST   /api/auth/register          - Register (tourist/guide/organiser)
POST   /api/auth/login             - Login
GET    /api/auth/me                - Get profile
PUT    /api/auth/profile           - Update profile
PUT    /api/auth/change-password   - Change password
POST   /api/auth/forgot-password   - Forgot password
PUT    /api/auth/reset-password/:token - Reset password
POST   /api/auth/logout            - Logout
DELETE /api/auth/account           - Delete account
```

### Filter Examples

**Get guides in Jaipur who speak English:**
```
GET /api/guide/all?district=jaipur&language=english
```

**Get tour operators with high rating:**
```
GET /api/organiser/all?companyType=tour_operator&minRating=4
```

**Admin: Get pending guide verifications:**
```
GET /api/admin/verifications/pending?type=guide
```

---

## 🔒 Verification Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Register  │────▶│   Complete  │────▶│   Submit    │────▶│   Admin     │
│   as Guide/ │     │   Profile   │     │   for       │     │   Reviews   │
│   Organiser │     │             │     │   Verify    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                                                    ▼
                                                        ┌─────────────────────┐
                                                        │  Approved/Rejected  │
                                                        └─────────────────────┘
```

### Verification Status Values
- `pending` - Initial state, profile incomplete
- `under_review` - Submitted, waiting for admin review
- `approved` - Verified ✅
- `rejected` - Rejected with reason

---

## 🧪 Testing Different Roles

### 1. Create Tourist
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"tourist@test.com","password":"pass123","phone":"9876543210","firstName":"Tourist","role":"tourist"}'
```

### 2. Create Guide
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"guide@test.com",
    "password":"pass123",
    "phone":"9876543211",
    "firstName":"Guide",
    "role":"guide",
    "guideProfile":{
      "licenseNumber":"RJ-123",
      "experienceYears":3,
      "languagesSpoken":[{"language":"english","proficiency":"fluent"}],
      "operatingDistricts":["jaipur"]
    }
  }'
```

### 3. Create Organiser
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"organiser@test.com",
    "password":"pass123",
    "phone":"9876543212",
    "firstName":"Organiser",
    "role":"organiser",
    "organiserProfile":{
      "companyName":"Test Tours",
      "companyType":"tour_operator",
      "registrationNumber":"REG-001"
    }
  }'
```

### 4. Submit Guide for Verification
```bash
curl -X POST http://localhost:5000/api/guide/me/submit-verification \
  -H "Authorization: Bearer <guide_token>"
```

### 5. Admin Verifies Guide
```bash
curl -X PUT http://localhost:5000/api/admin/verify/guide/<guide_id> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}'
```

---

## 🏆 Role Hierarchy

```
👑 Admin (full_access)
    │
    ├── 👑 Admin (limited permissions)
    │
    ├── 🏢 Verified Organiser
    │       └── 🏢 Unverified Organiser
    │
    ├── 🎯 Verified Guide
    │       └── 🎯 Unverified Guide
    │
    └── 🧳 Tourist
```

---

## 📱 Frontend Integration Tips

1. **Store role in state** after login
2. **Show different dashboards** based on role
3. **Hide/show features** based on verification status
4. **Redirect unauthorized users** to appropriate pages

```javascript
// Example React routing
{user.role === 'tourist' && <TouristDashboard />}
{user.role === 'guide' && <GuideDashboard />}
{user.role === 'organiser' && <OrganiserDashboard />}
{user.role === 'admin' && <AdminDashboard />}
```

---

Good luck! 🏰
