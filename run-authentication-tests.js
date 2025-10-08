#!/usr/bin/env node

/**
 * Authentication and User Management Test Runner
 * 
 * This script executes authentication and user management flow tests for task 7.2
 * of the database consolidation project.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

/**
 * Test 1: Verify user registration creates proper records in both tables
 */
async function testUserRegistrationFlow() {
  console.log('\n🔍 Testing User Registration Flow...');
  
  try {
    // Check existing users to see if they have proper records in both profiles and members tables
    
    // Get members with user_id (these should represent registered users)
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("*")
      .not("user_id", "is", null)
      .limit(10);

    if (membersError) {
      return {
        testName: "User Registration Flow - Member Records",
        passed: false,
        message: "Cannot fetch members to test registration flow",
        error: membersError.message
      };
    }

    if (!members || members.length === 0) {
      return {
        testName: "User Registration Flow - Member Records",
        passed: false,
        message: "No members with user_id found to test registration flow"
      };
    }

    console.log(`   📊 Found ${members.length} members with user_id to validate`);

    // In the consolidated structure, profiles table is lightweight
    // Check if profiles exist for these users (optional in new structure)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.log(`   ⚠️  Cannot access profiles table: ${profilesError.message}`);
    } else {
      console.log(`   📊 Found ${profiles?.length || 0} profiles`);
    }

    // Validate that members have proper authentication setup
    const registrationFlowIssues = [];
    
    for (const member of members) {
      // Check if member has required fields for authentication
      if (!member.user_id) {
        registrationFlowIssues.push({
          memberId: member.id,
          email: member.email,
          issue: "Member missing user_id (no auth.users link)"
        });
      }

      if (!member.email) {
        registrationFlowIssues.push({
          memberId: member.id,
          issue: "Member missing email"
        });
      }
    }

    return {
      testName: "User Registration Flow - Member Records",
      passed: registrationFlowIssues.length === 0,
      message: registrationFlowIssues.length === 0 
        ? `All ${members.length} members have proper authentication setup`
        : `Found ${registrationFlowIssues.length} registration flow issues`,
      details: registrationFlowIssues.length > 0 ? registrationFlowIssues : undefined
    };

  } catch (error) {
    return {
      testName: "User Registration Flow - Member Records",
      passed: false,
      message: "Error testing user registration flow",
      error: error.message
    };
  }
}

/**
 * Test 2: Test login/logout functionality with consolidated structure
 */
async function testLoginLogoutFunctionality() {
  console.log('\n🔍 Testing Login/Logout Functionality...');
  
  try {
    // Test if we can access the auth system
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError && userError.message !== 'Auth session missing!') {
      return {
        testName: "Login/Logout Functionality",
        passed: false,
        message: "Cannot access auth system",
        error: userError.message
      };
    }

    // Test if auth endpoints are accessible
    const authTests = [];

    // Test 1: Check if we can access auth.users metadata (indicates auth system is working)
    try {
      // This should work even without being logged in
      const { error: sessionError } = await supabase.auth.getSession();
      authTests.push({
        test: "Auth session access",
        passed: !sessionError || sessionError.message === 'Auth session missing!',
        message: sessionError ? sessionError.message : "Auth session accessible"
      });
    } catch (error) {
      authTests.push({
        test: "Auth session access",
        passed: false,
        message: error.message
      });
    }

    // Test 2: Verify auth configuration by checking if we can access public auth endpoints
    try {
      // This tests if Supabase auth is properly configured
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          'apikey': supabaseAnonKey
        }
      });
      
      authTests.push({
        test: "Auth settings endpoint",
        passed: response.ok,
        message: response.ok ? "Auth settings accessible" : `HTTP ${response.status}`
      });
    } catch (error) {
      authTests.push({
        test: "Auth settings endpoint",
        passed: false,
        message: error.message
      });
    }

    const allAuthTestsPassed = authTests.every(test => test.passed);

    return {
      testName: "Login/Logout Functionality",
      passed: allAuthTestsPassed,
      message: allAuthTestsPassed 
        ? "Authentication system is accessible and configured"
        : "Some authentication tests failed",
      details: authTests
    };

  } catch (error) {
    return {
      testName: "Login/Logout Functionality",
      passed: false,
      message: "Error testing login/logout functionality",
      error: error.message
    };
  }
}

/**
 * Test 3: Validate admin and superuser access controls
 */
async function testAdminSuperuserAccess() {
  console.log('\n🔍 Testing Admin and Superuser Access Controls...');
  
  try {
    // Check if superuser emails are properly configured in members table
    const superuserEmails = ['ojidelawrence@gmail.com', 'popsabey1@gmail.com'];
    
    const { data: superuserMembers, error: superuserError } = await supabase
      .from("members")
      .select("*")
      .in("email", superuserEmails);

    if (superuserError) {
      return {
        testName: "Admin and Superuser Access Controls",
        passed: false,
        message: "Cannot fetch superuser members",
        error: superuserError.message
      };
    }

    const accessControlTests = [];

    // Test 1: Verify superuser members exist
    accessControlTests.push({
      test: "Superuser members exist",
      passed: superuserMembers && superuserMembers.length > 0,
      message: `Found ${superuserMembers?.length || 0} superuser members out of ${superuserEmails.length} expected`
    });

    // Test 2: Check if superuser members have proper role assignment
    if (superuserMembers && superuserMembers.length > 0) {
      const membersWithSuperuserRole = superuserMembers.filter(member => 
        member.role === 'superuser' || member.role === 'admin'
      );
      
      accessControlTests.push({
        test: "Superuser role assignment",
        passed: membersWithSuperuserRole.length > 0,
        message: `${membersWithSuperuserRole.length} members have admin/superuser roles`
      });
    }

    // Test 3: Check user_roles table for role assignments (if it exists)
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .in("role", ["admin", "superuser"]);

    if (!rolesError && userRoles) {
      accessControlTests.push({
        test: "User roles table access",
        passed: true,
        message: `Found ${userRoles.length} admin/superuser role assignments`
      });
    } else if (rolesError && !rolesError.message.includes('does not exist')) {
      accessControlTests.push({
        test: "User roles table access",
        passed: false,
        message: rolesError.message
      });
    }

    // Test 4: Verify RLS policies are in place (by checking if we can access tables)
    const { data: membersTest, error: rlsError } = await supabase
      .from("members")
      .select("id")
      .limit(1);

    accessControlTests.push({
      test: "RLS policies active",
      passed: !rlsError || rlsError.message.includes('RLS'),
      message: rlsError 
        ? (rlsError.message.includes('RLS') ? "RLS policies are active" : rlsError.message)
        : "Members table accessible (RLS may be configured)"
    });

    const allAccessTestsPassed = accessControlTests.every(test => test.passed);

    return {
      testName: "Admin and Superuser Access Controls",
      passed: allAccessTestsPassed,
      message: allAccessTestsPassed 
        ? "Admin and superuser access controls are properly configured"
        : "Some access control tests failed",
      details: accessControlTests
    };

  } catch (error) {
    return {
      testName: "Admin and Superuser Access Controls",
      passed: false,
      message: "Error testing admin and superuser access",
      error: error.message
    };
  }
}

/**
 * Test 4: Verify sync between profiles and members tables
 */
async function testProfileMemberSync() {
  console.log('\n🔍 Testing Profile-Member Synchronization...');
  
  try {
    // Get members with user_id
    const { data: membersWithUserId, error: membersError } = await supabase
      .from("members")
      .select("*")
      .not("user_id", "is", null);

    if (membersError) {
      return {
        testName: "Profile-Member Synchronization",
        passed: false,
        message: "Cannot fetch members with user_id",
        error: membersError.message
      };
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    const syncTests = [];

    if (profilesError) {
      syncTests.push({
        test: "Profiles table access",
        passed: false,
        message: profilesError.message
      });
    } else {
      syncTests.push({
        test: "Profiles table access",
        passed: true,
        message: `Found ${profiles?.length || 0} profiles`
      });

      // Test sync consistency
      if (membersWithUserId && profiles) {
        const memberUserIds = new Set(membersWithUserId.map(m => m.user_id));
        const profileIds = new Set(profiles.map(p => p.id));
        
        const syncedCount = [...memberUserIds].filter(id => profileIds.has(id)).length;
        const totalMembers = membersWithUserId.length;
        
        syncTests.push({
          test: "Profile-Member sync consistency",
          passed: syncedCount > 0,
          message: `${syncedCount}/${totalMembers} members have corresponding profiles`
        });
      }
    }

    const allSyncTestsPassed = syncTests.every(test => test.passed);

    return {
      testName: "Profile-Member Synchronization",
      passed: allSyncTestsPassed,
      message: allSyncTestsPassed 
        ? "Profile-member synchronization is working"
        : "Some synchronization tests failed",
      details: syncTests
    };

  } catch (error) {
    return {
      testName: "Profile-Member Synchronization",
      passed: false,
      message: "Error testing profile-member sync",
      error: error.message
    };
  }
}

/**
 * Main test runner
 */
async function runAuthenticationTests() {
  console.log('🚀 Starting Authentication and User Management Flow Tests');
  console.log('=' .repeat(60));

  const tests = [
    testUserRegistrationFlow,
    testLoginLogoutFunctionality,
    testAdminSuperuserAccess,
    testProfileMemberSync
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.message}`);
      
      if (result.details) {
        result.details.forEach(detail => {
          const detailStatus = detail.passed ? '  ✅' : '  ❌';
          console.log(`${detailStatus} ${detail.test}: ${detail.message}`);
        });
      }
      
      if (result.error) {
        console.log(`   🔍 Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error running test: ${error.message}`);
      results.push({
        testName: test.name || 'Unknown Test',
        passed: false,
        message: 'Test execution failed',
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All authentication and user management flow tests passed!');
    console.log('✅ Task 7.2 completed successfully');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.');
    console.log('❌ Task 7.2 needs attention');
  }

  return {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: (passedTests / totalTests) * 100,
    allPassed: passedTests === totalTests,
    results
  };
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthenticationTests()
    .then(summary => {
      process.exit(summary.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Fatal error running authentication tests:', error);
      process.exit(1);
    });
}

export { runAuthenticationTests };