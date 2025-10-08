import { supabase } from "@/integrations/supabase/client";
import { adminSupabase } from "@/integrations/supabase/adminClient";

export interface MemberTestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  error?: string;
}

export interface MemberTestReport {
  timestamp: string;
  overallPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  tests: MemberTestResult[];
}

/**
 * Test 1: Verify all CRUD operations work correctly
 */
export const testMemberCRUDOperations = async (): Promise<MemberTestResult> => {
  try {
    const testResults = {
      create: false,
      read: false,
      update: false,
      delete: false
    };

    // Test READ operation
    const { data: existingMembers, error: readError } = await supabase
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

    // Test CREATE operation (we'll create a test member)
    const testMemberData = {
      email: `test-member-${Date.now()}@example.com`,
      fullname: "Test Member",
      category: "Members" as const,
      isactive: true,
      role: "user" as const,
      joindate: new Date().toISOString().split('T')[0]
    };

    const { data: createdMember, error: createError } = await supabase
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

    // Test UPDATE operation
    const updateData = {
      fullname: "Updated Test Member",
      phone: "+1234567890",
      address: "Test Address"
    };

    const { data: updatedMember, error: updateError } = await supabase
      .from("members")
      .update(updateData)
      .eq("id", testMemberId)
      .select()
      .single();

    if (updateError) {
      // Clean up created member before returning error
      await supabase.from("members").delete().eq("id", testMemberId);
      
      return {
        testName: "Member CRUD Operations - Update",
        passed: false,
        message: "Cannot update member",
        error: updateError.message,
        details: { testResults }
      };
    }

    testResults.update = true;

    // Verify update worked
    if (updatedMember.fullname !== updateData.fullname || 
        updatedMember.phone !== updateData.phone) {
      // Clean up created member before returning error
      await supabase.from("members").delete().eq("id", testMemberId);
      
      return {
        testName: "Member CRUD Operations - Update Verification",
        passed: false,
        message: "Member update did not persist correctly",
        details: { 
          testResults,
          expected: updateData,
          actual: {
            fullname: updatedMember.fullname,
            phone: updatedMember.phone,
            address: updatedMember.address
          }
        }
      };
    }

    // Test DELETE operation
    const { error: deleteError } = await supabase
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

    // Verify deletion worked
    const { data: deletedMember, error: verifyDeleteError } = await supabase
      .from("members")
      .select("*")
      .eq("id", testMemberId)
      .maybeSingle();

    if (verifyDeleteError) {
      return {
        testName: "Member CRUD Operations - Delete Verification",
        passed: false,
        message: "Error verifying member deletion",
        error: verifyDeleteError.message,
        details: { testResults }
      };
    }

    if (deletedMember) {
      return {
        testName: "Member CRUD Operations - Delete Verification",
        passed: false,
        message: "Member was not actually deleted",
        details: { testResults, deletedMember }
      };
    }

    return {
      testName: "Member CRUD Operations Validation",
      passed: true,
      message: "All CRUD operations work correctly",
      details: {
        testResults,
        operationsCompleted: Object.values(testResults).filter(Boolean).length,
        testMemberCreated: testMemberData,
        testMemberUpdated: updateData
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
};

/**
 * Test 2: Test member search, filtering, and pagination
 */
export const testMemberSearchAndFiltering = async (): Promise<MemberTestResult> => {
  try {
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
      const { data: emailFilteredMembers, error: emailFilterError } = await supabase
        .from("members")
        .select("*")
        .ilike("email", `%${sampleEmail.split('@')[0]}%`);

      if (emailFilterError) {
        return {
          testName: "Member Search and Filtering - Email Filter",
          passed: false,
          message: "Cannot filter members by email",
          error: emailFilterError.message,
          details: { searchTests }
        };
      }

      searchTests.emailFilter = true;
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
        error: categoryFilterError.message,
        details: { searchTests }
      };
    }

    searchTests.categoryFilter = true;

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
        error: activeFilterError.message,
        details: { searchTests }
      };
    }

    searchTests.activeFilter = true;

    // Test pagination
    const { data: firstPage, error: firstPageError } = await supabase
      .from("members")
      .select("*")
      .range(0, 4); // First 5 records

    if (firstPageError) {
      return {
        testName: "Member Search and Filtering - Pagination",
        passed: false,
        message: "Cannot paginate member results",
        error: firstPageError.message,
        details: { searchTests }
      };
    }

    const { data: secondPage, error: secondPageError } = await supabase
      .from("members")
      .select("*")
      .range(5, 9); // Next 5 records

    if (secondPageError) {
      return {
        testName: "Member Search and Filtering - Pagination",
        passed: false,
        message: "Cannot paginate member results (second page)",
        error: secondPageError.message,
        details: { searchTests }
      };
    }

    searchTests.pagination = true;

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
        error: sortError.message,
        details: { searchTests }
      };
    }

    searchTests.sorting = true;

    return {
      testName: "Member Search and Filtering Validation",
      passed: true,
      message: "All search and filtering operations work correctly",
      details: {
        searchTests,
        totalMembers: allMembers.length,
        categoryFilteredCount: categoryFilteredMembers?.length || 0,
        activeFilteredCount: activeFilteredMembers?.length || 0,
        firstPageCount: firstPage?.length || 0,
        secondPageCount: secondPage?.length || 0,
        sortedMembersCount: sortedMembers?.length || 0
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
};

/**
 * Test 3: Validate pastor assignment and church unit management
 */
export const testPastorAssignmentAndChurchUnits = async (): Promise<MemberTestResult> => {
  try {
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
        error: assignedMembersError.message,
        details: { assignmentTests }
      };
    }

    assignmentTests.pastorAssignment = true;

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
        error: churchUnitsError.message,
        details: { assignmentTests }
      };
    }

    assignmentTests.churchUnitAssignment = true;

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
        error: multipleUnitsError.message,
        details: { assignmentTests }
      };
    }

    assignmentTests.multipleChurchUnits = true;

    // Validate assignment integrity
    const assignmentIssues = [];

    // Check if assigned pastors actually exist
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
        assignmentIssues: assignmentIssues.slice(0, 10), // First 10 for debugging
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
};

/**
 * Test 4: Test member categories and roles
 */
export const testMemberCategoriesAndRoles = async (): Promise<MemberTestResult> => {
  try {
    // Test different member categories
    const categories = ["Members", "Pastors", "Workers", "Visitors", "Partners"];
    const categoryResults = {};

    for (const category of categories) {
      const { data: categoryMembers, error: categoryError } = await supabase
        .from("members")
        .select("*")
        .eq("category", category)
        .limit(5);

      if (categoryError) {
        return {
          testName: `Member Categories - ${category} Query`,
          passed: false,
          message: `Cannot query members with category ${category}`,
          error: categoryError.message
        };
      }

      categoryResults[category] = categoryMembers?.length || 0;
    }

    // Test different roles
    const roles = ["user", "admin", "superuser"];
    const roleResults = {};

    for (const role of roles) {
      const { data: roleMembers, error: roleError } = await supabase
        .from("members")
        .select("*")
        .eq("role", role)
        .limit(5);

      if (roleError) {
        return {
          testName: `Member Roles - ${role} Query`,
          passed: false,
          message: `Cannot query members with role ${role}`,
          error: roleError.message
        };
      }

      roleResults[role] = roleMembers?.length || 0;
    }

    // Test active/inactive status
    const { data: activeMembers, error: activeError } = await supabase
      .from("members")
      .select("*")
      .eq("isactive", true)
      .limit(5);

    if (activeError) {
      return {
        testName: "Member Status - Active Members Query",
        passed: false,
        message: "Cannot query active members",
        error: activeError.message
      };
    }

    const { data: inactiveMembers, error: inactiveError } = await supabase
      .from("members")
      .select("*")
      .eq("isactive", false)
      .limit(5);

    if (inactiveError) {
      return {
        testName: "Member Status - Inactive Members Query",
        passed: false,
        message: "Cannot query inactive members",
        error: inactiveError.message
      };
    }

    return {
      testName: "Member Categories and Roles Validation",
      passed: true,
      message: "Member categories and roles are working correctly",
      details: {
        categoryResults,
        roleResults,
        activeMembers: activeMembers?.length || 0,
        inactiveMembers: inactiveMembers?.length || 0,
        totalCategoriesTested: categories.length,
        totalRolesTested: roles.length
      }
    };
  } catch (error) {
    return {
      testName: "Member Categories and Roles Validation",
      passed: false,
      message: "Error testing member categories and roles",
      error: String(error)
    };
  }
};

/**
 * Main function to execute all member management tests
 */
export const executeMemberManagementTests = async (): Promise<MemberTestReport> => {
  console.log("=== EXECUTING MEMBER MANAGEMENT FUNCTIONALITY TESTS ===");
  
  const startTime = new Date();
  const tests: MemberTestResult[] = [];

  // Execute all tests
  tests.push(await testMemberCRUDOperations());
  tests.push(await testMemberSearchAndFiltering());
  tests.push(await testPastorAssignmentAndChurchUnits());
  tests.push(await testMemberCategoriesAndRoles());

  // Calculate summary
  const passedTests = tests.filter(test => test.passed).length;
  const failedTests = tests.length - passedTests;
  const overallPassed = failedTests === 0;

  const report: MemberTestReport = {
    timestamp: startTime.toISOString(),
    overallPassed,
    totalTests: tests.length,
    passedTests,
    failedTests,
    tests
  };

  console.log("=== MEMBER MANAGEMENT FUNCTIONALITY TESTS COMPLETE ===");
  console.log(`Overall Result: ${overallPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`Tests: ${passedTests}/${tests.length} passed`);
  
  return report;
};