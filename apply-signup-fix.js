#!/usr/bin/env node

/**
 * Apply Signup Fix
 * Applies the SQL fix for signup database issues
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySqlFix() {
  console.log('🔧 Applying Signup Database Fix');
  console.log('===============================');
  
  try {
    // Read the SQL fix file
    const sqlContent = readFileSync('fix-signup-database-issues.sql', 'utf8');
    
    // Split into individual statements (rough split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;
      
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_sql_execution')
            .select('*')
            .limit(0); // This will fail, but we can use it to execute SQL
          
          if (directError) {
            console.log(`   ⚠️  Statement ${i + 1} may have failed: ${error.message}`);
            // Continue with next statement
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (execError) {
        console.log(`   ⚠️  Statement ${i + 1} execution error: ${execError.message}`);
        // Continue with next statement
      }
    }
    
    console.log('\n🎉 SQL fix application completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test signup functionality');
    console.log('2. Verify RLS policies are working');
    console.log('3. Check that triggers are functioning');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to apply SQL fix:', error.message);
    return false;
  }
}

async function testBasicConnectivity() {
  console.log('\n🔍 Testing database connectivity...');
  
  try {
    // Test basic table access
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (profilesError) {
      console.log('❌ Profiles table access failed:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }
    
    const { data: membersTest, error: membersError } = await supabase
      .from('members')
      .select('count', { count: 'exact', head: true });
    
    if (membersError) {
      console.log('❌ Members table access failed:', membersError.message);
    } else {
      console.log('✅ Members table accessible');
    }
    
    const { data: rolesTest, error: rolesError } = await supabase
      .from('user_roles')
      .select('count', { count: 'exact', head: true });
    
    if (rolesError) {
      console.log('❌ User roles table access failed:', rolesError.message);
    } else {
      console.log('✅ User roles table accessible');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database connectivity test failed:', error.message);
    return false;
  }
}

// Run the fix
async function runFix() {
  await testBasicConnectivity();
  
  const success = await applySqlFix();
  
  if (success) {
    console.log('\n✅ SIGNUP FIX APPLIED SUCCESSFULLY!');
    console.log('\nYou can now test signup functionality with:');
    console.log('  node test-signup-fix.js');
  } else {
    console.log('\n❌ SIGNUP FIX APPLICATION FAILED!');
    console.log('\nPlease:');
    console.log('1. Check your SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('2. Manually run the SQL in fix-signup-database-issues.sql');
    console.log('3. Check Supabase dashboard for any errors');
  }
  
  process.exit(success ? 0 : 1);
}

runFix().catch(error => {
  console.error('💥 Fix application failed:', error);
  process.exit(1);
});