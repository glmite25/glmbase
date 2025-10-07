/**
 * Configure Superuser Role Assignment
 * Creates or updates user_roles record with 'superuser' role for ojidelawrence@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import { createServiceRoleClient, verifyAuthUsersRecord, verifyUserRolesRecord } from './superadmin-verification-functions.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';

class SuperuserRoleConfigurator {
    constructor() {
        this.supabase = createServiceRoleClient();
        this.issues = [];
        this.successes = [];
    }

    log(type, message, details = null) {
        const entry = { message, details, timestamp: new Date().toISOString() };

        switch (type) {
            case 'error':
                this.issues.push(entry);
                console.error(`❌ ${message}`, details ? details : '');
                break;
            case 'success':
                this.successes.push(entry);
                console.log(`✅ ${message}`, details ? details : '');
                break;
            default:
                console.log(`ℹ️  ${message}`, details ? details : '');
        }
    }

    async getSuperadminUserId() {
        console.log('\n🔍 Getting superadmin user ID...');
        
        // First try the verification function
        const authCheck = await verifyAuthUsersRecord(this.supabase);
        
        if (authCheck.exists && authCheck.user) {
            const userId = authCheck.user.id;
            this.log('success', `Found superadmin user ID from auth.users: ${userId}`);
            return userId;
        }

        // If auth.users check failed, try to get user ID from profiles table
        console.log('Auth.users check failed, trying profiles table...');
        
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('email', SUPERADMIN_EMAIL)
                .single();

            if (error) {
                this.log('error', 'Failed to get user ID from profiles table', error.message);
                return null;
            }

            if (profile && profile.id) {
                this.log('success', `Found superadmin user ID from profiles: ${profile.id}`);
                return profile.id;
            }
        } catch (err) {
            this.log('error', 'Exception getting user ID from profiles', err.message);
        }

        // Try members table as last resort
        console.log('Profiles check failed, trying members table...');
        
        try {
            const { data: member, error } = await this.supabase
                .from('members')
                .select('user_id')
                .eq('email', SUPERADMIN_EMAIL)
                .single();

            if (error) {
                this.log('error', 'Failed to get user ID from members table', error.message);
                return null;
            }

            if (member && member.user_id) {
                this.log('success', `Found superadmin user ID from members: ${member.user_id}`);
                return member.user_id;
            }
        } catch (err) {
            this.log('error', 'Exception getting user ID from members', err.message);
        }

        this.log('error', 'Cannot find superadmin user ID in any table');
        return null;
    }

    async checkCurrentRoleAssignment(userId) {
        console.log('\n🔍 Checking current role assignment...');
        
        const rolesCheck = await verifyUserRolesRecord(userId, this.supabase);
        
        if (!rolesCheck.exists) {
            this.log('error', 'No user_roles records found for superadmin');
            return { hasRoles: false, hasSuperuser: false, roles: [] };
        }

        const hasSuperuser = rolesCheck.hasSuperuserRole;
        const roles = rolesCheck.userRoles;

        if (hasSuperuser) {
            this.log('success', 'Superuser role already exists');
        } else {
            this.log('error', 'Superuser role not found in user_roles');
        }

        console.log(`Current roles: ${roles.map(r => r.role).join(', ')}`);

        return {
            hasRoles: true,
            hasSuperuser: hasSuperuser,
            roles: roles
        };
    }

    async createSuperuserRole(userId) {
        console.log('\n🔧 Creating superuser role assignment...');

        try {
            const { data, error } = await this.supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'superuser',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                this.log('error', 'Failed to create superuser role', error.message);
                return false;
            }

            this.log('success', 'Successfully created superuser role assignment');
            console.log('Role details:', data);
            return true;
        } catch (err) {
            this.log('error', 'Exception creating superuser role', err.message);
            return false;
        }
    }

    async updateExistingRole(userId, roleId) {
        console.log('\n🔧 Updating existing role to superuser...');

        try {
            const { data, error } = await this.supabase
                .from('user_roles')
                .update({
                    role: 'superuser',
                    updated_at: new Date().toISOString()
                })
                .eq('id', roleId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                this.log('error', 'Failed to update role to superuser', error.message);
                return false;
            }

            this.log('success', 'Successfully updated role to superuser');
            console.log('Updated role details:', data);
            return true;
        } catch (err) {
            this.log('error', 'Exception updating role', err.message);
            return false;
        }
    }

    async ensureRoleHierarchy(userId) {
        console.log('\n🔍 Ensuring proper role hierarchy...');

        try {
            // Get all current roles
            const { data: currentRoles, error } = await this.supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                this.log('error', 'Failed to query current roles', error.message);
                return false;
            }

            const superuserRole = currentRoles.find(r => r.role === 'superuser');
            if (!superuserRole) {
                this.log('error', 'Superuser role not found after configuration');
                return false;
            }

            // Check for conflicting or redundant roles
            const otherRoles = currentRoles.filter(r => r.role !== 'superuser');
            
            if (otherRoles.length > 0) {
                console.log(`Found ${otherRoles.length} other roles:`, otherRoles.map(r => r.role));
                
                // For superuser, we typically want to keep it as the primary role
                // but we can keep other roles for specific permissions if needed
                this.log('success', 'Role hierarchy verified - superuser role is primary');
            } else {
                this.log('success', 'Clean role assignment - only superuser role exists');
            }

            return true;
        } catch (err) {
            this.log('error', 'Exception checking role hierarchy', err.message);
            return false;
        }
    }

    async verifyRoleAssignment(userId) {
        console.log('\n✅ Verifying role assignment...');

        const rolesCheck = await verifyUserRolesRecord(userId, this.supabase);
        
        if (!rolesCheck.exists) {
            this.log('error', 'Verification failed: No user_roles records found');
            return false;
        }

        if (!rolesCheck.hasSuperuserRole) {
            this.log('error', 'Verification failed: Superuser role not found');
            return false;
        }

        if (rolesCheck.issues.length > 0) {
            this.log('error', 'Verification found issues', rolesCheck.issues.join(', '));
            return false;
        }

        this.log('success', 'Role assignment verification passed');
        
        // Display final role configuration
        console.log('\nFinal role configuration:');
        rolesCheck.userRoles.forEach(role => {
            console.log(`  - Role: ${role.role} (ID: ${role.id})`);
            console.log(`    Created: ${role.created_at}`);
            if (role.updated_at) {
                console.log(`    Updated: ${role.updated_at}`);
            }
        });

        return true;
    }

    async configureSuperuserRole() {
        console.log('🚀 Starting superuser role configuration...');
        console.log(`📧 Target email: ${SUPERADMIN_EMAIL}`);

        // Step 1: Get superadmin user ID
        const userId = await this.getSuperadminUserId();
        if (!userId) {
            console.log('\n❌ Cannot proceed without valid user ID');
            return false;
        }

        // Step 2: Check current role assignment
        const currentRoles = await this.checkCurrentRoleAssignment(userId);
        
        // Step 3: Configure superuser role
        let roleConfigured = false;

        if (currentRoles.hasSuperuser) {
            this.log('success', 'Superuser role already properly configured');
            roleConfigured = true;
        } else if (currentRoles.hasRoles) {
            // Update existing role or add new one
            const nonSuperuserRoles = currentRoles.roles.filter(r => r.role !== 'superuser');
            
            if (nonSuperuserRoles.length > 0) {
                // Update the first non-superuser role to superuser
                const roleToUpdate = nonSuperuserRoles[0];
                roleConfigured = await this.updateExistingRole(userId, roleToUpdate.id);
            } else {
                // This shouldn't happen, but create new role if needed
                roleConfigured = await this.createSuperuserRole(userId);
            }
        } else {
            // No roles exist, create new superuser role
            roleConfigured = await this.createSuperuserRole(userId);
        }

        if (!roleConfigured) {
            console.log('\n❌ Failed to configure superuser role');
            return false;
        }

        // Step 4: Ensure proper role hierarchy
        const hierarchyOk = await this.ensureRoleHierarchy(userId);
        if (!hierarchyOk) {
            console.log('\n⚠️  Role configured but hierarchy issues detected');
        }

        // Step 5: Verify final configuration
        const verificationPassed = await this.verifyRoleAssignment(userId);
        
        if (verificationPassed) {
            console.log('\n🎉 Superuser role configuration completed successfully!');
            return true;
        } else {
            console.log('\n❌ Role configuration verification failed');
            return false;
        }
    }

    generateSummary() {
        console.log('\n📊 CONFIGURATION SUMMARY:');
        console.log(`✅ Successes: ${this.successes.length}`);
        console.log(`❌ Issues: ${this.issues.length}`);

        if (this.issues.length > 0) {
            console.log('\n❌ Issues encountered:');
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.message}`);
                if (issue.details) {
                    console.log(`   Details: ${issue.details}`);
                }
            });
        }

        if (this.successes.length > 0) {
            console.log('\n✅ Successful operations:');
            this.successes.forEach((success, index) => {
                console.log(`${index + 1}. ${success.message}`);
            });
        }
    }
}

// Run configuration if called directly
async function main() {
    try {
        console.log('Starting superuser role configuration...');
        const configurator = new SuperuserRoleConfigurator();
        const success = await configurator.configureSuperuserRole();
        configurator.generateSummary();
        
        if (success) {
            console.log('\n🏁 Configuration completed successfully');
            process.exit(0);
        } else {
            console.log('\n💥 Configuration failed');
            process.exit(1);
        }
    } catch (err) {
        console.error('💥 Configuration failed with exception:', err);
        process.exit(1);
    }
}

// Check if this is the main module
if (process.argv[1] && process.argv[1].endsWith('configure-superuser-role.js')) {
    main();
}

export default SuperuserRoleConfigurator;