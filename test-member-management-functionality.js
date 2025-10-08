#!/usr/bin/env node

/**
 * Test script for Task 7.3: Test member management functionality
 * 
 * This script tests:
 * - All CRUD operations work correctly
 * - Member search, filtering, and pagination
 * - Pastor assignment and church unit management
 * - Advanced search functionality
 * - Complex filtering scenarios
 * - Enhanced pagination features
 * 
 * Requirements: 6.2, 6.4
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

// Use service role key for admin operations if available, otherwise use anon key
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create admin client for CRUD operations that require elevated permissions
const adminSupabase = supabaseServiceRoleKey ? 
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) : supabase;

// Test result structure:
// {
//   testName: string,
//   passed: boolean,
//   message: string,
//   details?: any,
//   error?: string
// }

/**
 * Test 1: Verify all CRUD operations work correctly
 */
async function testMemberCRUDOperations() {
  try {
    console.log("🔍 Testing CRUD operations...");
    
    const testResults = {
      create: false,
      read: false,
      update: false,
      delete: false
    };

    // Test READ operation
    const { data: readMembers, error: readError } = await supabase
      .from("members")
      .select("*")
      .limit(5);

    if (readError) {
      return {
        testName: "Member CRUD Operations - Read",
        passed: false,
        message: "Cannot read members from database",
        error: readError.message
      };
    }

    testResults.read = true;
    console.log(`  ✅ READ: Found ${readMembers?.length || 0} members`);

    // Test CREATE operation
    const testMemberData = {
      email: `test-member-${Date.now()}@example.com`,
      fullname: "Test Member CRUD",
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
      return {
        testName: "Member CRUD Operations - Create",
        passed: false,
        message: "Cannot create new member",
        error: createError.message,
        details: { testResults }
      };
    }

    testResults.create = true;
    const testMemberId = createdMember.id;
    console.log(`  ✅ CREATE: Created member with ID ${testMemberId}`);

    // Test UPDATE operation
    const updateData = {
      fullname: "Updated Test Member CRUD",
      phone: "+1234567890",
      address: "Test Address for CRUD"
    };

    const { data: updatedMember, error: updateError } = await adminSupabase
      .from("members")
      .update(updateData)
      .eq("id", testMemberId)
      .select()
      .single();

    if (updateError) {
      await adminSupabase.from("members").delete().eq("id", testMemberId);
      return {
        testName: "Member CRUD Operations - Update",
        passed: false,
        message: "Cannot update member",
        error: updateError.message,
        details: { testResults }
      };
    }

    testResults.update = true;
    console.log(`  ✅ UPDATE: Updated member name to "${updatedMember.fullname}"`);

    // Test DELETE operation
    const { error: deleteError } = await adminSupabase
      .from("members")
      .delete()
      .eq("id", testMemberId);

    if (deleteError) {
      return {
        testName: "Member CRUD Operations - Delete",
        passed: false,
        message: "Cannot delete member",
        error: deleteError.message,
        details: { testResults }
      };
    }

    testResults.delete = true;
    console.log(`  ✅ DELETE: Successfully deleted test member`);

    return {
      testName: "Member CRUD Operations Validation",
      passed: true,
      message: "All CRUD operations work correctly",
      details: {
        testResults,
        operationsCompleted: Object.values(testResults).filter(Boolean).length
      }
    };
  } catch (error) {
    return {
      testName: "Member CRUD Operations Validation",
      passed: false,
      message: "Error testing CRUD operations",
      error: String(error)
    };
  }
}

/**
 * Test 2: Test member search, filtering, and pagination
 */
async function testMemberSearchAndFiltering() {
  try {
    console.log("🔍 Testing search, filtering, and pagination...");
    
    const searchTests = {
      basicSearch: false,
      emailFilter: false,
      categoryFilter: false,
      activeFilter: false,
      pagination: false,
      sorting: false
    };

    // Test basic search functionality
    const { data: allMembers, error: allMembersError } = await supabase
      .from("members")
      .select("*")
      .limit(10);

    if (allMembersError) {
      return {
        testName: "Member Search and Filtering - Basic Query",
        passed: false,
        message: "Cannot perform basic member query",
        error: allMembersError.message
      };
    }

    searchTests.basicSearch = true;
    console.log(`  ✅ Basic Search: Retrieved ${allMembers?.length || 0} members`);

    if (!allMembers || allMembers.length === 0) {
      return {
        testName: "Member Search and Filtering - Data Availability",
        passed: false,
        message: "No members found to test search and filtering"
      };
    }

    // Test email filtering
    const sampleEmail = allMembers[0]?.email;
    if (sampleEmail) {
      const { data: emailFiltered, error: emailFilterError } = await supabase
        .from("members")
        .select("*")
        .ilike("email", `%${sampleEmail.split('@')[0]}%`);

      if (emailFilterError) {
        return {
          testName: "Member Search and Filtering - Email Filter",
          passed: false,
          message: "Cannot filter members by email",
          error: emailFilterError.message
        };
      }

      searchTests.emailFilter = true;
      console.log(`  ✅ Email Filter: Found ${emailFiltered?.length || 0} matches`);
    }

    // Test category filtering
    const { data: categoryFilteredMembers, error: categoryFilterError } = await supabase
      .from("members")
      .select("*")
      .eq("category", "Members")
      .limit(5);

    if (categoryFilterError) {
      return {
        testName: "Member Search and Filtering - Category Filter",
        passed: false,
        message: "Cannot filter members by category",
        error: categoryFilterError.message
      };
    }

    searchTests.categoryFilter = true;
    console.log(`  ✅ Category Filter: Found ${categoryFilteredMembers?.length || 0} members`);

    // Test active status filtering
    const { data: activeFilteredMembers, error: activeFilterError } = await supabase
      .from("members")
      .select("*")
      .eq("isactive", true)
      .limit(5);

    if (activeFilterError) {
      return {
        testName: "Member Search and Filtering - Active Filter",
        passed: false,
        message: "Cannot filter members by active status",
        error: activeFilterError.message
      };
    }

    searchTests.activeFilter = true;
    console.log(`  ✅ Active Filter: Found ${activeFilteredMembers?.length || 0} active members`);

    // Test pagination
    const { data: firstPage, error: firstPageError } = await supabase
      .from("members")
      .select("*")
      .range(0, 4);

    if (firstPageError) {
      return {
        testName: "Member Search and Filtering - Pagination",
        passed: false,
        message: "Cannot paginate member results",
        error: firstPageError.message
      };
    }

    const { data: secondPage, error: secondPageError } = await supabase
      .from("members")
      .select("*")
      .range(5, 9);

    if (secondPageError) {
      return {
        testName: "Member Search and Filtering - Pagination",
        passed: false,
        message: "Cannot paginate member results (second page)",
        error: secondPageError.message
      };
    }

    searchTests.pagination = true;
    console.log(`  ✅ Pagination: Page 1 (${firstPage?.length || 0}), Page 2 (${secondPage?.length || 0})`);

    // Test sorting
    const { data: sortedMembers, error: sortError } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (sortError) {
      return {
        testName: "Member Search and Filtering - Sorting",
        passed: false,
        message: "Cannot sort member results",
        error: sortError.message
      };
    }

    searchTests.sorting = true;
    console.log(`  ✅ Sorting: Retrieved ${sortedMembers?.length || 0} sorted members`);

    return {
      testName: "Member Search and Filtering Validation",
      passed: true,
      message: "All search and filtering operations work correctly",
      details: {
        searchTests,
        totalMembers: allMembers.length,
        categoryFilteredCount: categoryFilteredMembers?.length || 0,
        activeFilteredCount: activeFilteredMembers?.length || 0
      }
    };
  } catch (error) {
    return {
      testName: "Member Search and Filtering Validation",
      passed: false,
      message: "Error testing search and filtering",
      error: String(error)
    };
  }
}

/**
 * Test 3: Validate pastor assignment and church unit management
 */
async function testPastorAssignmentAndChurchUnits() {
  try {
    console.log("🔍 Testing pastor assignments and church unit management...");
    
    const assignmentTests = {
      pastorAssignment: false,
      churchUnitAssignment: false,
      multipleChurchUnits: false,
      assignmentValidation: false
    };

    // Test pastor assignment functionality
    const { data: pastors, error: pastorsError } = await supabase
      .from("members")
      .select("*")
      .eq("category", "Pastors")
      .limit(5);

    if (pastorsError) {
      return {
        testName: "Pastor Assignment - Pastor Query",
        passed: false,
        message: "Cannot query pastors for assignment testing",
        error: pastorsError.message
      };
    }

    console.log(`  ✅ Pastor Query: Found ${pastors?.length || 0} pastors`);

    // Test members with pastor assignments
    const { data: membersWithPastors, error: assignedMembersError } = await supabase
      .from("members")
      .select("*")
      .not("assignedto", "is", null)
      .limit(10);

    if (assignedMembersError) {
      return {
        testName: "Pastor Assignment - Assigned Members Query",
        passed: false,
        message: "Cannot query members with pastor assignments",
        error: assignedMembersError.message
      };
    }

    assignmentTests.pastorAssignment = true;
    console.log(`  ✅ Pastor Assignments: Found ${membersWithPastors?.length || 0} assigned members`);

    // Test church unit assignments
    const { data: membersWithChurchUnits, error: churchUnitsError } = await supabase
      .from("members")
      .select("*")
      .not("churchunit", "is", null)
      .limit(10);

    if (churchUnitsError) {
      return {
        testName: "Church Unit Assignment - Church Unit Query",
        passed: false,
        message: "Cannot query members with church unit assignments",
        error: churchUnitsError.message
      };
    }

    assignmentTests.churchUnitAssignment = true;
    console.log(`  ✅ Church Units: Found ${membersWithChurchUnits?.length || 0} members with church units`);

    // Test multiple church units (array field)
    const { data: membersWithMultipleUnits, error: multipleUnitsError } = await supabase
      .from("members")
      .select("*")
      .not("churchunits", "is", null)
      .limit(10);

    if (multipleUnitsError) {
      return {
        testName: "Church Unit Assignment - Multiple Units Query",
        passed: false,
        message: "Cannot query members with multiple church units",
        error: multipleUnitsError.message
      };
    }

    assignmentTests.multipleChurchUnits = true;
    console.log(`  ✅ Multiple Church Units: Found ${membersWithMultipleUnits?.length || 0} members with multiple units`);

    // Validate assignment integrity
    const assignmentIssues = [];

    for (const member of membersWithPastors || []) {
      if (member.assignedto) {
        const { data: assignedPastor, error: pastorCheckError } = await supabase
          .from("members")
          .select("id, fullname, category")
          .eq("id", member.assignedto)
          .maybeSingle();

        if (pastorCheckError) {
          assignmentIssues.push({
            memberId: member.id,
            memberName: member.fullname,
            assignedPastorId: member.assignedto,
            issue: "Error checking assigned pastor",
            error: pastorCheckError.message
          });
        } else if (!assignedPastor) {
          assignmentIssues.push({
            memberId: member.id,
            memberName: member.fullname,
            assignedPastorId: member.assignedto,
            issue: "Assigned pastor does not exist"
          });
        } else if (assignedPastor.category !== "Pastors") {
          assignmentIssues.push({
            memberId: member.id,
            memberName: member.fullname,
            assignedPastorId: member.assignedto,
            assignedPastorName: assignedPastor.fullname,
            assignedPastorCategory: assignedPastor.category,
            issue: "Assigned person is not categorized as a Pastor"
          });
        }
      }
    }

    assignmentTests.assignmentValidation = assignmentIssues.length === 0;
    
    if (assignmentIssues.length === 0) {
      console.log(`  ✅ Assignment Validation: All assignments are valid`);
    } else {
      console.log(`  ⚠️  Assignment Validation: Found ${assignmentIssues.length} issues`);
    }

    return {
      testName: "Pastor Assignment and Church Unit Management Validation",
      passed: assignmentIssues.length === 0,
      message: assignmentIssues.length === 0 ?
        "Pastor assignments and church unit management work correctly" :
        `Found ${assignmentIssues.length} assignment issues`,
      details: {
        assignmentTests,
        pastorsCount: pastors?.length || 0,
        membersWithPastorsCount: membersWithPastors?.length || 0,
        membersWithChurchUnitsCount: membersWithChurchUnits?.length || 0,
        membersWithMultipleUnitsCount: membersWithMultipleUnits?.length || 0,
        assignmentIssues: assignmentIssues.slice(0, 5),
        assignmentIssuesCount: assignmentIssues.length
      }
    };
  } catch (error) {
    return {
      testName: "Pastor Assignment and Church Unit Management Validation",
      passed: false,
      message: "Error testing pastor assignments and church unit management",
      error: String(error)
    };
  }
}

/**
 * Test 4: Advanced search functionality
 */
async function testAdvancedSearchFunctionality() {
  try {
    console.log("🔍 Testing advanced search functionality...");
    
    const advancedTests = {
      nameSearch: false,
      phoneSearch: false,
      combinedSearch: false,
      caseInsensitiveSearch: false
    };

    // Get sample data for testing
    const { data: sampleMembers, error: sampleError } = await supabase
      .from("members")
      .select("*")
      .limit(10);

    if (sampleError || !sampleMembers || sampleMembers.length === 0) {
      return {
        testName: "Advanced Search - Sample Data",
        passed: false,
        message: "Cannot get sample data for advanced search testing",
        error: sampleError?.message
      };
    }

    // Test name search (partial match)
    const sampleName = sampleMembers[0]?.fullname;
    if (sampleName && sampleName.length > 3) {
      const nameSearchTerm = sampleName.substring(0, 3);
      const { data: nameSearchResults, error: nameSearchError } = await supabase
        .from("members")
        .select("*")
        .ilike("fullname", `%${nameSearchTerm}%`);

      if (nameSearchError) {
        return {
          testName: "Advanced Search - Name Search",
          passed: false,
          message: "Cannot perform name-based search",
          error: nameSearchError.message
        };
      }

      advancedTests.nameSearch = true;
      console.log(`  ✅ Name Search: Found ${nameSearchResults?.length || 0} matches for "${nameSearchTerm}"`);
    }

    // Test phone search
    const memberWithPhone = sampleMembers.find(m => m.phone);
    if (memberWithPhone?.phone) {
      const phoneDigits = memberWithPhone.phone.replace(/\D/g, '').substring(0, 4);
      const { data: phoneSearchResults, error: phoneSearchError } = await supabase
        .from("members")
        .select("*")
        .ilike("phone", `%${phoneDigits}%`);

      if (phoneSearchError) {
        return {
          testName: "Advanced Search - Phone Search",
          passed: false,
          message: "Cannot perform phone-based search",
          error: phoneSearchError.message
        };
      }

      advancedTests.phoneSearch = true;
      console.log(`  ✅ Phone Search: Found ${phoneSearchResults?.length || 0} matches`);
    }

    // Test combined search (multiple fields)
    const { data: combinedSearchResults, error: combinedSearchError } = await supabase
      .from("members")
      .select("*")
      .or(`fullname.ilike.%test%,email.ilike.%test%,phone.ilike.%test%`);

    if (combinedSearchError) {
      return {
        testName: "Advanced Search - Combined Search",
        passed: false,
        message: "Cannot perform combined field search",
        error: combinedSearchError.message
      };
    }

    advancedTests.combinedSearch = true;
    console.log(`  ✅ Combined Search: Found ${combinedSearchResults?.length || 0} matches`);

    // Test case insensitive search
    if (sampleName) {
      const upperCaseName = sampleName.toUpperCase().substring(0, 3);
      const { data: caseInsensitiveResults, error: caseInsensitiveError } = await supabase
        .from("members")
        .select("*")
        .ilike("fullname", `%${upperCaseName}%`);

      if (caseInsensitiveError) {
        return {
          testName: "Advanced Search - Case Insensitive",
          passed: false,
          message: "Cannot perform case insensitive search",
          error: caseInsensitiveError.message
        };
      }

      advancedTests.caseInsensitiveSearch = true;
      console.log(`  ✅ Case Insensitive Search: Found ${caseInsensitiveResults?.length || 0} matches`);
    }

    return {
      testName: "Advanced Search Functionality Validation",
      passed: true,
      message: "Advanced search functionality works correctly",
      details: {
        advancedTests,
        sampleDataCount: sampleMembers.length,
        testCoverage: Object.values(advancedTests).filter(Boolean).length
      }
    };
  } catch (error) {
    return {
      testName: "Advanced Search Functionality Validation",
      passed: false,
      message: "Error testing advanced search functionality",
      error: String(error)
    };
  }
}

/**
 * Main function to execute all member management tests
 */
async function executeMemberManagementTests() {
  console.log("=== EXECUTING MEMBER MANAGEMENT FUNCTIONALITY TESTS ===");
  console.log("Testing Requirements 6.2 and 6.4 from the database consolidation spec\n");

  const startTime = new Date();
  const tests = [];

  // Execute all tests
  tests.push(await testMemberCRUDOperations());
  tests.push(await testMemberSearchAndFiltering());
  tests.push(await testPastorAssignmentAndChurchUnits());
  tests.push(await testAdvancedSearchFunctionality());

  // Calculate summary
  const passedTests = tests.filter(test => test.passed).length;
  const failedTests = tests.length - passedTests;
  const overallPassed = failedTests === 0;

  const report = {
    timestamp: startTime.toISOString(),
    overallPassed,
    totalTests: tests.length,
    passedTests,
    failedTests,
    tests
  };

  console.log("\n=== MEMBER MANAGEMENT FUNCTIONALITY TESTS COMPLETE ===");
  console.log(`Overall Result: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Tests: ${passedTests}/${tests.length} passed`);

  if (failedTests > 0) {
    console.log("\n❌ Failed Tests:");
    tests.filter(test => !test.passed).forEach(test => {
      console.log(`- ${test.testName}: ${test.message}`);
      if (test.error) console.log(`  Error: ${test.error}`);
    });
  } else {
    console.log("\n✅ All member management functionality tests passed!");
    console.log("- CRUD operations work correctly");
    console.log("- Search, filtering, and pagination work correctly");
    console.log("- Pastor assignment and church unit management work correctly");
    console.log("- Advanced search functionality works correctly");
  }

  // Save detailed report
  const fs = await import('fs');
  const reportPath = `member-management-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return report;
}

// Run the tests
executeMemberManagementTests()
  .then(report => {
    process.exit(report.overallPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error running member management tests:', error);
    process.exit(1);
  });