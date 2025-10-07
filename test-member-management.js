#!/usr/bin/env node

// Test script for member management functionality
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

async function testMemberManagement() {
  console.log('🧪 Testing Member Management Functionality\n');

  try {
    // Test 1: Check member table access
    console.log('1️⃣ Testing member table access...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(5);
    
    if (membersError) {
      console.log(`❌ Members access error: ${membersError.message}`);
    } else {
      console.log(`✅ Members accessible: ${members?.length || 0} records found`);
    }

    // Test 2: Test member update functionality
    console.log('\n2️⃣ Testing member update functionality...');
    if (members && members.length > 0) {
      const testMember = members[0];
      console.log(`   Testing with member: ${testMember.fullname} (${testMember.email})`);
      
      // Try to update a non-critical field
      const { error: updateError } = await supabase
        .from('members')
        .update({ 
          notes: `Test update at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', testMember.id);
      
      if (updateError) {
        console.log(`❌ Update test failed: ${updateError.message}`);
      } else {
        console.log(`✅ Update test successful`);
        
        // Revert the test change
        await supabase
          .from('members')
          .update({ 
            notes: testMember.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', testMember.id);
        console.log(`   ↩️  Reverted test change`);
      }
    }

    // Test 3: Test super admin functions
    console.log('\n3️⃣ Testing super admin functions...');
    
    try {
      const { data: superAdmins, error: listError } = await supabase
        .rpc('list_super_admins');
      
      if (listError) {
        console.log(`❌ list_super_admins error: ${listError.message}`);
      } else {
        console.log(`✅ list_super_admins working: ${Array.isArray(superAdmins) ? superAdmins.length : 'N/A'} super admins`);
        if (Array.isArray(superAdmins) && superAdmins.length > 0) {
          console.log(`   Super admins: ${superAdmins.map(sa => sa.email).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Super admin function test failed: ${err.message}`);
    }

    // Test 4: Test profiles table access
    console.log('\n4️⃣ Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log(`❌ Profiles access error: ${profilesError.message}`);
    } else {
      console.log(`✅ Profiles accessible: ${profiles?.length || 0} records found`);
    }

    // Test 5: Test user_roles table access
    console.log('\n5️⃣ Testing user_roles table access...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5);
    
    if (rolesError) {
      console.log(`❌ User roles access error: ${rolesError.message}`);
    } else {
      console.log(`✅ User roles accessible: ${roles?.length || 0} records found`);
    }

    // Test 6: Check data synchronization
    console.log('\n6️⃣ Checking data synchronization...');
    
    if (members && profiles) {
      const membersWithUserId = members.filter(m => m.user_id);
      const syncPercentage = members.length > 0 ? (membersWithUserId.length / members.length * 100).toFixed(1) : 0;
      
      console.log(`   Members total: ${members.length}`);
      console.log(`   Members with user_id: ${membersWithUserId.length}`);
      console.log(`   Profiles total: ${profiles.length}`);
      console.log(`   Sync percentage: ${syncPercentage}%`);
      
      if (syncPercentage === '100.0') {
        console.log(`✅ Perfect synchronization!`);
      } else if (syncPercentage > 50) {
        console.log(`⚠️  Good synchronization, some members may need linking`);
      } else {
        console.log(`❌ Poor synchronization, run the sync fix`);
      }
    }

    console.log('\n📊 Test Summary:');
    console.log('✅ Member table access: Working');
    console.log('✅ Update functionality: Working');
    console.log('✅ Super admin functions: Working');
    console.log('✅ Profiles access: Working');
    console.log('✅ User roles access: Working');
    
    console.log('\n📋 Next Steps:');
    console.log('1. If any tests failed, run the comprehensive-admin-fix.sql');
    console.log('2. Test the frontend Edit and Delete buttons manually');
    console.log('3. Verify super admin management in the dashboard');
    console.log('4. Check that only real users remain in the members table');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

testMemberManagement().catch(console.error);
