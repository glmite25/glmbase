#!/usr/bin/env node

/**
 * Simple Admin Setup Runner
 * This script runs the complete admin setup
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Gospel Labour Ministry Admin Setup...\n');

// Check if required files exist
const requiredFiles = [
  'complete-admin-setup.js',
  'user-member-sync.sql',
  'database-schema-complete.sql'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Required file missing: ${file}`);
    process.exit(1);
  }
}

console.log('✅ All required files found\n');

try {
  console.log('📋 Step 1: Running complete admin setup...');
  execSync('node complete-admin-setup.js', { stdio: 'inherit' });
  
  console.log('\n🎉 Admin setup completed successfully!');
  console.log('\n📋 What was set up:');
  console.log('   ✅ Database schema updated');
  console.log('   ✅ Admin user created (ojidelawrence@gmail.com)');
  console.log('   ✅ User-member synchronization enabled');
  console.log('   ✅ Mock data cleaned up');
  console.log('   ✅ Admin roles configured');
  
  console.log('\n🔑 Admin Login:');
  console.log('   Email: ojidelawrence@gmail.com');
  console.log('   Password: AdminPassword123!');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. npm run dev');
  console.log('   2. Go to /auth and login');
  console.log('   3. Access admin dashboard at /admin');
  console.log('   4. All new registrations will sync to members table');
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Check your .env file has VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.log('   2. Ensure Supabase project is accessible');
  console.log('   3. Check database permissions');
  process.exit(1);
}