#!/usr/bin/env node

// Script to fix user synchronization by updating existing members with user_id
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

async function fixUserSync() {
  console.log('🔧 Fixing user synchronization issues...\n');

  try {
    // Step 1: Check current state
    console.log('📊 Checking current state...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*');

    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message);
    } else {
      console.log(`📋 Profiles found: ${profiles?.length || 0}`);
    }

    if (membersError) {
      console.log('❌ Error fetching members:', membersError.message);
    } else {
      console.log(`👥 Members found: ${members?.length || 0}`);
      const membersWithUserId = members?.filter(m => m.user_id) || [];
      const membersWithUserid = members?.filter(m => m.userid) || [];
      console.log(`🔗 Members with user_id: ${membersWithUserId.length}`);
      console.log(`🔗 Members with userid: ${membersWithUserid.length}`);
    }

    // Step 2: If no profiles exist, create them from auth.users data
    if (!profiles || profiles.length === 0) {
      console.log('\n🚀 No profiles found. Creating profiles from existing members...');
      
      // Create profiles for existing members
      for (const member of members || []) {
        if (member.email) {
          const profileData = {
            email: member.email,
            full_name: member.fullname,
            phone: member.phone,
            address: member.address
          };

          // We can't create profiles without auth.users ID, so we'll skip this
          console.log(`⚠️  Cannot create profile for ${member.email} without auth.users ID`);
        }
      }
    }

    // Step 3: Link members to profiles by email
    console.log('\n🔗 Linking members to profiles by email...');
    
    let linkedCount = 0;
    let createdCount = 0;

    for (const profile of profiles || []) {
      // Find matching member by email
      const matchingMember = members?.find(m => 
        m.email && m.email.toLowerCase() === profile.email?.toLowerCase()
      );

      if (matchingMember) {
        // Update member with user_id if not already set
        if (!matchingMember.user_id) {
          const { error: updateError } = await supabase
            .from('members')
            .update({ user_id: profile.id })
            .eq('id', matchingMember.id);

          if (updateError) {
            console.log(`❌ Failed to link ${profile.email}:`, updateError.message);
          } else {
            console.log(`✅ Linked ${profile.email} to member record`);
            linkedCount++;
          }
        } else {
          console.log(`✅ ${profile.email} already linked`);
        }
      } else {
        // Create new member record for this profile
        const newMember = {
          user_id: profile.id,
          email: profile.email,
          fullname: profile.full_name || profile.email,
          category: profile.email === 'ojidelawrence@gmail.com' ? 'Pastors' : 'Members',
          isactive: true,
          phone: profile.phone,
          address: profile.address
        };

        const { error: insertError } = await supabase
          .from('members')
          .insert([newMember]);

        if (insertError) {
          console.log(`❌ Failed to create member for ${profile.email}:`, insertError.message);
        } else {
          console.log(`✅ Created member record for ${profile.email}`);
          createdCount++;
        }
      }
    }

    // Step 4: Handle members that don't have profiles (orphaned members)
    console.log('\n🔍 Checking for orphaned members...');
    
    const orphanedMembers = members?.filter(m => {
      if (!m.email) return false;
      return !profiles?.some(p => p.email?.toLowerCase() === m.email?.toLowerCase());
    }) || [];

    console.log(`Found ${orphanedMembers.length} orphaned members (members without profiles)`);
    
    for (const orphan of orphanedMembers) {
      console.log(`⚠️  Orphaned member: ${orphan.fullname} (${orphan.email})`);
      console.log(`   This member exists but has no corresponding auth.users/profile record`);
    }

    // Step 5: Final verification
    console.log('\n📊 Final verification...');
    
    const { data: finalMembers } = await supabase
      .from('members')
      .select('*');
    
    const finalMembersWithUserId = finalMembers?.filter(m => m.user_id) || [];
    const finalProfiles = profiles || [];

    console.log(`📋 Final profiles: ${finalProfiles.length}`);
    console.log(`👥 Final members: ${finalMembers?.length || 0}`);
    console.log(`🔗 Members with user_id: ${finalMembersWithUserId.length}`);
    console.log(`📊 Linked ${linkedCount} existing members`);
    console.log(`📊 Created ${createdCount} new member records`);

    if (finalMembersWithUserId.length === finalMembers?.length) {
      console.log('\n🎉 Perfect! All members are now linked to auth users!');
    } else {
      console.log('\n⚠️  Some members still need linking');
      const unlinkedMembers = finalMembers?.filter(m => !m.user_id) || [];
      console.log(`Unlinked members: ${unlinkedMembers.length}`);
      unlinkedMembers.forEach(m => {
        console.log(`   - ${m.fullname} (${m.email})`);
      });
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Refresh your frontend members page');
    console.log('2. Check that "Auth Status" now shows "Linked" for users');
    console.log('3. If some members still show "No Auth", they may need to sign up first');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixUserSync().catch(console.error);
