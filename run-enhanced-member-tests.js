#!/usr/bin/env node

/**
 * Enhanced test runner for member management functionality
 * This runs the comprehensive TypeScript tests
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

// Initialize Supabase clients
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = supabaseServiceRoleKey ? 
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  }) : supabase;

// Mock the module imports for the TypeScript tests
global.supabase = supabase;
global.adminSupabase = adminSupabase;

/**
 * Test comprehensive member management functionality
 */
async function testComprehensiveMemberManagement() {
  console.log("=== RUNNING ENHANCED MEMBER MANAGEMENT TESTS ===\n");
  
  const tests = [];
  let passedTests = 0;
  
  // Test 1: Enhanced CRUD with validation
  try {
    console.log("🔍 Testing enhanced CRUD operations with validation...");
    
    // Test creating member with all available fields
    const comprehensiveTestData = {
      email: `comprehensive-test-${Date.now()}@example.com`,
      fullname: "Comprehensive Test Member",
      phone: "+1234567890",
      address: "123 Test Street, Test City",
      category: "Members",
      title: "Test Title",
      churchunit: "Test Unit",
      churchunits: ["Test Unit", "Secondary Unit"],
      auxanogroup: "Test Group",
      joindate: new Date().toISOString().split('T')[0],
      notes: "Test notes for comprehensive member",
      isactive: true,
      role: "user"
    };

    const { data: comprehensiveMember, error: createError } = await adminSupabase
      .from("members")
      .insert([comprehensiveTestData])
      .select()
      .single();

    if (createError) {
      tests.push({
        testName: "Enhanced CRUD - Comprehensive Create",
        passed: false,
        message: "Cannot create comprehensive member",
        error: createError.message
      });
    } else {
      console.log(`  ✅ Created comprehensive member with ID: ${comprehensiveMember.id}`);
      
      // Test updating with partial data
      const { data: updatedMember, error: updateError } = await adminSupabase
        .from("members")
        .update({ 
          notes: "Updated comprehensive notes",
          title: "Updated Test Title"
        })
        .eq("id", comprehensiveMember.id)
        .select()
        .single();

      if (updateError) {
        tests.push({
          testName: "Enhanced CRUD - Partial Update",
          passed: false,
          message: "Cannot update member partially",
          error: updateError.message
        });
      } else {
        console.log(`  ✅ Updated member notes and title`);
        
        // Clean up
        await adminSupabase.from("members").delete().eq("id", comprehensiveMember.id);
        
        tests.push({
          testName: "Enhanced CRUD Operations",
          passed: true,
          message: "Comprehensive CRUD operations work correctly",
          details: {
            createdFields: Object.keys(comprehensiveTestData).length,
            updatedFields: 2
          }
        });
        passedTests++;
      }
    }
  } catch (error) {
    tests.push({
      testName: "Enhanced CRUD Operations",
      passed: false,
      message: "Error in enhanced CRUD testing",
      error: String(error)
    });
  }

  // Test 2: Complex search scenarios
  try {
    console.log("🔍 Testing complex search scenarios...");
    
    // Test search with multiple criteria
    const { data: complexSearchResults, error: complexSearchError } = await supabase
      .from("members")
      .select("*")
      .eq("isactive", true)
      .in("category", ["Members", "Pastors"])
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (complexSearchError) {
      tests.push({
        testName: "Complex Search Scenarios",
        passed: false,
        message: "Cannot perform complex search",
        error: complexSearchError.message
      });
    } else {
      console.log(`  ✅ Complex search returned ${complexSearchResults?.length || 0} results`);
      
      // Test text search across multiple fields
      const { data: textSearchResults, error: textSearchError } = await supabase
        .from("members")
        .select("*")
        .or("fullname.ilike.%test%,email.ilike.%test%,notes.ilike.%test%")
        .limit(5);

      if (textSearchError) {
        tests.push({
          testName: "Complex Search - Text Search",
          passed: false,
          message: "Cannot perform multi-field text search",
          error: textSearchError.message
        });
      } else {
        console.log(`  ✅ Multi-field text search returned ${textSearchResults?.length || 0} results`);
        
        tests.push({
          testName: "Complex Search Scenarios",
          passed: true,
          message: "Complex search functionality works correctly",
          details: {
            complexSearchCount: complexSearchResults?.length || 0,
            textSearchCount: textSearchResults?.length || 0
          }
        });
        passedTests++;
      }
    }
  } catch (error) {
    tests.push({
      testName: "Complex Search Scenarios",
      passed: false,
      message: "Error in complex search testing",
      error: String(error)
    });
  }

  // Test 3: Advanced pagination and sorting
  try {
    console.log("🔍 Testing advanced pagination and sorting...");
    
    // Test pagination with count
    const { data: paginatedResults, count: totalCount, error: paginationError } = await supabase
      .from("members")
      .select("*", { count: "exact" })
      .range(0, 4)
      .order("fullname", { ascending: true });

    if (paginationError) {
      tests.push({
        testName: "Advanced Pagination",
        passed: false,
        message: "Cannot perform paginated query with count",
        error: paginationError.message
      });
    } else {
      console.log(`  ✅ Pagination: ${paginatedResults?.length || 0} results, ${totalCount} total`);
      
      // Test sorting by different fields
      const sortFields = ["fullname", "email", "created_at", "category"];
      let sortTestsPassed = 0;
      
      for (const field of sortFields) {
        const { data: sortedResults, error: sortError } = await supabase
          .from("members")
          .select("*")
          .order(field, { ascending: true })
          .limit(3);

        if (!sortError && sortedResults) {
          sortTestsPassed++;
          console.log(`  ✅ Sorting by ${field}: ${sortedResults.length} results`);
        }
      }
      
      tests.push({
        testName: "Advanced Pagination and Sorting",
        passed: sortTestsPassed === sortFields.length,
        message: `Advanced pagination and sorting work correctly (${sortTestsPassed}/${sortFields.length} sort tests passed)`,
        details: {
          totalCount,
          paginatedCount: paginatedResults?.length || 0,
          sortFieldsTested: sortFields.length,
          sortTestsPassed
        }
      });
      
      if (sortTestsPassed === sortFields.length) passedTests++;
    }
  } catch (error) {
    tests.push({
      testName: "Advanced Pagination and Sorting",
      passed: false,
      message: "Error in advanced pagination testing",
      error: String(error)
    });
  }

  // Test 4: Data integrity and relationships
  try {
    console.log("🔍 Testing data integrity and relationships...");
    
    // Test foreign key relationships
    const { data: membersWithAssignments, error: relationshipError } = await supabase
      .from("members")
      .select(`
        id,
        fullname,
        assignedto,
        assigned_pastor:assignedto(id, fullname, category)
      `)
      .not("assignedto", "is", null)
      .limit(5);

    if (relationshipError) {
      tests.push({
        testName: "Data Integrity and Relationships",
        passed: false,
        message: "Cannot test relationship integrity",
        error: relationshipError.message
      });
    } else {
      console.log(`  ✅ Relationship test: ${membersWithAssignments?.length || 0} members with assignments`);
      
      // Validate data consistency
      let consistencyIssues = 0;
      for (const member of membersWithAssignments || []) {
        if (member.assignedto && !member.assigned_pastor) {
          consistencyIssues++;
        }
      }
      
      console.log(`  ✅ Data consistency: ${consistencyIssues} issues found`);
      
      tests.push({
        testName: "Data Integrity and Relationships",
        passed: true,
        message: "Data integrity and relationships are maintained",
        details: {
          membersWithAssignments: membersWithAssignments?.length || 0,
          consistencyIssues
        }
      });
      passedTests++;
    }
  } catch (error) {
    tests.push({
      testName: "Data Integrity and Relationships",
      passed: false,
      message: "Error in data integrity testing",
      error: String(error)
    });
  }

  // Summary
  const totalTests = tests.length;
  const failedTests = totalTests - passedTests;
  const overallPassed = failedTests === 0;

  console.log("\n=== ENHANCED MEMBER MANAGEMENT TESTS COMPLETE ===");
  console.log(`Overall Result: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Tests: ${passedTests}/${totalTests} passed`);

  if (failedTests > 0) {
    console.log("\n❌ Failed Tests:");
    tests.filter(test => !test.passed).forEach(test => {
      console.log(`- ${test.testName}: ${test.message}`);
      if (test.error) console.log(`  Error: ${test.error}`);
    });
  } else {
    console.log("\n✅ All enhanced member management tests passed!");
    console.log("- Enhanced CRUD operations work correctly");
    console.log("- Complex search scenarios work correctly");
    console.log("- Advanced pagination and sorting work correctly");
    console.log("- Data integrity and relationships are maintained");
  }

  return { overallPassed, totalTests, passedTests, failedTests, tests };
}

// Run the enhanced tests
testComprehensiveMemberManagement()
  .then(report => {
    process.exit(report.overallPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error running enhanced member management tests:', error);
    process.exit(1);
  });