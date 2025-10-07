#!/usr/bin/env node

// Test script for super admin functions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jaicfvakzxfeijtuogir.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSuperAdminFunctions() {
  console.log('🧪 Testing Super Admin Functions\n');

  try {
    // Test 1: Check if functions exist
    console.log('1️⃣ Testing function existence...');
    
    try {
      const { data: listResult, error: listError } = await supabase.rpc('list_super_admins');
      
      if (listError) {
        console.log(`❌ list_super_admins error: ${listError.message}`);
      } else {
        console.log(`✅ list_super_admins working: Found ${Array.isArray(listResult) ? listResult.length : 'N/A'} super admins`);
        if (Array.isArray(listResult) && listResult.length > 0) {
          console.log(`   Super admins: ${listResult.map(sa => sa.email).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ list_super_admins exception: ${err.message}`);
    }

    // Test 2: Test add function with invalid email
    console.log('\n2️⃣ Testing add_super_admin_by_email with invalid email...');
    
    try {
      const { data: addResult, error: addError } = await supabase
        .rpc('add_super_admin_by_email', { admin_email: 'nonexistent@test.com' });
      
      if (addError) {
        console.log(`❌ add_super_admin_by_email error: ${addError.message}`);
      } else {
        console.log(`✅ add_super_admin_by_email working: ${JSON.stringify(addResult)}`);
      }
    } catch (err) {
      console.log(`❌ add_super_admin_by_email exception: ${err.message}`);
    }

    // Test 3: Test with the email from the screenshot
    console.log('\n3️⃣ Testing add_super_admin_by_email with popsabey1@gmail.com...');
    
    try {
      const { data: addResult2, error: addError2 } = await supabase
        .rpc('add_super_admin_by_email', { admin_email: 'popsabey1@gmail.com' });
      
      if (addError2) {
        console.log(`❌ add_super_admin_by_email error: ${addError2.message}`);
      } else {
        console.log(`✅ add_super_admin_by_email result: ${JSON.stringify(addResult2)}`);
      }
    } catch (err) {
      console.log(`❌ add_super_admin_by_email exception: ${err.message}`);
    }

    // Test 4: Check user_roles table structure
    console.log('\n4️⃣ Checking user_roles table...');
    
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .limit(5);
      
      if (rolesError) {
        console.log(`❌ user_roles access error: ${rolesError.message}`);
      } else {
        console.log(`✅ user_roles accessible: ${roles?.length || 0} records found`);
        if (roles && roles.length > 0) {
          console.log(`   Sample role: ${JSON.stringify(roles[0])}`);
        }
      }
    } catch (err) {
      console.log(`❌ user_roles exception: ${err.message}`);
    }

    // Test 5: Check auth.users for the email in question
    console.log('\n5️⃣ Checking if popsabey1@gmail.com exists in auth.users...');
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'popsabey1@gmail.com');
      
      if (profilesError) {
        console.log(`❌ Profile check error: ${profilesError.message}`);
      } else {
        if (profiles && profiles.length > 0) {
          console.log(`✅ popsabey1@gmail.com found in profiles: ${JSON.stringify(profiles[0])}`);
        } else {
          console.log(`⚠️  popsabey1@gmail.com NOT found in profiles table`);
          console.log(`   This user may need to sign up first`);
        }
      }
    } catch (err) {
      console.log(`❌ Profile check exception: ${err.message}`);
    }

    // Test 6: List all profiles to see available users
    console.log('\n6️⃣ Listing available users in profiles...');
    
    try {
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .limit(10);
      
      if (allProfilesError) {
        console.log(`❌ All profiles error: ${allProfilesError.message}`);
      } else {
        console.log(`✅ Available users in profiles:`);
        allProfiles?.forEach(p => {
          console.log(`   - ${p.email} (${p.full_name || 'No name'})`);
        });
      }
    } catch (err) {
      console.log(`❌ All profiles exception: ${err.message}`);
    }

    console.log('\n📊 Test Summary:');
    console.log('1. Run fix-super-admin-complete.sql to create/fix the functions');
    console.log('2. Ensure popsabey1@gmail.com signs up first if not in profiles');
    console.log('3. Test the super admin management dialog in the frontend');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

testSuperAdminFunctions().catch(console.error);
