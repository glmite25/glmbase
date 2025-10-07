#!/usr/bin/env node

// Simple test to check sync status without making changes
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

async function testSyncStatus() {
  console.log('🔍 Testing User Synchronization Status\n');

  try {
    // Test 1: Check profiles table
    console.log('1️⃣ Checking profiles table...');
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.log(`❌ Profiles error: ${profilesError.message}`);
      } else {
        console.log(`✅ Profiles accessible: ${profiles?.length || 0} records`);
        if (profiles && profiles.length > 0) {
          console.log(`   Sample profile: ${profiles[0].email}`);
        }
      }
    } catch (err) {
      console.log(`❌ Profiles exception: ${err.message}`);
    }

    // Test 2: Check members table
    console.log('\n2️⃣ Checking members table...');
    try {
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*');
      
      if (membersError) {
        console.log(`❌ Members error: ${membersError.message}`);
      } else {
        console.log(`✅ Members accessible: ${members?.length || 0} records`);
        
        if (members && members.length > 0) {
          const membersWithUserId = members.filter(m => m.user_id);
          const membersWithUserid = members.filter(m => m.userid);
          
          console.log(`   Members with user_id: ${membersWithUserId.length}`);
          console.log(`   Members with userid: ${membersWithUserid.length}`);
          console.log(`   Members without links: ${members.length - membersWithUserId.length - membersWithUserid.length}`);
          
          console.log('\n   Sample members:');
          members.slice(0, 3).forEach(m => {
            console.log(`   - ${m.fullname} (${m.email}) - user_id: ${m.user_id ? 'Yes' : 'No'}`);
          });
        }
      }
    } catch (err) {
      console.log(`❌ Members exception: ${err.message}`);
    }

    // Test 3: Check user_roles table
    console.log('\n3️⃣ Checking user_roles table...');
    try {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) {
        console.log(`❌ User roles error: ${rolesError.message}`);
      } else {
        console.log(`✅ User roles accessible: ${roles?.length || 0} records`);
      }
    } catch (err) {
      console.log(`❌ User roles exception: ${err.message}`);
    }

    // Test 4: Check table structure
    console.log('\n4️⃣ Checking table structure...');
    try {
      // Check if members table has user_id column
      const { data: membersSample } = await supabase
        .from('members')
        .select('*')
        .limit(1);
      
      if (membersSample && membersSample.length > 0) {
        const hasUserId = 'user_id' in membersSample[0];
        const hasUserid = 'userid' in membersSample[0];
        
        console.log(`   Members table has 'user_id' column: ${hasUserId ? 'Yes' : 'No'}`);
        console.log(`   Members table has 'userid' column: ${hasUserid ? 'Yes' : 'No'}`);
        
        if (!hasUserId && !hasUserid) {
          console.log('   ⚠️  No user linking columns found!');
        }
      }
    } catch (err) {
      console.log(`❌ Structure check failed: ${err.message}`);
    }

    console.log('\n📊 Diagnosis:');
    
    // Get final counts for diagnosis
    const { data: finalProfiles } = await supabase.from('profiles').select('*').catch(() => ({ data: null }));
    const { data: finalMembers } = await supabase.from('members').select('*').catch(() => ({ data: null }));
    
    const profileCount = finalProfiles?.length || 0;
    const memberCount = finalMembers?.length || 0;
    const linkedMemberCount = finalMembers?.filter(m => m.user_id || m.userid).length || 0;

    if (profileCount === 0) {
      console.log('❌ CRITICAL: No profiles found - auth.users not syncing to profiles table');
      console.log('   This is the root cause of the "No Auth" status');
    }

    if (memberCount > 0 && linkedMemberCount === 0) {
      console.log('❌ CRITICAL: Members exist but none are linked to auth users');
      console.log('   All members will show "No Auth" status');
    }

    if (profileCount > 0 && linkedMemberCount === memberCount) {
      console.log('✅ GOOD: All members are properly linked');
    }

    console.log('\n🔧 Recommended Action:');
    if (profileCount === 0) {
      console.log('1. Run the database sync fix to create missing profiles');
      console.log('2. Use either:');
      console.log('   - Copy manual-sync-fix.sql into Supabase SQL Editor and run it');
      console.log('   - Or set SUPABASE_ACCESS_TOKEN and run: node direct-sync-fix.js');
    } else if (linkedMemberCount < memberCount) {
      console.log('1. Run the linking fix to connect existing members to users');
      console.log('2. This will populate the user_id fields in the members table');
    } else {
      console.log('✅ Sync appears to be working correctly!');
      console.log('   If frontend still shows "No Auth", check the frontend code');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSyncStatus().catch(console.error);
