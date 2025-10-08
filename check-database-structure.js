import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...\n');
    
    // Check if tables exist
    const { data: tables, error } = await supabase.rpc('get_table_info');
    
    if (error) {
      console.log('Using alternative method to check tables...');
      
      // Check members table
      try {
        const { count: membersCount, error: membersError } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true });
        
        if (!membersError) {
          console.log(`✓ members table exists: ${membersCount} records`);
        }
      } catch (e) {
        console.log('✗ members table does not exist or is not accessible');
      }
      
      // Check profiles table
      try {
        const { count: profilesCount, error: profilesError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (!profilesError) {
          console.log(`✓ profiles table exists: ${profilesCount} records`);
        }
      } catch (e) {
        console.log('✗ profiles table does not exist or is not accessible');
      }
      
      // Check members_enhanced table
      try {
        const { count: enhancedCount, error: enhancedError } = await supabase
          .from('members_enhanced')
          .select('*', { count: 'exact', head: true });
        
        if (!enhancedError) {
          console.log(`✓ members_enhanced table exists: ${enhancedCount} records`);
        }
      } catch (e) {
        console.log('✗ members_enhanced table does not exist or is not accessible');
      }
    }
    
    // Sample some data from members table
    console.log('\nSampling members table structure...');
    const { data: membersSample, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(1);
    
    if (!membersError && membersSample && membersSample.length > 0) {
      console.log('Members table columns:', Object.keys(membersSample[0]));
    }
    
    // Sample some data from profiles table
    console.log('\nSampling profiles table structure...');
    const { data: profilesSample, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!profilesError && profilesSample && profilesSample.length > 0) {
      console.log('Profiles table columns:', Object.keys(profilesSample[0]));
    }
    
  } catch (err) {
    console.error('Error checking database structure:', err.message);
  }
}

checkDatabaseStructure();