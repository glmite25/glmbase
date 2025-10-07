#!/usr/bin/env node

/**
 * Authentication Verification Test Suite
 * Comprehensive testing of the superadmin authentication system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * Test 1: Login Test
 */
async function testLogin() {
  console.log('\n🔐 TEST 1: Login Functionality');
  console.log('================================');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD
    });

    if (error) {
      console.log('❌ Login failed:', error.message);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.log('❌ Login returned no user data');
      return { success: false, error: 'No user data' };
    }

    console.log('✅ Login successful');
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
    
    return { 
      success: true, 
      userId: data.user.id,
      email: data.user.email,
      emailConfirmed: !!data.user.email_confirmed_at
    };
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Admin Dashboard Access
 */
async function testAdminAccess(userId) {
  console.log('\n🏠 TEST 2: Admin Dashboard Access');
  console.log('==================================');
  
  if (!userId) {
    console.log('❌ Skipped - no user ID from login test');
    return { success: false, error: 'No user ID' };
  }

  try {
    // Test profile access
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log('❌ Profile access failed:', profileError.message);
      return { success: false, error: profileError.message };
    }

    console.log('✅ Profile access successful');
    console.log(`   Role: ${profileData.role}`);
    console.log(`   Name: ${profileData.full_name}`);

    // Test user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (rolesError) {
      console.log('❌ User roles access failed:', rolesError.message);
      return { success: false, error: rolesError.message };
    }

    const roles = rolesData?.map(r => r.role) || [];
    const hasAdminRole = roles.includes('admin') || roles.includes('superuser');

    console.log('✅ User roles access successful');
    console.log(`   Roles: ${roles.join(', ')}`);
    console.log(`   Has admin privileges: ${hasAdminRole ? 'Yes' : 'No'}`);

    if (!hasAdminRole) {
      console.log('⚠️  Warning: User does not have admin privileges');
    }

    return { 
      success: true, 
      profile: profileData,
      roles,
      hasAdminRole
    };
  } catch (error) {
    console.log('❌ Admin access test failed:', error.message);
    return { success: false, error: error.message };
  }
}/**

 * Test 3: System Health Checks
 */
async function testSystemHealth() {
  console.log('\n🏥 TEST 3: System Health Checks');
  console.log('================================');
  
  const checks = [];
  
  try {
    // 1. Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      checks.push({
        component: 'Supabase Connection',
        status: error ? 'ERROR' : 'HEALTHY',
        message: error ? error.message : 'Connection successful'
      });
    } catch (error) {
      checks.push({
        component: 'Supabase Connection',
        status: 'ERROR',
        message: error.message
      });
    }

    // 2. Database tables
    const tables = ['profiles', 'members', 'user_roles'];
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        checks.push({
          component: `Table: ${table}`,
          status: error ? 'ERROR' : 'HEALTHY',
          message: error ? error.message : 'Table accessible'
        });
      } catch (error) {
        checks.push({
          component: `Table: ${table}`,
          status: 'ERROR',
          message: error.message
        });
      }
    }

    // 3. Environment variables
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    checks.push({
      component: 'Environment Variables',
      status: missingVars.length > 0 ? 'ERROR' : 'HEALTHY',
      message: missingVars.length > 0 
        ? `Missing: ${missingVars.join(', ')}` 
        : 'All required variables present'
    });

    // Display results
    checks.forEach(check => {
      const icon = check.status === 'HEALTHY' ? '✅' : 
                   check.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} ${check.component}: ${check.message}`);
    });

    const healthyCount = checks.filter(c => c.status === 'HEALTHY').length;
    const totalCount = checks.length;
    
    console.log(`\n📊 Health Summary: ${healthyCount}/${totalCount} components healthy`);
    
    return { 
      success: healthyCount === totalCount,
      checks,
      healthyCount,
      totalCount
    };
  } catch (error) {
    console.log('❌ System health check failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Complete Authentication Flow
 */
async function testCompleteAuthFlow() {
  console.log('\n🔄 TEST 4: Complete Authentication Flow');
  console.log('=======================================');
  
  const steps = [];
  
  try {
    // Step 1: Sign out
    await supabase.auth.signOut();
    steps.push({ step: 'Sign Out', success: true, message: 'Cleared existing session' });
    console.log('✅ Step 1: Sign out completed');

    // Step 2: Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD
    });

    if (signInError || !signInData.user) {
      steps.push({ 
        step: 'Sign In', 
        success: false, 
        message: signInError?.message || 'No user data' 
      });
      console.log('❌ Step 2: Sign in failed');
      return { success: false, steps };
    }

    steps.push({ 
      step: 'Sign In', 
      success: true, 
      message: `Signed in as ${signInData.user.email}` 
    });
    console.log('✅ Step 2: Sign in successful');

    const userId = signInData.user.id;

    // Step 3: Verify session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const sessionValid = !sessionError && !!sessionData.session;
    
    steps.push({
      step: 'Verify Session',
      success: sessionValid,
      message: sessionValid ? 'Session verified' : 'Session verification failed'
    });
    console.log(`${sessionValid ? '✅' : '❌'} Step 3: Session verification`);

    // Step 4: Access profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    steps.push({
      step: 'Access Profile',
      success: !profileError,
      message: profileError ? profileError.message : 'Profile data retrieved'
    });
    console.log(`${!profileError ? '✅' : '❌'} Step 4: Profile access`);

    // Step 5: Access member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .single();

    steps.push({
      step: 'Access Member Data',
      success: !memberError,
      message: memberError ? memberError.message : 'Member data retrieved'
    });
    console.log(`${!memberError ? '✅' : '❌'} Step 5: Member data access`);

    // Step 6: Access user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    const roles = rolesData?.map(r => r.role) || [];
    steps.push({
      step: 'Access User Roles',
      success: !rolesError,
      message: rolesError ? rolesError.message : `Roles: ${roles.join(', ')}`
    });
    console.log(`${!rolesError ? '✅' : '❌'} Step 6: User roles access`);

    // Step 7: Test admin operations
    const adminTables = ['members', 'profiles', 'user_roles'];
    let adminOpsSuccess = true;
    
    for (const table of adminTables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      const success = !error;
      adminOpsSuccess = adminOpsSuccess && success;
      
      steps.push({
        step: `Admin Operation: Count ${table}`,
        success,
        message: error ? error.message : `Found ${count} records`
      });
      console.log(`${success ? '✅' : '❌'} Step 7.${adminTables.indexOf(table) + 1}: Count ${table}`);
    }

    // Step 8: Sign out
    const { error: signOutError } = await supabase.auth.signOut();
    steps.push({
      step: 'Sign Out',
      success: !signOutError,
      message: signOutError ? signOutError.message : 'Signed out successfully'
    });
    console.log(`${!signOutError ? '✅' : '❌'} Step 8: Sign out`);

    const successfulSteps = steps.filter(s => s.success).length;
    const totalSteps = steps.length;
    
    console.log(`\n📊 Flow Summary: ${successfulSteps}/${totalSteps} steps successful`);
    
    return {
      success: successfulSteps === totalSteps,
      steps,
      successfulSteps,
      totalSteps
    };
  } catch (error) {
    console.log('❌ Authentication flow test failed:', error.message);
    return { success: false, error: error.message, steps };
  }
}

/**
 * Test 5: Account Verification (requires service role)
 */
async function testAccountVerification() {
  console.log('\n👑 TEST 5: Superadmin Account Verification');
  console.log('==========================================');
  
  if (!serviceClient) {
    console.log('⚠️  Skipped - SUPABASE_SERVICE_ROLE_KEY not provided');
    return { success: false, error: 'Service role key missing' };
  }

  try {
    // Check auth.users
    const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Failed to access auth.users:', authError.message);
      return { success: false, error: authError.message };
    }

    const superadminUser = authUsers.users.find(user => 
      user.email === SUPERADMIN_EMAIL
    );

    if (!superadminUser) {
      console.log('❌ Superadmin user not found in auth.users');
      return { success: false, error: 'User not found' };
    }

    console.log('✅ Superadmin user found in auth.users');
    console.log(`   ID: ${superadminUser.id}`);
    console.log(`   Email confirmed: ${superadminUser.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Last sign in: ${superadminUser.last_sign_in_at || 'Never'}`);

    // Check profile
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', superadminUser.id)
      .single();

    console.log(`${!profileError ? '✅' : '❌'} Profile record: ${
      profileError ? profileError.message : 'Found'
    }`);

    // Check member
    const { data: memberData, error: memberError } = await serviceClient
      .from('members')
      .select('*')
      .eq('user_id', superadminUser.id)
      .single();

    console.log(`${!memberError ? '✅' : '❌'} Member record: ${
      memberError ? memberError.message : 'Found'
    }`);

    // Check roles
    const { data: rolesData, error: rolesError } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', superadminUser.id);

    const roles = rolesData?.map(r => r.role) || [];
    const hasSuperuserRole = roles.includes('superuser');

    console.log(`${!rolesError ? '✅' : '❌'} User roles: ${
      rolesError ? rolesError.message : roles.join(', ')
    }`);
    
    if (!hasSuperuserRole) {
      console.log('⚠️  Warning: User does not have superuser role');
    }

    return {
      success: true,
      authUser: superadminUser,
      profile: { exists: !profileError, data: profileData },
      member: { exists: !memberError, data: memberData },
      roles: { exists: !rolesError, roles, hasSuperuserRole }
    };
  } catch (error) {
    console.log('❌ Account verification failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 AUTHENTICATION VERIFICATION TEST SUITE');
  console.log('==========================================');
  console.log(`Target: ${SUPERADMIN_EMAIL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Service Role Available: ${serviceClient ? 'Yes' : 'No'}`);
  
  const results = {
    login: await testLogin(),
    systemHealth: await testSystemHealth(),
    authFlow: await testCompleteAuthFlow(),
    accountVerification: await testAccountVerification()
  };
  
  // Admin access test (only if login successful)
  if (results.login.success && results.login.userId) {
    results.adminAccess = await testAdminAccess(results.login.userId);
  } else {
    results.adminAccess = { 
      success: false, 
      error: 'Skipped due to login failure' 
    };
  }

  // Final summary
  console.log('\n📋 FINAL SUMMARY');
  console.log('================');
  
  const tests = [
    { name: 'Login Test', result: results.login },
    { name: 'Admin Access Test', result: results.adminAccess },
    { name: 'System Health Check', result: results.systemHealth },
    { name: 'Authentication Flow Test', result: results.authFlow },
    { name: 'Account Verification', result: results.accountVerification }
  ];
  
  tests.forEach(test => {
    const icon = test.result.success ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.result.success ? 'PASSED' : 'FAILED'}`);
    if (!test.result.success && test.result.error) {
      console.log(`   Error: ${test.result.error}`);
    }
  });
  
  const passedTests = tests.filter(t => t.result.success).length;
  const totalTests = tests.length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Authentication system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the errors above and fix the issues.');
    
    console.log('\n💡 TROUBLESHOOTING TIPS:');
    if (!results.login.success) {
      console.log('   - Check if the password is correct in the database');
      console.log('   - Verify the user exists in auth.users table');
      console.log('   - Check if email is confirmed');
    }
    if (!results.adminAccess.success && results.login.success) {
      console.log('   - Check RLS policies on profiles, members, and user_roles tables');
      console.log('   - Verify user has proper role assignments');
    }
    if (!results.systemHealth.success) {
      console.log('   - Check environment variables');
      console.log('   - Verify database connectivity');
    }
  }
  
  return passedTests === totalTests;
}

// Run the tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });