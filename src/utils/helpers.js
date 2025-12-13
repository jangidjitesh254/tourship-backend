const crypto = require('crypto');

/**
 * Generate a random token
 * @param {number} length - Length of token in bytes
 * @returns {string} - Hex token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a string using SHA256
 * @param {string} str - String to hash
 * @returns {string} - Hashed string
 */
const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Generate OTP
 * @param {number} length - Length of OTP
 * @returns {string} - OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

/**
 * Format phone number to standard format
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
const formatPhone = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 91 (India country code), remove it
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  
  return cleaned;
};

/**
 * Sanitize user object for response (remove sensitive fields)
 * @param {object} user - User object
 * @returns {object} - Sanitized user object
 */
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  
  delete userObj.password;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpire;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpire;
  delete userObj.__v;
  
  return userObj;
};

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth - Date of birth
 * @returns {number} - Age in years
 */
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Pagination helper
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} - Pagination object
 */
const getPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Create slug from string
 * @param {string} str - String to slugify
 * @returns {string} - Slugified string
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Validate Indian pincode
 * @param {string} pincode - Pincode to validate
 * @returns {boolean} - Is valid
 */
const isValidPincode = (pincode) => {
  return /^\d{6}$/.test(pincode);
};

/**
 * Validate Indian phone number
 * @param {string} phone - Phone to validate
 * @returns {boolean} - Is valid
 */
const isValidIndianPhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

module.exports = {
  generateToken,
  hashString,
  generateOTP,
  formatPhone,
  sanitizeUser,
  calculateAge,
  getPagination,
  slugify,
  isValidPincode,
  isValidIndianPhone
};
