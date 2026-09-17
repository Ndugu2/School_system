require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const fixAdminAccount = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_system_uganda');
    console.log('✅ Connected to MongoDB');

    // Find and delete the problematic user
    const deleted = await User.findOneAndDelete({ email: 'koseakalema2@gmail.com' });
    console.log(`Deleted user: ${deleted ? deleted.email : 'not found'}`);

    // Create fresh super-admin
    const newUser = await User.create({
      name: 'Kosea Kalem',
      email: 'koseakalema2@gmail.com',
      password: 'Ndiguwonder@2024',
      role: 'super-admin'
    });
    
    console.log(`✅ Created new admin user: ${newUser.email} (role: ${newUser.role})`);
    await mongoose.connection.close();
    console.log('✅ Script complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixAdminAccount();
