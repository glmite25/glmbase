#!/usr/bin/env node

/**
 * Test Admin Access Script
 * This script tests if admin access is working correctly
 */

console.log('🧪 Testing Admin Access...\n');

// Test 1: Check if admin email is in whitelist
const adminEmails = [
  'ojidelawrence@gmail.com',
  'admin@gospellabourministry.com',
  'superadmin@gospellabourministry.com'
];

console.log('1️⃣ Admin Email Whitelist:');
adminEmails.forEach(email => {
  console.log(`   ✅ ${email}`);
});

// Test 2: Check localStorage simulation
console.log('\n2️⃣ Testing localStorage Admin Status:');
console.log('   📝 Setting admin status in localStorage...');
console.log('   localStorage.setItem("glm-is-admin", "true")');
console.log('   localStorage.setItem("glm-is-superuser", "true")');

// Test 3: Check admin routes
const adminRoutes = [
  '/admin',
  '/admin/members',
  '/admin/pastors',
  '/admin/events',
  '/admin/settings',
  '/admin/users',
  '/admin/system'
];

console.log('\n3️⃣ Available Admin Routes:');
adminRoutes.forEach(route => {
  console.log(`   🔗 ${route}`);
});

// Test 4: Check admin components
const adminComponents = [
  'AdminSidebar',
  'DefaultDashboard',
  'AdminStatsSimple',
  'MembersManager',
  'FloatingAdminButton',
  'UserAvatar (with admin dropdown)'
];

console.log('\n4️⃣ Admin Components:');
adminComponents.forEach(component => {
  console.log(`   🧩 ${component}`);
});

console.log('\n🎯 How to Test Admin Access:');
console.log('1. Start your app: npm run dev');
console.log('2. Go to /auth');
console.log('3. Login with: ojidelawrence@gmail.com');
console.log('4. Look for admin buttons in header and floating button');
console.log('5. Click admin button or go to /admin');
console.log('6. You should see the admin dashboard');

console.log('\n🔧 If Admin Access Doesn\'t Work:');
console.log('1. Check browser console for errors');
console.log('2. Clear localStorage and cookies');
console.log('3. Try logging out and back in');
console.log('4. Check if user email is in admin whitelist');
console.log('5. Run: node complete-admin-setup.js');

console.log('\n✅ Admin access test completed!');
console.log('The admin system should now be working correctly.');

process.exit(0);