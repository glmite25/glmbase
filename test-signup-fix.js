#!/usr/bin/env node

/**
 * Test Signup Fix
 * Tests the signup functionality with the corrected database schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user data
const testUser = {
  email: 'test.user@example.com',
  password: 'TestPassword123!',
  fullName: 'Test User',
  churchUnit: '3HSecurity',
  phone: '07031098097',
  address: 'Test Address'
};

async function testSignup() {
  console.log('🧪 Testing Signup Functionality');
  console.log('===============================');
  console.log(`Email: ${testUser.email}`);
  console.log(`Name: ${testUser.fullName}`);
  console.log(`Church Unit: ${testUser.churchUnit}`);
  console.log();

  try {
    // Step 1: Try to sign up
    console.log('📝 Step 1: Attempting signup...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.fullName,
          church_unit: testUser.churchUnit,
          phone: testUser.phone,
          address: testUser.address,
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
      
      // If user already exists, try to sign in instead
      if (signupError.message.includes('already registered') || signupError.message.includes('duplicate')) {
        console.log('🔄 User already exists, trying to sign in...');
        
        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });

        if (signinError) {
          console.log('❌ Sign in also failed:', signinError.message);
          return false;
        }

        console.log('✅ Sign in successful!');
        console.log(`   User ID: ${signinData.user?.id}`);
        
        // Test profile creation with existing user
        if (signinData.user?.id) {
          await testProfileCreation(signinData.user.id);
        }
        
        return true;
      }
      
      return false;
    }

    console.log('✅ Signup successful!');
    console.log(`   User ID: ${signupData.user?.id}`);
    console.log(`   Email confirmed: ${signupData.user?.email_confirmed_at ? 'Yes' : 'No'}`);

    // Step 2: Test profile creation
    if (signupData.user?.id) {
      await testProfileCreation(signupData.user.id);
    }

    return true;
  } catch (error) {
    console.log('❌ Signup test failed:', error.message);
    return false;
  }
}

async function testProfileCreation(userId) {
  console.log('\n📋 Step 2: Testing profile creation...');
  
  try {
    // Test creating profile record
    const profileData = {
      id: userId,
      email: testUser.email,
      full_name: testUser.fullName,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData);

    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      return false;
    }

    console.log('✅ Profile created successfully');

    // Test creating member record with correct schema
    const memberData = {
      id: userId,
      email: testUser.email,
      fullname: testUser.fullName,
      phone: testUser.phone,
      category: 'Members',
      churchunit: testUser.churchUnit,
      assignedto: null,
      isactive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: memberError } = await supabase
      .from('members')
      .upsert(memberData, { onConflict: 'id' });

    if (memberError) {
      console.log('❌ Member record creation failed:', memberError.message);
      return false;
    }

    console.log('✅ Member record created successfully');
    return true;
  } catch (error) {
    console.log('❌ Profile creation test failed:', error.message);
    return false;
  }
}

async function testDataAccess(userId) {
  console.log('\n🔍 Step 3: Testing data access...');
  
  try {
    // Test profile access
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log('❌ Profile access failed:', profileError.message);
    } else {
      console.log('✅ Profile access successful');
      console.log(`   Name: ${profileData.full_name}`);
      console.log(`   Email: ${profileData.email}`);
    }

    // Test member access
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single();

    if (memberError) {
      console.log('❌ Member access failed:', memberError.message);
    } else {
      console.log('✅ Member access successful');
      console.log(`   Name: ${memberData.fullname}`);
      console.log(`   Category: ${memberData.category}`);
      console.log(`   Church Unit: ${memberData.churchunit}`);
      console.log(`   Active: ${memberData.isactive}`);
    }

    return true;
  } catch (error) {
    console.log('❌ Data access test failed:', error.message);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleanup: Removing test user...');
  
  try {
    // Sign out first
    await supabase.auth.signOut();
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

// Run the test
async function runTest() {
  const success = await testSignup();
  
  if (success) {
    console.log('\n🎉 SIGNUP TEST PASSED!');
    console.log('The signup functionality is working correctly.');
  } else {
    console.log('\n❌ SIGNUP TEST FAILED!');
    console.log('There are still issues with the signup process.');
    
    console.log('\n💡 TROUBLESHOOTING STEPS:');
    console.log('1. Check RLS policies on profiles and members tables');
    console.log('2. Verify database schema matches the code');
    console.log('3. Check for any database triggers that might be failing');
    console.log('4. Ensure proper permissions for anonymous users to insert data');
  }
  
  await cleanup();
  process.exit(success ? 0 : 1);
}

runTest().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});