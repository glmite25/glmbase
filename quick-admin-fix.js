#!/usr/bin/env node

/**
 * Quick Admin Fix Script
 * This script provides immediate admin access without complex setup
 */

console.log('🔧 Quick Admin Fix for Gospel Labour Ministry\n');

console.log('📋 Steps to fix admin access:');
console.log('');

console.log('1️⃣ Database Setup:');
console.log('   • Go to your Supabase project dashboard');
console.log('   • Open SQL Editor');
console.log('   • Run the file: simple-database-setup.sql');
console.log('   • This will create/update the necessary tables');
console.log('');

console.log('2️⃣ Clear Browser Data:');
console.log('   • Open browser developer tools (F12)');
console.log('   • Go to Application/Storage tab');
console.log('   • Clear localStorage and sessionStorage');
console.log('   • Or use: localStorage.clear(); sessionStorage.clear();');
console.log('');

console.log('3️⃣ Force Admin Access:');
console.log('   • Open browser console (F12)');
console.log('   • Run these commands:');
console.log('     localStorage.setItem("glm-is-admin", "true");');
console.log('     localStorage.setItem("glm-is-superuser", "true");');
console.log('   • Refresh the page');
console.log('');

console.log('4️⃣ Login Process:');
console.log('   • Go to: http://localhost:5173/auth');
console.log('   • Login with: ojidelawrence@gmail.com');
console.log('   • Password: AdminPassword123!');
console.log('   • After login, admin buttons should appear');
console.log('');

console.log('5️⃣ Access Admin Dashboard:');
console.log('   • Click admin button in header');
console.log('   • Or go directly to: http://localhost:5173/admin');
console.log('   • If still loading, click "Continue" button');
console.log('');

console.log('🔍 Troubleshooting:');
console.log('   • If admin page is blank: Click "Continue" button');
console.log('   • If no admin buttons: Clear localStorage and login again');
console.log('   • If database errors: Run simple-database-setup.sql again');
console.log('   • Check browser console for any error messages');
console.log('');

console.log('✅ Expected Result:');
console.log('   • Admin button visible in header');
console.log('   • Floating admin button (bottom right)');
console.log('   • Working admin dashboard with sidebar');
console.log('   • Members management page accessible');
console.log('');

console.log('🎯 Quick Test:');
console.log('   1. Start app: npm run dev');
console.log('   2. Open: http://localhost:5173');
console.log('   3. Login with admin credentials');
console.log('   4. Look for admin buttons');
console.log('   5. Access /admin page');
console.log('');

console.log('💡 If problems persist:');
console.log('   • Check Supabase project is running');
console.log('   • Verify environment variables in .env');
console.log('   • Ensure database tables exist');
console.log('   • Try incognito/private browser window');

console.log('\n🚀 Your admin system should work after these steps!');

process.exit(0);