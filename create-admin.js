
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Parse command line arguments
const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value;
    }
  });
  return args;
};

// Main function
async function createAdmin() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        🏰 TOURSHIP ADMIN CREATION SCRIPT         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\n');

  // Get command line args
  const args = parseArgs();

  // Get admin details
  let email, password, firstName, lastName, phone;

  if (args.email && args.password) {
    // Use command line arguments
    email = args.email;
    password = args.password;
    firstName = args.firstName || 'Super';
    lastName = args.lastName || 'Admin';
    phone = args.phone || '9999999999';
  } else {
    // Interactive mode
    console.log('📝 Please enter admin details:\n');
    
    email = await prompt('   Email: ');
    password = await prompt('   Password: ');
    firstName = await prompt('   First Name (default: Super): ') || 'Super';
    lastName = await prompt('   Last Name (default: Admin): ') || 'Admin';
    phone = await prompt('   Phone (default: 9999999999): ') || '9999999999';
  }

  // Validate inputs
  if (!email || !password) {
    console.log('\n❌ Error: Email and password are required!\n');
    rl.close();
    process.exit(1);
  }

  if (password.length < 6) {
    console.log('\n❌ Error: Password must be at least 6 characters!\n');
    rl.close();
    process.exit(1);
  }

  // Email validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    console.log('\n❌ Error: Invalid email format!\n');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳ Connecting to database...\n');

  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tourship';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await mongoose.connection.collection('users').findOne({ email });
    
    if (existingAdmin) {
      console.log('⚠️  An admin with this email already exists!\n');
      
      const overwrite = await prompt('   Do you want to update the password? (yes/no): ');
      
      if (overwrite.toLowerCase() === 'yes' || overwrite.toLowerCase() === 'y') {
        // Update existing admin
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await mongoose.connection.collection('users').updateOne(
          { email },
          { 
            $set: { 
              password: hashedPassword,
              updatedAt: new Date()
            } 
          }
        );
        
        console.log('\n✅ Admin password updated successfully!\n');
      } else {
        console.log('\n❌ Operation cancelled.\n');
      }
    } else {
      // Create new admin
      console.log('⏳ Creating admin user...\n');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const adminUser = {
        email: email.toLowerCase(),
        password: hashedPassword,
        phone,
        firstName,
        lastName,
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isBanned: false,
        adminProfile: {
          department: 'super_admin',
          permissions: ['full_access'],
          assignedDistricts: ['all']
        },
        preferences: {
          notifications: {
            email: true,
            sms: true,
            push: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mongoose.connection.collection('users').insertOne(adminUser);

      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║           ✅ ADMIN CREATED SUCCESSFULLY!         ║');
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('\n');
      console.log('   📧 Email:    ', email);
      console.log('   🔑 Password: ', password);
      console.log('   👤 Name:     ', `${firstName} ${lastName}`);
      console.log('   📞 Phone:    ', phone);
      console.log('   🛡️  Role:     ', 'Admin (Full Access)');
      console.log('\n');
      console.log('   🌐 Login at: http://localhost:3000');
      console.log('\n');
    }

  } catch (error) {
    console.log('\n❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure MongoDB is running!');
      console.log('   Start MongoDB with: mongod\n');
    }
  } finally {
    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  }
}

// Run the script
createAdmin();