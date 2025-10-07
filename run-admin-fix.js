#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://jaicfvakzxfeijtuogir.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please set it in your .env file or environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`❌ ${description} failed:`, error.message);
      return false;
    }
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function checkAdminStatus(email) {
  console.log(`🔍 Checking admin status for: ${email}`);
  try {
    const { data, error } = await supabase.rpc('check_admin_status', { user_email: email });
    if (error) {
      console.error('❌ Failed to check admin status:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const user = data[0];
      console.log(`📊 Admin Status for ${email}:`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Has Profile: ${user.has_profile ? '✅' : '❌'}`);
      console.log(`   Has Member Record: ${user.has_member_record ? '✅' : '❌'}`);
      console.log(`   Roles: ${user.roles.length > 0 ? user.roles.join(', ') : 'None'}`);
    } else {
      console.log(`❌ User not found: ${email}`);
    }
  } catch (error) {
    console.error('❌ Error checking admin status:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Admin Authentication Fix...\n');

  // Read the SQL file
  const sqlFile = join(__dirname, 'fix-admin-authentication.sql');
  let sql;
  try {
    sql = readFileSync(sqlFile, 'utf8');
  } catch (error) {
    console.error('❌ Failed to read SQL file:', error.message);
    process.exit(1);
  }

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Execute each statement
  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const description = `Statement ${i + 1}/${statements.length}`;
    
    if (await runSQL(statement, description)) {
      successCount++;
    }
  }

  console.log(`\n📊 Execution Summary: ${successCount}/${statements.length} statements succeeded\n`);

  if (successCount === statements.length) {
    console.log('✅ All database fixes applied successfully!\n');
    
    // Check admin status for known admin emails
    const adminEmails = [
      'ojidelawrence@gmail.com',
      'admin@gospellabourministry.com',
      'superadmin@gospellabourministry.com'
    ];

    console.log('🔍 Verifying admin user setup...\n');
    for (const email of adminEmails) {
      await checkAdminStatus(email);
      console.log('');
    }

    console.log('🎉 Admin authentication fix completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test admin login in the application');
    console.log('2. Check browser console for any remaining errors');
    console.log('3. Verify admin dashboard loads without getting stuck');
    
  } else {
    console.log('❌ Some database fixes failed. Please check the errors above.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main().catch(console.error);
