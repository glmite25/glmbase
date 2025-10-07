#!/usr/bin/env node

// Test script to verify admin setup and data consistency
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jaicfvakzxfeijtuogir.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required');
  console.log('Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Table '${tableName}' error:`, error.message);
      return false;
    }

    console.log(`✅ Table '${tableName}' exists and is accessible`);
    return true;
  } catch (err) {
    console.log(`❌ Table '${tableName}' not accessible:`, err.message);
    return false;
  }
}

async function checkAdminUsers() {
  console.log('\n🔍 Checking admin users...');

  const adminEmails = [
    'ojidelawrence@gmail.com',
    'admin@gospellabourministry.com',
    'superadmin@gospellabourministry.com'
  ];

  for (const email of adminEmails) {
    console.log(`\n📧 Checking: ${email}`);

    // Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.log(`   ❌ No profile found`);
      continue;
    }

    console.log(`   ✅ Profile exists (ID: ${profile.id})`);

    // Check user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id);

    if (rolesError) {
      console.log(`   ❌ Error checking roles:`, rolesError.message);
    } else if (roles && roles.length > 0) {
      console.log(`   ✅ Roles: ${roles.map(r => r.role).join(', ')}`);
    } else {
      console.log(`   ❌ No roles assigned`);
    }

    // Check member record
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', profile.id)
      .single();

    if (memberError || !member) {
      console.log(`   ❌ No member record found`);
    } else {
      console.log(`   ✅ Member record exists (Category: ${member.category})`);
    }
  }
}

async function testRLSPolicies() {
  console.log('\n🔒 Testing RLS policies...');

  const tables = ['profiles', 'user_roles', 'members'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ RLS policy issue for '${table}':`, error.message);
      } else {
        console.log(`✅ RLS policies working for '${table}'`);
      }
    } catch (err) {
      console.log(`❌ Error testing '${table}':`, err.message);
    }
  }
}

async function main() {
  console.log('🧪 Testing Admin Setup and Data Consistency\n');

  // Test table accessibility
  console.log('📋 Checking table accessibility...');
  const tables = ['profiles', 'user_roles', 'members'];

  for (const table of tables) {
    await testTableExists(table);
  }

  // Check admin users
  await checkAdminUsers();

  // Test RLS policies
  await testRLSPolicies();

  console.log('\n🎯 Test Summary:');
  console.log('If all checks passed, admin authentication should work properly.');
  console.log('If any checks failed, run the database fix script first.');

  console.log('\n📋 To fix any issues:');
  console.log('1. Run: node run-database-fix.js');
  console.log('2. Then test admin login in the application');
  console.log('3. Check browser console for any remaining errors');
}

main().catch(console.error);