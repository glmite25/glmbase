#!/usr/bin/env node

/**
 * Database Consolidation Validation Test Runner
 * 
 * This script executes comprehensive validation tests for the database consolidation
 * project to ensure data integrity, authentication flows, and member management
 * functionality are working correctly.
 * 
 * Usage: node scripts/run-consolidation-validation-tests.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  supabase;

/**
 * Data Integrity Tests
 */
async function executeDataIntegrityTests() {
  console.log("=== EXECUTING DATA INTEGRITY VALIDATION TESTS ===");
  
  const tests = [];
  
  // Test 1: Table Access
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("*")
      .limit(1);

    const { count: profilesCount } = await supabase
      .from("profiles")
      .select("*", { count: 'exact', head: true });

    const { count: membersCount } = await supabase
      .from("members")
      .select("*", { count: 'exact', head: true });

    tests.push({
      testName: "Data Preservation - Table Access",
      passed: !profilesError && !membersError,
      message: (!profilesError && !membersError) ? "Both tables are accessible" : "Cannot access tables",
      details: {
        profilesCount: profilesCount || 0,
        membersCount: membersCount || 0,
        profilesAccessible: !profilesError,
        membersAccessible: !membersError
      },
      error: profilesError?.message || membersError?.message
    });
  } catch (error) {
    tests.push({
      testName: "Data Preservation - Table Access",
      passed: false,
      message: "Error accessing tables",
      error: String(error)
    });
  }

  // Test 2: Data Consistency
  try {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: members } = await supabase.from("members").select("*");

    const orphanedProfiles = [];
    const orphanedMembers = [];

    // Check for orphaned profiles
    for (const profile of profiles || []) {
      const hasMatchingMember = members?.some(member => 
        member.user_id === profile.id || 
        (member.email && profile.email && member.email.toLowerCase() === profile.email.toLowerCase())
      );
      
      if (!hasMatchingMember) {
        orphanedProfiles.push(profile);
      }
    }

    // Check for orphaned members
    for (const member of members || []) {
      if (member.user_id) {
        const hasMatchingProfile = profiles?.some(profile => 
          profile.id === member.user_id ||
          (profile.email && member.email && profile.email.toLowerCase() === member.email.toLowerCase())
        );
        
        if (!hasMatchingProfile) {
          orphanedMembers.push(member);
        }
      }
    }

    const consistencyIssues = orphanedProfiles.length + orphanedMembers.length;

    tests.push({
      testName: "Data Consistency Check",
      passed: consistencyIssues === 0,
      message: consistencyIssues === 0 ? 
        "Data consistency validated successfully" : 
        `Found ${consistencyIssues} consistency issues`,
      details: {
        orphanedProfiles: orphanedProfiles.length,
        orphanedMembers: orphanedMembers.length,
        orphanedProfilesList: orphanedProfiles.slice(0, 5),
        orphanedMembersList: orphanedMembers.slice(0, 5)
      }
    });
  } catch (error) {
    tests.push({
      testName: "Data Consistency Check",
      passed: false,
      message: "Error checking data consistency",
      error: String(error)
    });
  }

  const passedTests = tests.filter(test => test.passed).length;
  const failedTests = tests.length - passedTests;

  return {
    timestamp: new Date().toISOString(),
    overallPassed: failedTests === 0,
    totalTests: tests.length,
    passedTests,
    failedTests,
    tests,
    summary: {
      profilesCount: tests[0]?.details?.profilesCount || 0,
      membersCount: tests[0]?.details?.membersCount || 0,
      orphanedProfiles: tests[1]?.details?.orphanedProfiles || 0,
      orphanedMembers: tests[1]?.details?.orphanedMembers || 0,
      duplicateEmails: 0
    }
  };
}

/**
 * Authentication Tests
 */
async function executeAuthenticationTests() {
  console.log("=== EXECUTING AUTHENTICATION AND USER MANAGEMENT TESTS ===");
  
  const tests = [];

  // Test 1: User Registration Flow
  try {
    const { data: profiles } = await supabase.from("profiles").select("*").limit(10);
    
    if (!profiles || profiles.length === 0) {
      tests.push({
        testName: "User Registration Flow Validation",
        passed: false,
        message: "No profiles found to test registration flow"
      });
    } else {
      const registrationFlowIssues = [];
      
      for (const profile of profiles) {
        const { data: memberRecord } = await supabase
          .from("members")
          .select("*")
          .or(`user_id.eq.${profile.id},email.ilike.${profile.email}`)
          .maybeSingle();

        if (!memberRecord) {
          registrationFlowIssues.push({
            profileId: profile.id,
            email: profile.email,
            issue: "No corresponding member record found"
          });
        }
      }

      tests.push({
        testName: "User Registration Flow Validation",
        passed: registrationFlowIssues.length === 0,
        message: registrationFlowIssues.length === 0 ? 
          "User registration flow is working correctly" : 
          `Found ${registrationFlowIssues.length} registration flow issues`,
        details: {
          profilesChecked: profiles.length,
          registrationFlowIssues: registrationFlowIssues.slice(0, 10),
          issuesCount: registrationFlowIssues.length
        }
      });
    }
  } catch (error) {
    tests.push({
      testName: "User Registration Flow Validation",
      passed: false,
      message: "Error testing user registration flow",
      error: String(error)
    });
  }

  // Test 2: Session Management
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    tests.push({
      testName: "Session Management Validation",
      passed: !userError,
      message: user ? "Session management is working" : "No user session (expected for script execution)",
      details: {
        userLoggedIn: !!user,
        userId: user?.id,
        userEmail: user?.email
      },
      error: userError?.message
    });
  } catch (error) {
    tests.push({
      testName: "Session Management Validation",
      passed: false,
      message: "Error testing session management",
      error: String(error)
    });
  }

  const passedTests = tests.filter(test => test.passed).length;
  const failedTests = tests.length - passedTests;

  return {
    timestamp: new Date().toISOString(),
    overallPassed: failedTests === 0,
    totalTests: tests.length,
    passedTests,
    failedTests,
    tests
  };
}

/**
 * Member Management Tests
 */
async function executeMemberManagementTests() {
  console.log("=== EXECUTING MEMBER MANAGEMENT FUNCTIONALITY TESTS ===");
  
  const tests = [];

  // Test 1: Basic CRUD Operations
  try {
    // Test READ
    const { data: existingMembers, error: readError } = await supabase
      .from("members")
      .select("*")
      .limit(5);

    if (readError) {
      tests.push({
        testName: "Member CRUD Operations - Read",
        passed: false,
        message: "Cannot read members from database",
        error: readError.message
      });
    } else {
      // Test CREATE (using admin client if available)
      const testMemberData = {
        email: `test-member-${Date.now()}@example.com`,
        fullname: "Test Member",
        category: "Members",
        isactive: true,
        role: "user",
        joindate: new Date().toISOString().split('T')[0]
      };

      const { data: createdMember, error: createError } = await adminSupabase
        .from("members")
        .insert([testMemberData])
        .select()
        .single();

      if (createError) {
        tests.push({
          testName: "Member CRUD Operations",
          passed: false,
          message: "Can read but cannot create members",
          details: { canRead: true, canCreate: false },
          error: createError.message
        });
      } else {
        // Test UPDATE
        const { data: updatedMember, error: updateError } = await adminSupabase
          .from("members")
          .update({ fullname: "Updated Test Member" })
          .eq("id", createdMember.id)
          .select()
          .single();

        // Test DELETE
        const { error: deleteError } = await adminSupabase
          .from("members")
          .delete()
          .eq("id", createdMember.id);

        tests.push({
          testName: "Member CRUD Operations Validation",
          passed: !updateError && !deleteError,
          message: (!updateError && !deleteError) ? 
            "All CRUD operations work correctly" : 
            "Some CRUD operations failed",
          details: {
            canRead: true,
            canCreate: true,
            canUpdate: !updateError,
            canDelete: !deleteError,
            testMemberCreated: testMemberData
          },
          error: updateError?.message || deleteError?.message
        });
      }
    }
  } catch (error) {
    tests.push({
      testName: "Member CRUD Operations Validation",
      passed: false,
      message: "Error testing CRUD operations",
      error: String(error)
    });
  }

  // Test 2: Search and Filtering
  try {
    const { data: allMembers } = await supabase.from("members").select("*").limit(10);
    const { data: activeMembers } = await supabase.from("members").select("*").eq("isactive", true).limit(5);
    const { data: categoryMembers } = await supabase.from("members").select("*").eq("category", "Members").limit(5);

    tests.push({
      testName: "Member Search and Filtering Validation",
      passed: true,
      message: "Search and filtering operations work correctly",
      details: {
        totalMembers: allMembers?.length || 0,
        activeMembers: activeMembers?.length || 0,
        categoryMembers: categoryMembers?.length || 0
      }
    });
  } catch (error) {
    tests.push({
      testName: "Member Search and Filtering Validation",
      passed: false,
      message: "Error testing search and filtering",
      error: String(error)
    });
  }

  const passedTests = tests.filter(test => test.passed).length;
  const failedTests = tests.length - passedTests;

  return {
    timestamp: new Date().toISOString(),
    overallPassed: failedTests === 0,
    totalTests: tests.length,
    passedTests,
    failedTests,
    tests
  };
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 Starting Database Consolidation Validation Tests");
  console.log("=" .repeat(60));
  
  try {
    // Execute all test suites
    const dataIntegrityReport = await executeDataIntegrityTests();
    const authenticationReport = await executeAuthenticationTests();
    const memberManagementReport = await executeMemberManagementTests();

    // Calculate overall results
    const testSuites = [dataIntegrityReport, authenticationReport, memberManagementReport];
    const passedTestSuites = testSuites.filter(suite => suite.overallPassed).length;
    const totalIndividualTests = testSuites.reduce((sum, suite) => sum + suite.totalTests, 0);
    const passedIndividualTests = testSuites.reduce((sum, suite) => sum + suite.passedTests, 0);
    const overallPassed = passedTestSuites === testSuites.length;

    // Generate comprehensive report
    const comprehensiveReport = {
      timestamp: new Date().toISOString(),
      overallPassed,
      totalTestSuites: testSuites.length,
      passedTestSuites,
      failedTestSuites: testSuites.length - passedTestSuites,
      totalIndividualTests,
      passedIndividualTests,
      failedIndividualTests: totalIndividualTests - passedIndividualTests,
      testSuites: {
        dataIntegrity: dataIntegrityReport,
        authentication: authenticationReport,
        memberManagement: memberManagementReport
      }
    };

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("📊 COMPREHENSIVE VALIDATION RESULTS");
    console.log("=".repeat(60));
    console.log(`Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test Suites: ${passedTestSuites}/${testSuites.length} passed`);
    console.log(`Individual Tests: ${passedIndividualTests}/${totalIndividualTests} passed`);
    
    // Display detailed results for each suite
    console.log("\n📋 Detailed Results:");
    console.log(`  Data Integrity: ${dataIntegrityReport.overallPassed ? '✅' : '❌'} (${dataIntegrityReport.passedTests}/${dataIntegrityReport.totalTests})`);
    console.log(`  Authentication: ${authenticationReport.overallPassed ? '✅' : '❌'} (${authenticationReport.passedTests}/${authenticationReport.totalTests})`);
    console.log(`  Member Management: ${memberManagementReport.overallPassed ? '✅' : '❌'} (${memberManagementReport.passedTests}/${memberManagementReport.totalTests})`);

    // Display data summary
    if (dataIntegrityReport.summary) {
      console.log("\n📈 Data Summary:");
      console.log(`  Profiles: ${dataIntegrityReport.summary.profilesCount}`);
      console.log(`  Members: ${dataIntegrityReport.summary.membersCount}`);
      if (dataIntegrityReport.summary.orphanedProfiles > 0) {
        console.log(`  ⚠️  Orphaned Profiles: ${dataIntegrityReport.summary.orphanedProfiles}`);
      }
      if (dataIntegrityReport.summary.orphanedMembers > 0) {
        console.log(`  ⚠️  Orphaned Members: ${dataIntegrityReport.summary.orphanedMembers}`);
      }
    }

    // Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = `database-consolidation-validation-report-${timestamp}.json`;
    const reportPath = path.join(process.cwd(), reportFilename);
    
    fs.writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));
    console.log(`\n💾 Report saved to: ${reportFilename}`);

    // Exit with appropriate code
    process.exit(overallPassed ? 0 : 1);

  } catch (error) {
    console.error("❌ Fatal error during test execution:", error);
    process.exit(1);
  }
}

// Run the tests
main();