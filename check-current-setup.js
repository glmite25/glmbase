/**
 * Check current setup with anon key to see what's accessible
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Current Setup Check');
console.log('======================');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCurrentSetup() {
  console.log('\n🔍 Checking what\'s accessible with current keys...\n');
  
  try {
    // Try to check some tables with anon access
    const tablesToCheck = ['profiles', 'members', 'user_roles'];
    
    for (const table of tablesToCheck) {
      console.log(`Checking ${table} table...`);
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Accessible`);
        }
      } catch (e) {
        console.log(`❌ ${table}: ${e.message}`);
      }
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('============');
    console.log('❌ Cannot check superusers - need service role key');
    console.log('❌ Cannot create users - need service role key');
    console.log('❌ Cannot manage admin access - need service role key');
    
    console.log('\n🔧 TO FIX THIS:');
    console.log('================');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Settings → API');
    console.log('3. Copy the SERVICE_ROLE key (not the anon key)');
    console.log('4. Update your .env file:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here');
    console.log('   VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here');
    console.log('5. Run the superuser management script again');
    
    console.log('\n⚠️  IMPORTANT: The service role key should start with "eyJ..." but be different from your anon key');
    console.log('   It should contain "service_role" in the JWT payload, not "anon"');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkCurrentSetup();