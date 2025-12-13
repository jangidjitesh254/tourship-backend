/**
 * Fix Admin Permissions Script
 * 
 * Run this once to make your admin user a super admin with all permissions.
 * This fixes the 403 "You do not have permission" error.
 * 
 * Usage:
 *   1. Edit ADMIN_EMAIL below to your admin's email
 *   2. Run: node fix-admin-permissions.js
 *   3. Log out and log back in to your admin dashboard
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ========================================
// CHANGE THIS TO YOUR ADMIN EMAIL
// ========================================
const ADMIN_EMAIL = 'admin@tourship.com';  // <-- CHANGE THIS!

const fixAdminPermissions = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.connection.collection('users');

    // First, let's see all admin users
    console.log('📋 Looking for admin users...\n');
    const allAdmins = await User.find({ role: 'admin' }).toArray();
    
    if (allAdmins.length === 0) {
      console.log('❌ No admin users found in database!');
      console.log('   You need to create an admin user first.');
      console.log('   Run: node create-admin.js\n');
    } else {
      console.log('Found admin users:');
      allAdmins.forEach(admin => {
        console.log(`  📧 ${admin.email} (${admin.name})`);
        console.log(`     Super Admin: ${admin.adminProfile?.isSuperAdmin || false}`);
        console.log(`     Permissions: ${(admin.adminProfile?.permissions || []).length} permissions\n`);
      });
    }

    // Now update the specified admin
    console.log(`\n🔄 Updating admin: ${ADMIN_EMAIL}...`);
    
    const result = await User.updateOne(
      { email: ADMIN_EMAIL },
      {
        $set: {
          role: 'admin',
          'adminProfile.isSuperAdmin': true,
          'adminProfile.department': 'management',
          'adminProfile.permissions': [
            'manage_users',
            'manage_guides',
            'manage_organisers',
            'manage_attractions',
            'manage_trips',
            'manage_bookings',
            'view_analytics',
            'manage_settings',
            'verify_users',
            'manage_content',
            'manage_reports'
          ]
        }
      }
    );

    if (result.matchedCount === 0) {
      console.log(`\n❌ No user found with email: ${ADMIN_EMAIL}`);
      console.log('   Please edit this script and change ADMIN_EMAIL to one of the emails above.\n');
    } else if (result.modifiedCount > 0) {
      console.log(`\n✅ SUCCESS! Updated admin: ${ADMIN_EMAIL}`);
      console.log('   ✓ Made super admin: true');
      console.log('   ✓ Added all 11 permissions');
      console.log('\n📝 Next steps:');
      console.log('   1. Log out of your admin dashboard');
      console.log('   2. Log back in to get a fresh token');
      console.log('   3. The 403 error should be fixed!\n');
    } else {
      console.log(`\nℹ️ Admin ${ADMIN_EMAIL} already has super admin permissions.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

fixAdminPermissions();