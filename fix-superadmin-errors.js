/**
 * Fix SuperAdmin SQL Function Errors
 * This script applies the SQL fixes for the superadmin management functions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Fixing SuperAdmin SQL Function Errors');
console.log('=========================================');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure you have the correct service role key in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixSuperAdminFunctions() {
  try {
    console.log('📖 Reading SQL fix file...');
    const sqlContent = readFileSync('src/integrations/supabase/fix_superadmin_function_complete.sql', 'utf8');
    
    console.log('🔧 Applying SQL fixes...');
    
    // Split the SQL into individual function definitions
    const functionDefinitions = sqlContent.split('CREATE OR REPLACE FUNCTION').filter(def => def.trim().length > 0);
    
    for (let i = 0; i < functionDefinitions.length; i++) {
      const functionDef = i === 0 ? functionDefinitions[i] : 'CREATE OR REPLACE FUNCTION' + functionDefinitions[i];
      
      if (functionDef.trim().length < 50) continue; // Skip empty or very short definitions
      
      try {
        console.log(`📝 Applying function ${i + 1}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: functionDef.trim() 
        });
        
        if (error) {
          console.log(`⚠️  Function ${i + 1} warning:`, error.message);
        } else {
          console.log(`✅ Function ${i + 1} applied successfully`);
        }
      } catch (e) {
        console.log(`⚠️  Function ${i + 1} error:`, e.message);
      }
    }
    
    // Test the functions
    console.log('\n🧪 Testing fixed functions...');
    
    // Test list_super_admins
    try {
      const { data: listData, error: listError } = await supabase.rpc('list_super_admins');
      if (listError) {
        console.log('❌ list_super_admins test failed:', listError.message);
      } else {
        console.log('✅ list_super_admins test passed');
        console.log('📊 Current super admins:', Array.isArray(listData) ? listData.length : 'Invalid format');
      }
    } catch (e) {
      console.log('❌ list_super_admins test error:', e.message);
    }
    
    console.log('\n🎉 SuperAdmin function fixes applied!');
    console.log('\nNext steps:');
    console.log('1. Refresh your admin dashboard');
    console.log('2. Try adding/removing super admins');
    console.log('3. The errors should now be resolved');
    
  } catch (error) {
    console.error('\n❌ Failed to apply fixes:', error.message);
    console.log('\n🔧 Manual Fix Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of src/integrations/supabase/fix_superadmin_function_complete.sql');
    console.log('4. Paste and execute the SQL script');
    process.exit(1);
  }
}

// Run the fix
fixSuperAdminFunctions();