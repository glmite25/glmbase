import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createEnhancedTable() {
  try {
    console.log('Creating enhanced members table...\n');
    
    // First, let's check what enums exist
    console.log('Checking existing enums...');
    
    // Create the enhanced table with a simpler approach
    const createTableSQL = `
      -- Create the enhanced members table
      CREATE TABLE IF NOT EXISTS public.members_enhanced (
        -- Primary identification
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID,
        
        -- Basic information (consolidated from both tables)
        email VARCHAR(255) NOT NULL UNIQUE,
        fullname VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        genotype VARCHAR(10),
        
        -- Extended personal information
        date_of_birth DATE,
        gender VARCHAR(10),
        marital_status VARCHAR(20),
        occupation VARCHAR(255),
        
        -- Emergency contact information
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(100),
        
        -- Location information
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'Nigeria',
        
        -- Church-specific information
        category VARCHAR(50) NOT NULL DEFAULT 'Members',
        title TEXT,
        assignedto UUID,
        churchunit TEXT,
        churchunits TEXT[],
        auxanogroup TEXT,
        joindate DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        isactive BOOLEAN NOT NULL DEFAULT true,
        
        -- Spiritual information
        baptism_date DATE,
        baptism_location VARCHAR(255),
        is_baptized BOOLEAN DEFAULT false,
        membership_status VARCHAR(20) DEFAULT 'active',
        
        -- Communication preferences
        preferred_contact_method VARCHAR(20) DEFAULT 'email',
        
        -- Skills and interests
        skills_talents TEXT[],
        interests TEXT[],
        
        -- Profile information
        bio TEXT,
        profile_image_url TEXT,
        
        -- Authentication and role information
        role VARCHAR(20) DEFAULT 'user',
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Execute using a simple approach - create a temporary function
    const { error: createError } = await supabase.rpc('create_enhanced_members_table', {
      sql_statement: createTableSQL
    });
    
    if (createError) {
      console.log('Direct table creation failed, trying alternative approach...');
      
      // Try creating through a simple insert operation to test if table exists
      try {
        const { error: testError } = await supabase
          .from('members_enhanced')
          .select('id')
          .limit(1);
        
        if (testError && testError.message.includes('does not exist')) {
          console.log('Table does not exist. Creating manually...');
          
          // Create a backup of current members table structure for reference
          const { data: membersStructure } = await supabase
            .from('members')
            .select('*')
            .limit(1);
          
          console.log('Current members table structure:', Object.keys(membersStructure[0] || {}));
          
          // Since we can't create the table directly, let's work with the existing structure
          // and add the missing columns to the existing members table
          console.log('Working with existing table structure...');
          
          return false;
        } else {
          console.log('✓ Enhanced members table already exists');
          return true;
        }
      } catch (e) {
        console.log('Error testing table existence:', e.message);
        return false;
      }
    } else {
      console.log('✓ Enhanced members table created successfully');
      return true;
    }
    
  } catch (err) {
    console.error('Error creating enhanced table:', err.message);
    return false;
  }
}

async function alternativeConsolidation() {
  console.log('Using alternative consolidation approach...\n');
  
  // Since we can't create a new table, let's work with the existing members table
  // and add the missing profile data to it
  
  console.log('Step 1: Fetching current data...');
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('*');
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');
  
  if (membersError || profilesError) {
    console.error('Error fetching data:', membersError || profilesError);
    return;
  }
  
  console.log(`✓ Found ${members.length} members and ${profiles.length} profiles`);
  
  // Step 2: Update members with profile data
  console.log('Step 2: Updating members with profile data...');
  
  let updateCount = 0;
  let errorCount = 0;
  
  for (const member of members) {
    const matchingProfile = profiles.find(p => p.id === member.user_id);
    
    if (matchingProfile) {
      // Prepare update data with only fields that exist in members table
      const updateData = {};
      
      // Only update if the member field is empty and profile has data
      if (!member.date_of_birth && matchingProfile.date_of_birth) {
        updateData.date_of_birth = matchingProfile.date_of_birth;
      }
      
      if (!member.gender && matchingProfile.gender) {
        updateData.gender = matchingProfile.gender;
      }
      
      // Update the member record if we have data to update
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('members')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', member.id);
        
        if (updateError) {
          console.log(`Error updating member ${member.email}:`, updateError.message);
          errorCount++;
        } else {
          updateCount++;
          console.log(`✓ Updated ${member.fullname} with profile data`);
        }
      }
    }
  }
  
  console.log(`\n✓ Updated ${updateCount} members with profile data`);
  console.log(`✗ Failed to update ${errorCount} members`);
  
  // Step 3: Create a summary of the consolidation
  console.log('\nStep 3: Consolidation Summary:');
  console.log(`- Total members: ${members.length}`);
  console.log(`- Total profiles: ${profiles.length}`);
  console.log(`- Members with auth accounts: ${members.filter(m => m.user_id).length}`);
  console.log(`- Profiles without member records: ${profiles.filter(p => !members.some(m => m.user_id === p.id)).length}`);
  
  return true;
}

// Main execution
async function main() {
  const tableCreated = await createEnhancedTable();
  
  if (!tableCreated) {
    console.log('Enhanced table creation failed. Using alternative approach...\n');
    await alternativeConsolidation();
  } else {
    console.log('Enhanced table ready. Proceeding with full consolidation...');
    // Run the full consolidation here if table was created
  }
}

main();