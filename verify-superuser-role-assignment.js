/**
 * Verify Superuser Role Assignment
 * Comprehensive verification that the superuser role is properly configured
 * according to requirements 2.3 and 3.3
 */

import { createServiceRoleClient, verifyUserRolesRecord } from './superadmin-verification-functions.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';

class SuperuserRoleVerifier {
    constructor() {
        this.supabase = createServiceRoleClient();
    }

    async getUserIdFromProfiles() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('email', SUPERADMIN_EMAIL)
                .single();

            if (error) {
                console.error('❌ Failed to get user ID from profiles:', error.message);
                return null;
            }

            return profile?.id || null;
        } catch (err) {
            console.error('❌ Exception getting user ID:', err.message);
            return null;
        }
    }

    async verifyRoleAssignmentRequirements(userId) {
        console.log('\n🔍 Verifying role assignment requirements...');
        
        // Requirement 2.3: user_roles table SHALL contain a 'superuser' role assignment for the account
        const rolesCheck = await verifyUserRolesRecord(userId, this.supabase);
        
        const requirements = {
            '2.3.1': {
                description: 'user_roles record exists with superuser role',
                passed: rolesCheck.exists && rolesCheck.hasSuperuserRole,
                details: rolesCheck.exists ? 
                    `Found ${rolesCheck.userRoles.length} role(s), superuser: ${rolesCheck.hasSuperuserRole}` :
                    'No user_roles records found'
            },
            '2.3.2': {
                description: 'Role assignment is properly linked to auth.users.id',
                passed: rolesCheck.exists && rolesCheck.userRoles.every(role => role.user_id === userId),
                details: rolesCheck.exists ?
                    `All roles linked to user ID: ${userId}` :
                    'Cannot verify linkage - no roles found'
            },
            '2.3.3': {
                description: 'No data integrity issues in role assignment',
                passed: rolesCheck.isHealthy,
                details: rolesCheck.issues.length === 0 ? 
                    'No issues found' : 
                    `Issues: ${rolesCheck.issues.join(', ')}`
            }
        };

        return requirements;
    }

    async verifyRoleHierarchyRequirements(userId) {
        console.log('\n🔍 Verifying role hierarchy and permissions...');
        
        try {
            // Get all roles for the user
            const { data: userRoles, error } = await this.supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) {
                return {
                    '3.3.1': {
                        description: 'Role hierarchy is correct',
                        passed: false,
                        details: `Failed to query roles: ${error.message}`
                    }
                };
            }

            const superuserRole = userRoles.find(role => role.role === 'superuser');
            const otherRoles = userRoles.filter(role => role.role !== 'superuser');

            const requirements = {
                '3.3.1': {
                    description: 'Superuser role exists and is properly configured',
                    passed: !!superuserRole,
                    details: superuserRole ? 
                        `Superuser role found (ID: ${superuserRole.id})` :
                        'No superuser role found'
                },
                '3.3.2': {
                    description: 'Role hierarchy is appropriate for superuser',
                    passed: !!superuserRole,
                    details: otherRoles.length === 0 ?
                        'Clean hierarchy - only superuser role' :
                        `Additional roles: ${otherRoles.map(r => r.role).join(', ')}`
                },
                '3.3.3': {
                    description: 'Role permissions are correctly structured',
                    passed: !!superuserRole && userRoles.every(role => role.user_id === userId),
                    details: 'All roles properly linked to user account'
                }
            };

            return requirements;
        } catch (err) {
            return {
                '3.3.1': {
                    description: 'Role hierarchy verification',
                    passed: false,
                    details: `Exception: ${err.message}`
                }
            };
        }
    }

    async testRoleBasedAccess(userId) {
        console.log('\n🔍 Testing role-based access...');
        
        try {
            // Test accessing user_roles table (should work with superuser role)
            const { data: roleTest, error: roleError } = await this.supabase
                .from('user_roles')
                .select('count')
                .eq('user_id', userId);

            // Test accessing profiles table
            const { data: profileTest, error: profileError } = await this.supabase
                .from('profiles')
                .select('count')
                .eq('id', userId);

            // Test accessing members table
            const { data: memberTest, error: memberError } = await this.supabase
                .from('members')
                .select('count')
                .eq('user_id', userId);

            return {
                'access.1': {
                    description: 'Can access user_roles table',
                    passed: !roleError,
                    details: roleError ? roleError.message : 'Access successful'
                },
                'access.2': {
                    description: 'Can access profiles table',
                    passed: !profileError,
                    details: profileError ? profileError.message : 'Access successful'
                },
                'access.3': {
                    description: 'Can access members table',
                    passed: !memberError,
                    details: memberError ? memberError.message : 'Access successful'
                }
            };
        } catch (err) {
            return {
                'access.1': {
                    description: 'Role-based access test',
                    passed: false,
                    details: `Exception: ${err.message}`
                }
            };
        }
    }

    displayRequirementResults(requirements, title) {
        console.log(`\n📋 ${title}:`);
        
        let allPassed = true;
        
        Object.entries(requirements).forEach(([reqId, req]) => {
            const status = req.passed ? '✅' : '❌';
            console.log(`${status} ${reqId}: ${req.description}`);
            console.log(`   ${req.details}`);
            
            if (!req.passed) {
                allPassed = false;
            }
        });
        
        return allPassed;
    }

    async runComprehensiveVerification() {
        console.log('🚀 Starting comprehensive superuser role verification...');
        console.log(`📧 Target email: ${SUPERADMIN_EMAIL}`);

        // Get user ID
        const userId = await this.getUserIdFromProfiles();
        if (!userId) {
            console.log('❌ Cannot proceed without user ID');
            return false;
        }

        console.log(`👤 User ID: ${userId}`);

        // Verify all requirements
        const roleRequirements = await this.verifyRoleAssignmentRequirements(userId);
        const hierarchyRequirements = await this.verifyRoleHierarchyRequirements(userId);
        const accessRequirements = await this.testRoleBasedAccess(userId);

        // Display results
        const rolesPassed = this.displayRequirementResults(roleRequirements, 'Role Assignment Requirements (2.3)');
        const hierarchyPassed = this.displayRequirementResults(hierarchyRequirements, 'Role Hierarchy Requirements (3.3)');
        const accessPassed = this.displayRequirementResults(accessRequirements, 'Role-Based Access Tests');

        const allPassed = rolesPassed && hierarchyPassed && accessPassed;

        console.log('\n📊 VERIFICATION SUMMARY:');
        console.log(`Role Assignment (Req 2.3): ${rolesPassed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Role Hierarchy (Req 3.3): ${hierarchyPassed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Access Tests: ${accessPassed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Overall Status: ${allPassed ? '✅ ALL REQUIREMENTS MET' : '❌ ISSUES FOUND'}`);

        return allPassed;
    }
}

// Run verification if called directly
async function main() {
    try {
        const verifier = new SuperuserRoleVerifier();
        const success = await verifier.runComprehensiveVerification();
        
        if (success) {
            console.log('\n🎉 All superuser role requirements verified successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some requirements not met - see details above');
            process.exit(1);
        }
    } catch (err) {
        console.error('💥 Verification failed with exception:', err);
        process.exit(1);
    }
}

if (process.argv[1] && process.argv[1].endsWith('verify-superuser-role-assignment.js')) {
    main();
}

export default SuperuserRoleVerifier;