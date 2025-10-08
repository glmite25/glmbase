// Test script for enhanced RLS policies
// Task 4.2: Test RLS policies for consolidated tables

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEnhancedRLSPolicies() {
  console.log('🔒 Testing Enhanced RLS Policies...\n');

  try {
    // Test 1: Run RLS policy validation
    console.log('1️⃣ Running RLS policy validation tests...');
    const { data: rlsTests, error: rlsError } = await supabase
      .rpc('test_enhanced_rls_policies');

    if (rlsError) {
      console.error('❌ RLS policy test error:', rlsError);
    } else {
      console.log('✅ RLS policy validation results:');
      rlsTests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : test.status === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${test.policy_test}: ${test.details}`);
      });
    }

    // Test 2: Check specific policies on enhanced members table
    console.log('\n2️⃣ Checking enhanced members table policies...');
    const { data: membersPolicies, error: membersPolicyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'members_enhanced')
      .eq('schemaname', 'public');

    if (membersPolicyError) {
      console.error('❌ Members policies check error:', membersPolicyError);
    } else {
      console.log('✅ Enhanced members table policies:');
      membersPolicies.forEach(policy => {
        console.log(`   🔐 ${policy.policyname} (${policy.cmd})`);
      });
      console.log(`   📊 Total policies: ${membersPolicies.length}`);
    }

    // Test 3: Check specific policies on profiles table
    console.log('\n3️⃣ Checking profiles table policies...');
    const { data: profilesPolicies, error: profilesPolicyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'profiles')
      .eq('schemaname', 'public');

    if (profilesPolicyError) {
      console.error('❌ Profiles policies check error:', profilesPolicyError);
    } else {
      console.log('✅ Profiles table policies:');
      profilesPolicies.forEach(policy => {
        console.log(`   🔐 ${policy.policyname} (${policy.cmd})`);
      });
      console.log(`   📊 Total policies: ${profilesPolicies.length}`);
    }

    // Test 4: Check helper functions
    console.log('\n4️⃣ Checking RLS helper functions...');
    const { data: helperFunctions, error: helperError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .in('routine_name', [
        'is_admin_or_superuser',
        'is_superuser',
        'is_pastor',
        'test_enhanced_rls_policies',
        'migrate_existing_rls_policies'
      ])
      .eq('routine_schema', 'public');

    if (helperError) {
      console.error('❌ Helper functions check error:', helperError);
    } else {
      console.log('✅ RLS helper functions:');
      helperFunctions.forEach(func => {
        console.log(`   🔧 ${func.routine_name} (${func.routine_type})`);
      });
    }

    // Test 5: Check RLS is enabled on tables
    console.log('\n5️⃣ Checking RLS status on tables...');
    const { data: tableRLS, error: tableRLSError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .in('tablename', ['members_enhanced', 'profiles'])
      .eq('schemaname', 'public');

    if (tableRLSError) {
      console.error('❌ Table RLS check error:', tableRLSError);
    } else {
      console.log('✅ RLS status on tables:');
      tableRLS.forEach(table => {
        const status = table.rowsecurity ? '🔒 ENABLED' : '🔓 DISABLED';
        console.log(`   ${status} ${table.tablename}`);
      });
    }

    // Test 6: Check user_roles table for admin/superuser assignments
    console.log('\n6️⃣ Checking admin/superuser role assignments...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'superuser']);

    if (userRolesError) {
      console.error('❌ User roles check error:', userRolesError);
    } else {
      console.log('✅ Admin/Superuser role assignments:');
      if (userRoles.length === 0) {
        console.log('   ⚠️ No admin/superuser roles found in user_roles table');
        console.log('   ℹ️ Relying on hardcoded superuser emails for access');
      } else {
        userRoles.forEach(role => {
          console.log(`   👤 User ${role.user_id}: ${role.role}`);
        });
      }
    }

    // Test 7: Validate superuser email access
    console.log('\n7️⃣ Validating superuser email access...');
    const superuserEmails = ['ojidelawrence@gmail.com', 'popsabey1@gmail.com'];
    
    for (const email of superuserEmails) {
      const { data: authUser, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (authError) {
        console.log(`   ⚠️ ${email}: Not found in auth.users`);
      } else {
        console.log(`   ✅ ${email}: Found in auth.users (ID: ${authUser.id})`);
        
        // Check if they have member record
        const { data: memberRecord, error: memberError } = await supabase
          .from('members_enhanced')
          .select('id, role, category')
          .eq('email', email)
          .single();

        if (memberError) {
          console.log(`   ⚠️ ${email}: No member record found`);
        } else {
          console.log(`   ✅ ${email}: Member record found (Role: ${memberRecord.role}, Category: ${memberRecord.category})`);
        }
      }
    }

    // Test 8: Test policy migration function
    console.log('\n8️⃣ Testing policy migration function...');
    const { data: migrationResult, error: migrationError } = await supabase
      .rpc('migrate_existing_rls_policies');

    if (migrationError) {
      console.error('❌ Policy migration test error:', migrationError);
    } else {
      console.log('✅ Policy migration test result:');
      console.log(migrationResult);
    }

    // Test 9: Check for any conflicting policies on old members table
    console.log('\n9️⃣ Checking for conflicting policies on old tables...');
    const { data: oldPolicies, error: oldPolicyError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename')
      .eq('tablename', 'members')
      .eq('schemaname', 'public');

    if (oldPolicyError) {
      console.log('   ℹ️ No old members table found (expected after migration)');
    } else if (oldPolicies.length === 0) {
      console.log('   ✅ No conflicting policies found on old members table');
    } else {
      console.log('   ⚠️ Found policies on old members table:');
      oldPolicies.forEach(policy => {
        console.log(`   📋 ${policy.policyname} on ${policy.tablename}`);
      });
    }

    console.log('\n🎉 Enhanced RLS policy testing completed!');

  } catch (error) {
    console.error('❌ Test execution error:', error);
  }
}

// Function to test specific user access (requires user authentication)
async function testUserAccess(userEmail, userPassword) {
  console.log(`\n🧪 Testing user access for: ${userEmail}`);

  try {
    // Create client for user authentication
    const userSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Sign in as the user
    const { data: authData, error: authError } = await userSupabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if (authError) {
      console.error('❌ User authentication failed:', authError.message);
      return;
    }

    console.log('✅ User authenticated successfully');

    // Test 1: Try to view members (should work for authenticated users)
    const { data: members, error: membersError } = await userSupabase
      .from('members_enhanced')
      .select('id, email, fullname, isactive')
      .limit(5);

    if (membersError) {
      console.log('❌ Cannot view members:', membersError.message);
    } else {
      console.log(`✅ Can view ${members.length} member records`);
    }

    // Test 2: Try to view own profile
    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log('❌ Cannot view own profile:', profileError.message);
    } else {
      console.log('✅ Can view own profile');
    }

    // Test 3: Try to update own member record
    const { data: ownMember, error: ownMemberError } = await userSupabase
      .from('members_enhanced')
      .select('id, phone')
      .eq('user_id', authData.user.id)
      .single();

    if (ownMemberError) {
      console.log('❌ Cannot find own member record:', ownMemberError.message);
    } else {
      // Try to update phone number
      const { error: updateError } = await userSupabase
        .from('members_enhanced')
        .update({ phone: '+1234567890' })
        .eq('id', ownMember.id);

      if (updateError) {
        console.log('❌ Cannot update own member record:', updateError.message);
      } else {
        console.log('✅ Can update own member record');
      }
    }

    // Sign out
    await userSupabase.auth.signOut();

  } catch (error) {
    console.error('❌ User access test error:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedRLSPolicies();
}

module.exports = { testEnhancedRLSPolicies, testUserAccess };