import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function directDataConsolidation() {
  try {
    console.log('Starting direct data consolidation...\n');
    
    // Step 1: Get all members data
    console.log('Step 1: Fetching members data...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*');
    
    if (membersError) {
      console.error('Error fetching members:', membersError);
      return;
    }
    
    console.log(`✓ Found ${members.length} members`);
    
    // Step 2: Get all profiles data
    console.log('Step 2: Fetching profiles data...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`✓ Found ${profiles.length} profiles`);
    
    // Step 3: Create consolidated records
    console.log('Step 3: Creating consolidated records...');
    const consolidatedRecords = [];
    const conflicts = [];
    
    // Process members with matching profiles
    for (const member of members) {
      const matchingProfile = profiles.find(p => p.id === member.user_id);
      
      const consolidatedRecord = {
        id: member.id,
        user_id: member.user_id,
        email: member.email || (matchingProfile ? matchingProfile.email : `member-${member.id}@noemail.local`),
        fullname: member.fullname || (matchingProfile ? matchingProfile.full_name : 'Unknown Name'),
        phone: member.phone || (matchingProfile ? matchingProfile.phone : null),
        address: member.address || (matchingProfile ? matchingProfile.address : null),
        genotype: matchingProfile ? matchingProfile.genotype : null,
        date_of_birth: member.date_of_birth || (matchingProfile ? matchingProfile.date_of_birth : null),
        gender: member.gender || (matchingProfile ? matchingProfile.gender : null),
        marital_status: matchingProfile ? matchingProfile.marital_status : null,
        occupation: matchingProfile ? matchingProfile.occupation : null,
        emergency_contact_name: matchingProfile ? matchingProfile.emergency_contact_name : null,
        emergency_contact_phone: matchingProfile ? matchingProfile.emergency_contact_phone : null,
        emergency_contact_relationship: matchingProfile ? matchingProfile.emergency_contact_relationship : null,
        city: matchingProfile ? matchingProfile.city : null,
        state: matchingProfile ? matchingProfile.state : null,
        postal_code: matchingProfile ? matchingProfile.postal_code : null,
        country: matchingProfile ? matchingProfile.country : 'Nigeria',
        category: member.category || 'Members',
        title: member.title,
        assignedto: member.assignedto,
        churchunit: member.churchunit || (matchingProfile ? matchingProfile.church_unit : null),
        churchunits: member.churchunits,
        auxanogroup: member.auxanogroup,
        joindate: member.joindate,
        notes: member.notes,
        isactive: member.isactive !== false,
        baptism_date: matchingProfile ? matchingProfile.baptism_date : null,
        baptism_location: matchingProfile ? matchingProfile.baptism_location : null,
        is_baptized: matchingProfile ? matchingProfile.is_baptized : false,
        membership_status: matchingProfile ? matchingProfile.membership_status : 'active',
        preferred_contact_method: matchingProfile ? matchingProfile.preferred_contact_method : 'email',
        skills_talents: matchingProfile ? matchingProfile.skills_talents : null,
        interests: matchingProfile ? matchingProfile.interests : null,
        bio: matchingProfile ? matchingProfile.bio : null,
        profile_image_url: matchingProfile ? matchingProfile.profile_image_url : null,
        role: matchingProfile ? matchingProfile.role : 'user',
        created_at: member.created_at,
        updated_at: member.updated_at
      };
      
      // Track conflicts
      if (matchingProfile) {
        const memberConflicts = [];
        
        if (member.fullname && matchingProfile.full_name && member.fullname !== matchingProfile.full_name) {
          memberConflicts.push(`Name: members="${member.fullname}" vs profiles="${matchingProfile.full_name}"`);
        }
        
        if (member.email && matchingProfile.email && member.email !== matchingProfile.email) {
          memberConflicts.push(`Email: members="${member.email}" vs profiles="${matchingProfile.email}"`);
        }
        
        if (member.phone && matchingProfile.phone && member.phone !== matchingProfile.phone) {
          memberConflicts.push(`Phone: members="${member.phone}" vs profiles="${matchingProfile.phone}"`);
        }
        
        if (memberConflicts.length > 0) {
          conflicts.push({
            member_id: member.id,
            email: consolidatedRecord.email,
            conflicts: memberConflicts
          });
        }
      }
      
      consolidatedRecords.push(consolidatedRecord);
    }
    
    // Process profiles without matching members
    for (const profile of profiles) {
      const hasMatchingMember = members.some(m => m.user_id === profile.id);
      
      if (!hasMatchingMember) {
        const consolidatedRecord = {
          user_id: profile.id,
          email: profile.email || `profile-${profile.id}@noemail.local`,
          fullname: profile.full_name || 'Unknown Name',
          phone: profile.phone,
          address: profile.address,
          genotype: profile.genotype,
          date_of_birth: profile.date_of_birth,
          gender: profile.gender,
          marital_status: profile.marital_status,
          occupation: profile.occupation,
          emergency_contact_name: profile.emergency_contact_name,
          emergency_contact_phone: profile.emergency_contact_phone,
          emergency_contact_relationship: profile.emergency_contact_relationship,
          city: profile.city,
          state: profile.state,
          postal_code: profile.postal_code,
          country: profile.country || 'Nigeria',
          category: 'Members',
          churchunit: profile.church_unit,
          joindate: profile.join_date || new Date().toISOString().split('T')[0],
          isactive: true,
          baptism_date: profile.baptism_date,
          baptism_location: profile.baptism_location,
          is_baptized: profile.is_baptized || false,
          membership_status: profile.membership_status || 'active',
          preferred_contact_method: profile.preferred_contact_method || 'email',
          skills_talents: profile.skills_talents,
          interests: profile.interests,
          bio: profile.bio,
          profile_image_url: profile.profile_image_url,
          role: profile.role || 'user',
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };
        
        consolidatedRecords.push(consolidatedRecord);
      }
    }
    
    console.log(`✓ Created ${consolidatedRecords.length} consolidated records`);
    console.log(`✓ Found ${conflicts.length} conflicts to resolve`);
    
    // Step 4: Insert consolidated records into members_enhanced table
    console.log('Step 4: Inserting consolidated records...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of consolidatedRecords) {
      try {
        const { error } = await supabase
          .from('members_enhanced')
          .insert(record);
        
        if (error) {
          console.log(`Error inserting record for ${record.email}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        console.log(`Exception inserting record for ${record.email}:`, e.message);
        errorCount++;
      }
    }
    
    console.log(`✓ Successfully inserted: ${successCount} records`);
    console.log(`✗ Failed to insert: ${errorCount} records`);
    
    // Step 5: Report conflicts
    if (conflicts.length > 0) {
      console.log('\nStep 5: Conflict Resolution Report:');
      conflicts.forEach(conflict => {
        console.log(`- ${conflict.email}:`);
        conflict.conflicts.forEach(c => console.log(`  * ${c}`));
      });
    }
    
    // Step 6: Validate final state
    console.log('\nStep 6: Validating final state...');
    const { count: finalCount, error: countError } = await supabase
      .from('members_enhanced')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✓ Enhanced members table now contains: ${finalCount} records`);
    }
    
    // Sample some data
    const { data: sampleData, error: sampleError } = await supabase
      .from('members_enhanced')
      .select('id, email, fullname, genotype, role, category, churchunit')
      .limit(5);
    
    if (!sampleError && sampleData) {
      console.log('\nSample consolidated records:');
      sampleData.forEach(record => {
        console.log(`- ${record.fullname} (${record.email})`);
        console.log(`  Role: ${record.role}, Category: ${record.category}, Genotype: ${record.genotype || 'N/A'}`);
      });
    }
    
    console.log('\n✅ Data consolidation completed successfully!');
    
  } catch (err) {
    console.error('Error during data consolidation:', err.message);
  }
}

directDataConsolidation();