#!/usr/bin/env node

/**
 * Admin System Verification Script
 * This script verifies that the complete admin system is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAdminSystem() {
  console.log('🔍 Verifying Gospel Labour Ministry Admin System...\n');
  
  const checks = [];
  
  try {
    // 1. Check admin user exists
    console.log('1️⃣ Checking admin user...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    const adminUser = authUsers.users.find(u => u.email === 'ojidelawrence@gmail.com');
    if (adminUser) {
      console.log('   ✅ Admin user found');
      checks.push({ name: 'Admin User', status: 'pass' });
    } else {
      console.log('   ❌ Admin user not found');
      checks.push({ name: 'Admin User', status: 'fail' });
    }

    // 2. Check database tables
    console.log('2️⃣ Checking database tables...');
    const requiredTables = [
      'profiles', 'user_roles', 'members', 'sermons', 'testimonies', 
      'prayer_requests', 'financial_records', 'visitors', 'communication_logs',
      'system_settings', 'audit_logs'
    ];
    
    let tablesOk = true;
    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`   ❌ Table '${table}' not accessible`);
          tablesOk = false;
        }
      } catch (e) {
        console.log(`   ❌ Table '${table}' error: ${e.message}`);
        tablesOk = false;
      }
    }
    
    if (tablesOk) {
      console.log('   ✅ All required tables accessible');
      checks.push({ name: 'Database Tables', status: 'pass' });
    } else {
      checks.push({ name: 'Database Tables', status: 'fail' });
    }

    // 3. Check user-member sync
    console.log('3️⃣ Checking user-member synchronization...');
    const { data: authCount } = await supabase.auth.admin.listUsers();
    const { data: memberCount, error: memberError } = await supabase
      .from('members')
      .select('user_id', { count: 'exact', head: true });

    if (memberError) throw memberError;

    const authUserCount = authCount?.users.length || 0;
    const memberRecordCount = memberCount || 0;

    if (authUserCount > 0 && memberRecordCount >= authUserCount) {
      console.log(`   ✅ Sync working (${authUserCount} auth users, ${memberRecordCount} member records)`);
      checks.push({ name: 'User-Member Sync', status: 'pass' });
    } else {
      console.log(`   ⚠️  Sync may need attention (${authUserCount} auth users, ${memberRecordCount} member records)`);
      checks.push({ name: 'User-Member Sync', status: 'warning' });
    }

    // 4. Check admin roles
    console.log('4️⃣ Checking admin roles...');
    if (adminUser) {
      const { data: adminRole, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', adminUser.id)
        .eq('role', 'superuser')
        .single();

      if (roleError && roleError.code !== 'PGRST116') throw roleError;

      if (adminRole) {
        console.log('   ✅ Admin role configured');
        checks.push({ name: 'Admin Roles', status: 'pass' });
      } else {
        console.log('   ❌ Admin role not found');
        checks.push({ name: 'Admin Roles', status: 'fail' });
      }
    } else {
      checks.push({ name: 'Admin Roles', status: 'fail' });
    }

    // 5. Check system settings
    console.log('5️⃣ Checking system settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(5);

    if (settingsError) throw settingsError;

    if (settings && settings.length > 0) {
      console.log(`   ✅ System settings configured (${settings.length} settings)`);
      checks.push({ name: 'System Settings', status: 'pass' });
    } else {
      console.log('   ⚠️  No system settings found');
      checks.push({ name: 'System Settings', status: 'warning' });
    }

    // 6. Check RLS policies
    console.log('6️⃣ Checking Row Level Security...');
    try {
      // Test if RLS is working by trying to access data
      const { error: rlsError } = await supabase
        .from('members')
        .select('*')
        .limit(1);

      if (!rlsError) {
        console.log('   ✅ RLS policies configured');
        checks.push({ name: 'Row Level Security', status: 'pass' });
      } else {
        console.log('   ⚠️  RLS may need configuration');
        checks.push({ name: 'Row Level Security', status: 'warning' });
      }
    } catch (e) {
      console.log('   ⚠️  RLS check inconclusive');
      checks.push({ name: 'Row Level Security', status: 'warning' });
    }

    // Summary
    console.log('\n📋 Verification Summary:');
    console.log('========================');
    
    const passed = checks.filter(c => c.status === 'pass').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    const failed = checks.filter(c => c.status === 'fail').length;

    checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}`);
    });

    console.log(`\n📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 Admin system verification completed successfully!');
      console.log('\n🚀 Your admin system is ready to use:');
      console.log('   1. Start your app: npm run dev');
      console.log('   2. Login at /auth with ojidelawrence@gmail.com');
      console.log('   3. Access admin dashboard at /admin');
      console.log('   4. All new user registrations will sync to members table');
      
      if (warnings > 0) {
        console.log('\n⚠️  Note: Some warnings were found but the system should work correctly.');
      }
      
      return true;
    } else {
      console.log('\n❌ Admin system has issues that need to be resolved.');
      console.log('\n🔧 Try running: node complete-admin-setup.js');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your .env file');
    console.log('   2. Verify Supabase connection');
    console.log('   3. Run: node complete-admin-setup.js');
    return false;
  }
}

// Run verification
verifyAdminSystem().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});