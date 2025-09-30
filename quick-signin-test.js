/**
 * Quick Sign-in Test
 * Test if the ojidelawrence@gmail.com account can sign in
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔐 Quick Sign-in Test');
console.log('====================');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

// Use anon key for sign-in test (like the frontend does)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignIn() {
  try {
    console.log('🧪 Testing sign-in with anon key (like frontend)...');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD.substring(0, 3)}***`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (error) {
      console.log('❌ Sign-in failed:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n🔧 Possible fixes:');
        console.log('1. Run: node fix-auth-and-database.js');
        console.log('2. The user account may not exist yet');
        console.log('3. Check if the password is correct');
      }
      
      return false;
    }
    
    console.log('✅ Sign-in successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
    
    // Test accessing a protected resource
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.log('⚠️  Profile access failed:', profileError.message);
      } else {
        console.log('✅ Profile access successful');
        console.log('Role:', profileData.role || 'No role set');
      }
    } catch (e) {
      console.log('⚠️  Profile table not available');
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Sign-in test failed:', error.message);
    return false;
  }
}

async function runTest() {
  const success = await testSignIn();
  
  console.log('\n📋 Test Results:');
  console.log('================');
  
  if (success) {
    console.log('✅ Sign-in works correctly');
    console.log('✅ You should be able to sign in on the website');
    console.log('\n🌐 Next steps:');
    console.log('1. Go to your website');
    console.log('2. Click "Login"');
    console.log('3. Use the credentials above');
    console.log('4. You should get access to admin features');
  } else {
    console.log('❌ Sign-in not working');
    console.log('\n🔧 Run these fixes:');
    console.log('1. node fix-auth-and-database.js');
    console.log('2. node run-database-setup.js (if needed)');
    console.log('3. Try this test again');
  }
}

runTest();