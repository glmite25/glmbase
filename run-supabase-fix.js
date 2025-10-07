#!/usr/bin/env node

// Script to run database fixes using Supabase Management API
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_PROJECT_ID = 'jaicfvakzxfeijtuogir';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN environment variable is required');
  console.log('Please get your access token from https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

async function runSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Running Supabase Database Fix...\n');

  // Read the SQL file
  const sql = readFileSync('./fix-admin-authentication.sql', 'utf8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
    
    const { success, error } = await runSQL(statement);
    
    if (success) {
      console.log(`✅ Statement ${i + 1} completed successfully`);
      successCount++;
    } else {
      console.log(`❌ Statement ${i + 1} failed:`, error);
    }
    
    // Small delay between statements
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Execution Summary: ${successCount}/${statements.length} statements succeeded\n`);

  if (successCount === statements.length) {
    console.log('🎉 All database fixes applied successfully!');
    
    // Test admin user setup
    console.log('\n🔍 Testing admin user setup...');
    
    const testQuery = `
      SELECT 
        p.email,
        p.id as user_id,
        array_agg(ur.role) as roles,
        CASE WHEN m.user_id IS NOT NULL THEN true ELSE false END as has_member_record
      FROM profiles p
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      LEFT JOIN members m ON p.id = m.user_id
      WHERE p.email IN ('ojidelawrence@gmail.com', 'admin@gospellabourministry.com', 'superadmin@gospellabourministry.com')
      GROUP BY p.email, p.id, m.user_id;
    `;
    
    const { success: testSuccess, result: testResult } = await runSQL(testQuery);
    
    if (testSuccess && testResult) {
      console.log('\n📊 Admin User Status:');
      if (testResult.length > 0) {
        testResult.forEach(user => {
          console.log(`   📧 ${user.email}:`);
          console.log(`      User ID: ${user.user_id}`);
          console.log(`      Roles: ${user.roles ? user.roles.join(', ') : 'None'}`);
          console.log(`      Has Member Record: ${user.has_member_record ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('   ❌ No admin users found');
      }
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test admin login in the application');
    console.log('2. Check browser console for any remaining errors');
    console.log('3. Verify admin dashboard loads without getting stuck');
    
  } else {
    console.log('❌ Some database fixes failed. Please check the errors above.');
    console.log('\n💡 Common issues:');
    console.log('- Check your SUPABASE_ACCESS_TOKEN is valid');
    console.log('- Ensure you have proper permissions on the project');
    console.log('- Some statements may fail if tables already exist (this is normal)');
  }
}

main().catch(console.error);
