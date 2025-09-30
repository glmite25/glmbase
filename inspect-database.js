/**
 * Inspect the database to see what tables and users exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Database Configuration:');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function inspectDatabase() {
  console.log('\n🔍 Inspecting database...\n');
  
  try {
    // Check auth users
    console.log('1. Checking auth.users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`✅ Found ${users.users.length} users in auth system`);
      
      if (users.users.length > 0) {
        console.log('\nUsers:');
        users.users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
          console.log(`   Created: ${user.created_at}`);
          console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
          if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
            console.log(`   Metadata:`, user.user_metadata);
          }
        });
      }
    }
    
    // Try to check some common tables
    const tablesToCheck = ['profiles', 'members', 'user_roles'];
    
    for (const table of tablesToCheck) {
      console.log(`\n2. Checking ${table} table...`);
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(5);
        
        if (error) {
          console.log(`❌ Table '${table}' not found or accessible:`, error.message);
        } else {
          console.log(`✅ Table '${table}' exists with ${data.length} records (showing first 5)`);
          if (data.length > 0) {
            console.log('Sample data:', JSON.stringify(data[0], null, 2));
          }
        }
      } catch (e) {
        console.log(`❌ Error checking table '${table}':`, e.message);
      }
    }
    
    // Check if ojidelawrence exists
    console.log('\n3. Looking for ojidelawrence@gmail.com...');
    const ojideUser = users.users?.find(u => u.email?.toLowerCase() === 'ojidelawrence@gmail.com');
    
    if (ojideUser) {
      console.log('✅ ojidelawrence@gmail.com found in auth system');
      console.log('User details:', {
        id: ojideUser.id,
        email: ojideUser.email,
        created_at: ojideUser.created_at,
        email_confirmed: !!ojideUser.email_confirmed_at,
        metadata: ojideUser.user_metadata
      });
    } else {
      console.log('❌ ojidelawrence@gmail.com not found in auth system');
    }
    
  } catch (error) {
    console.error('\n❌ General error:', error);
  }
}

// Run the inspection
inspectDatabase();