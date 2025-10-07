#!/usr/bin/env node

// Test script to verify members table and popsabey1@gmail.com
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

async function testMembersTable() {
  console.log('🔍 Testing Members Table and User Existence\n');

  try {
    // Test 1: Check if members table exists and is accessible
    console.log('1️⃣ Testing members table access...');
    
    try {
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .limit(5);
      
      if (membersError) {
        console.log(`❌ Members table error: ${membersError.message}`);
      } else {
        console.log(`✅ Members table accessible: ${members?.length || 0} records found`);
        if (members && members.length > 0) {
          console.log(`   Sample member: ${JSON.stringify(members[0], null, 2)}`);
        }
      }
    } catch (err) {
      console.log(`❌ Members table exception: ${err.message}`);
    }

    // Test 2: Check specifically for popsabey1@gmail.com
    console.log('\n2️⃣ Checking for popsabey1@gmail.com in members table...');
    
    try {
      const { data: popsabeyMember, error: popsabeyError } = await supabase
        .from('members')
        .select('*')
        .eq('email', 'popsabey1@gmail.com')
        .single();
      
      if (popsabeyError) {
        if (popsabeyError.code === 'PGRST116') {
          console.log(`⚠️  popsabey1@gmail.com NOT found in members table`);
        } else {
          console.log(`❌ Error checking popsabey1@gmail.com: ${popsabeyError.message}`);
        }
      } else {
        console.log(`✅ popsabey1@gmail.com FOUND in members table:`);
        console.log(`   ${JSON.stringify(popsabeyMember, null, 2)}`);
      }
    } catch (err) {
      console.log(`❌ popsabey1@gmail.com check exception: ${err.message}`);
    }

    // Test 3: List all members to see what's available
    console.log('\n3️⃣ Listing all members in the table...');
    
    try {
      const { data: allMembers, error: allMembersError } = await supabase
        .from('members')
        .select('email, fullname, category, isactive, userid')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allMembersError) {
        console.log(`❌ All members error: ${allMembersError.message}`);
      } else {
        console.log(`✅ Available members (${allMembers?.length || 0}):`);
        allMembers?.forEach((member, index) => {
          console.log(`   ${index + 1}. ${member.email} - ${member.fullname} (${member.category}) - Active: ${member.isactive} - UserID: ${member.userid || 'None'}`);
        });
      }
    } catch (err) {
      console.log(`❌ All members exception: ${err.message}`);
    }

    // Test 4: Check auth.users for popsabey1@gmail.com
    console.log('\n4️⃣ Checking auth.users for popsabey1@gmail.com...');
    
    try {
      // We can't directly query auth.users, but we can check if there's a user_id in members
      const { data: authCheck, error: authError } = await supabase
        .from('members')
        .select('userid, email, fullname')
        .eq('email', 'popsabey1@gmail.com')
        .single();
      
      if (authError) {
        console.log(`⚠️  Cannot verify auth.users connection for popsabey1@gmail.com`);
      } else {
        if (authCheck.userid) {
          console.log(`✅ popsabey1@gmail.com has auth user connection: ${authCheck.userid}`);
        } else {
          console.log(`⚠️  popsabey1@gmail.com exists in members but no auth user connection`);
        }
      }
    } catch (err) {
      console.log(`❌ Auth check exception: ${err.message}`);
    }

    // Test 5: Check user_roles table
    console.log('\n5️⃣ Checking user_roles table...');
    
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

    console.log('\n📊 Analysis Summary:');
    console.log('1. Check if popsabey1@gmail.com exists in members table');
    console.log('2. Verify if they have a userid (auth.users connection)');
    console.log('3. Update SQL functions to use members table instead of profiles');
    console.log('4. Test the corrected super admin functions');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

testMembersTable().catch(console.error);
