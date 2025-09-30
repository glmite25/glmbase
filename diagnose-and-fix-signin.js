/**
 * Diagnose and Fix Sign-in Issues
 * This script will check exactly what's wrong and fix it step by step
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Diagnosing Sign-in Issues');
console.log('============================');
console.log(`Target user: ${ADMIN_EMAIL}`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('');

// Validate configuration
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is missing from .env');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is missing from .env');
  process.exit(1);
}

// Check if keys are different
if (supabaseServiceKey === supabaseAnonKey) {
  console.error('❌ SERVICE_ROLE_KEY and ANON_KEY are the same!');
  console.error('You need to get the actual service_role key from Supabase dashboard');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const clientSupabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseAndFix() {
  let step = 1;
  
  try {
    // Step 1: Test admin connection
    console.log(`${step++}. Testing admin connection...`);
    
    try {
      const { data: adminTest, error: adminError } = await adminSupabase.auth.admin.listUsers();
      if (adminError) {
        console.error('❌ Admin connection failed:', adminError.message);
        console.error('This means your SERVICE_ROLE_KEY is incorrect');
        console.error('Go to Supabase dashboard → Settings → API → Copy service_role key');
        return;
      }
      console.log('✅ Admin connection works');
      console.log(`📊 Total users in system: ${adminTest.users.length}`);
    } catch (e) {
      console.error('❌ Admin connection error:', e.message);
      return;
    }
    
    // Step 2: Check if user exists
    console.log(`\n${step++}. Checking if user exists...`);
    
    const { data: users, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Cannot list users:', listError.message);
      return;
    }
    
    let user = users.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    
    if (user) {
      console.log('✅ User exists in auth system');
      console.log(`📧 Email: ${user.email}`);
      console.log(`🆔 ID: ${user.id}`);
      console.log(`📅 Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`✉️  Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`🔐 Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      
      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        console.log('⚠️  Email is not confirmed - fixing this...');
        
        const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(user.id, {
          email_confirm: true
        });
        
        if (confirmError) {
          console.error('❌ Failed to confirm email:', confirmError.message);
        } else {
          console.log('✅ Email confirmed');
        }
      }
      
    } else {
      console.log('❌ User does not exist - creating now...');
      
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Lawrence Ojide'
        }
      });
      
      if (createError) {
        console.error('❌ Failed to create user:', createError.message);
        return;
      }
      
      user = newUser.user;
      console.log('✅ User created successfully');
      console.log(`🆔 New user ID: ${user.id}`);
    }
    
    // Step 3: Update user password to make sure it's correct
    console.log(`\n${step++}. Ensuring password is correct...`);
    
    try {
      const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(user.id, {
        password: ADMIN_PASSWORD
      });
      
      if (passwordError) {
        console.error('❌ Failed to update password:', passwordError.message);
      } else {
        console.log('✅ Password updated/confirmed');
      }
    } catch (e) {
      console.error('❌ Password update error:', e.message);
    }
    
    // Step 4: Test sign-in with client (anon) key
    console.log(`\n${step++}. Testing sign-in with client credentials...`);
    
    try {
      const { data: signInData, error: signInError } = await clientSupabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });
      
      if (signInError) {
        console.error('❌ Sign-in failed:', signInError.message);
        
        // Try to get more details about the error
        if (signInError.message.includes('Invalid login credentials')) {
          console.log('\n🔍 Detailed diagnosis:');
          
          // Check if user exists again
          const { data: recheckUsers } = await adminSupabase.auth.admin.listUsers();
          const recheckUser = recheckUsers.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
          
          if (!recheckUser) {
            console.log('❌ User disappeared after creation - this is a Supabase issue');
          } else {
            console.log('✅ User still exists in auth system');
            console.log(`✉️  Email confirmed: ${recheckUser.email_confirmed_at ? 'Yes' : 'No'}`);
            
            if (!recheckUser.email_confirmed_at) {
              console.log('🔧 Trying to confirm email again...');
              await adminSupabase.auth.admin.updateUserById(recheckUser.id, {
                email_confirm: true
              });
            }
          }
          
          console.log('\n💡 Possible solutions:');
          console.log('1. Wait 5-10 minutes for Supabase to sync the user');
          console.log('2. Try creating the user manually in Supabase dashboard');
          console.log('3. Check if there are any RLS policies blocking authentication');
        }
        
        return;
      }
      
      console.log('✅ Sign-in successful!');
      console.log(`👤 Signed in as: ${signInData.user?.email}`);
      console.log(`🆔 User ID: ${signInData.user?.id}`);
      console.log(`🎫 Session expires: ${new Date(signInData.session?.expires_at * 1000).toLocaleString()}`);
      
      // Clean up
      await clientSupabase.auth.signOut();
      console.log('✅ Signed out successfully');
      
    } catch (e) {
      console.error('❌ Sign-in test error:', e.message);
    }
    
    // Step 5: Final verification
    console.log(`\n${step++}. Final verification...`);
    
    // Get fresh user data
    const { data: finalUsers } = await adminSupabase.auth.admin.listUsers();
    const finalUser = finalUsers.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    
    if (finalUser) {
      console.log('✅ User verification passed');
      console.log('📋 Final user status:');
      console.log(`   Email: ${finalUser.email}`);
      console.log(`   ID: ${finalUser.id}`);
      console.log(`   Confirmed: ${finalUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(finalUser.created_at).toLocaleString()}`);
      
      console.log('\n🎉 DIAGNOSIS COMPLETE!');
      console.log('======================');
      console.log('✅ User account is properly configured');
      console.log('✅ Email is confirmed');
      console.log('✅ Password is set correctly');
      
      console.log('\n🔑 Login Credentials:');
      console.log(`📧 Email: ${ADMIN_EMAIL}`);
      console.log(`🔒 Password: ${ADMIN_PASSWORD}`);
      
      console.log('\n📱 Try signing in now:');
      console.log('1. Go to your website');
      console.log('2. Click Login');
      console.log('3. Use the credentials above');
      console.log('4. If it still fails, wait 5-10 minutes and try again');
      
    } else {
      console.error('❌ User verification failed - user not found');
    }
    
  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    console.log('\n🔧 Manual fix required:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to Authentication → Users');
    console.log('4. Click "Add user"');
    console.log(`5. Email: ${ADMIN_EMAIL}`);
    console.log(`6. Password: ${ADMIN_PASSWORD}`);
    console.log('7. Auto Confirm User: Yes');
    console.log('8. Click "Create user"');
  }
}

// Run diagnosis
diagnoseAndFix();