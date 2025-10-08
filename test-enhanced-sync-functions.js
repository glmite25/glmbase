// Test script for enhanced sync functions
// Task 4.1: Test trigger functionality with new user registrations

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEnhancedSyncFunctions() {
  console.log('🧪 Testing Enhanced Sync Functions...\n');

  try {
    // Test 1: Validate sync integrity
    console.log('1️⃣ Testing sync integrity validation...');
    const { data: integrityResults, error: integrityError } = await supabase
      .rpc('validate_enhanced_sync_integrity');

    if (integrityError) {
      console.error('❌ Integrity validation error:', integrityError);
    } else {
      console.log('✅ Integrity validation results:');
      integrityResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`   ${icon} ${result.check_name}: ${result.details}`);
      });
    }

    // Test 2: Test new user registration simulation
    console.log('\n2️⃣ Testing new user registration simulation...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: testResults, error: testError } = await supabase
      .rpc('test_enhanced_sync_new_user', {
        test_email: testEmail,
        test_name: 'Test User'
      });

    if (testError) {
      console.error('❌ Test simulation error:', testError);
    } else {
      console.log('✅ Test simulation results:');
      testResults.forEach(result => {
        const icon = result.status === 'READY' ? '✅' : result.status === 'EXISTS' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${result.step}: ${result.details}`);
      });
    }

    // Test 3: Check if triggers exist
    console.log('\n3️⃣ Checking if enhanced sync triggers exist...');
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table, action_timing, event_manipulation')
      .in('trigger_name', [
        'trigger_sync_user_to_member_enhanced',
        'trigger_sync_profile_to_member_enhanced',
        'trigger_sync_member_to_profile_enhanced'
      ]);

    if (triggerError) {
      console.error('❌ Trigger check error:', triggerError);
    } else {
      console.log('✅ Enhanced sync triggers found:');
      triggers.forEach(trigger => {
        console.log(`   📌 ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    }

    // Test 4: Check function existence
    console.log('\n4️⃣ Checking if enhanced sync functions exist...');
    const { data: functions, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .in('routine_name', [
        'sync_user_to_member_enhanced',
        'sync_profile_to_member_enhanced',
        'sync_member_to_profile_enhanced',
        'sync_existing_users_to_enhanced_members',
        'validate_enhanced_sync_integrity'
      ])
      .eq('routine_schema', 'public');

    if (functionError) {
      console.error('❌ Function check error:', functionError);
    } else {
      console.log('✅ Enhanced sync functions found:');
      functions.forEach(func => {
        console.log(`   🔧 ${func.routine_name} (${func.routine_type})`);
      });
    }

    // Test 5: Sync existing users to enhanced members
    console.log('\n5️⃣ Testing sync of existing users to enhanced members...');
    const { data: syncCount, error: syncError } = await supabase
      .rpc('sync_existing_users_to_enhanced_members');

    if (syncError) {
      console.error('❌ Sync existing users error:', syncError);
    } else {
      console.log(`✅ Synced ${syncCount} existing users to enhanced members table`);
    }

    // Test 6: Check enhanced members table structure
    console.log('\n6️⃣ Checking enhanced members table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'members_enhanced')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (tableError) {
      console.error('❌ Table structure check error:', tableError);
    } else {
      console.log('✅ Enhanced members table columns:');
      tableInfo.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   📋 ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
    }

    // Test 7: Check RLS policies on enhanced members table
    console.log('\n7️⃣ Checking RLS policies on enhanced members table...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'members_enhanced')
      .eq('schemaname', 'public');

    if (policyError) {
      console.error('❌ RLS policy check error:', policyError);
    } else {
      console.log('✅ RLS policies on enhanced members table:');
      policies.forEach(policy => {
        console.log(`   🔒 ${policy.policyname} (${policy.cmd})`);
      });
    }

    console.log('\n🎉 Enhanced sync function testing completed!');

  } catch (error) {
    console.error('❌ Test execution error:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedSyncFunctions();
}

module.exports = { testEnhancedSyncFunctions };