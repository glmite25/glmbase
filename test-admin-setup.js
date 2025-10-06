#!/usr/bin/env node

/**
 * Test Admin Setup Script
 * This script tests if the admin setup is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminSetup() {
  console.log('🧪 Testing admin setup...\n');
  
  try {
    // Test 1: Check if admin user exists in auth
    console.log('1️⃣ Checking admin user in auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth check failed:', authError.message);
      return false;
    }

    const adminUser = authUsers.users.find(user => user.email === 'ojidelawrence@gmail.com');
    if (adminUser) {
      console.log('✅ Admin user found in auth');
    } else {
      console.log('❌ Admin user not found in auth');
      return false;
    }

    // Test 2: Check profile
    console.log('2️⃣ Checking admin profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();

    if (profileError) {
      console.log('❌ Profile check failed:', profileError.message);
      return false;
    }

    if (profile) {
      console.log('✅ Admin profile found');
    } else {
      console.log('❌ Admin profile not found');
      return false;
    }

    // Test 3: Check admin role
    console.log('3️⃣ Checking admin role...');
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id)
      .eq('role', 'superuser')
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.log('❌ Role check failed:', roleError.message);
      return false;
    }

    if (role) {
      console.log('✅ Admin role found');
    } else {
      console.log('❌ Admin role not found');
      return false;
    }

    // Test 4: Check database tables exist
    console.log('4️⃣ Checking required tables...');
    
    const tables = ['profiles', 'user_roles'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' not accessible:`, error.message);
        return false;
      } else {
        console.log(`✅ Table '${table}' accessible`);
      }
    }

    console.log('\n🎉 All tests passed! Admin setup is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   👤 Admin Email: ${adminUser.email}`);
    console.log(`   🆔 User ID: ${adminUser.id}`);
    console.log(`   📧 Email Confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   🛡️  Role: Super Admin`);
    console.log(`   📅 Created: ${new Date(adminUser.created_at).toLocaleDateString()}`);

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testAdminSetup().then((success) => {
  if (success) {
    console.log('\n✨ Admin setup test completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your application: npm run dev');
    console.log('   2. Navigate to /auth');
    console.log('   3. Login with ojidelawrence@gmail.com');
    console.log('   4. Look for admin buttons in the UI');
    console.log('   5. Access admin dashboard at /admin');
  } else {
    console.log('\n❌ Admin setup test failed!');
    console.log('\n🔧 Try running: node setup-admin-user.js');
  }
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});