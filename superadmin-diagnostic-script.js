/**
 * Superadmin Authentication Diagnostic Script
 * Identifies specific authentication issues for ojidelawrence@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

// Create service role client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';

class SuperadminDiagnostics {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.successes = [];
    }

    log(type, message, details = null) {
        const entry = { message, details, timestamp: new Date().toISOString() };

        switch (type) {
            case 'error':
                this.issues.push(entry);
                console.error(`❌ ${message}`, details ? details : '');
                break;
            case 'warning':
                this.warnings.push(entry);
                console.warn(`⚠️  ${message}`, details ? details : '');
                break;
            case 'success':
                this.successes.push(entry);
                console.log(`✅ ${message}`, details ? details : '');
                break;
            default:
                console.log(`ℹ️  ${message}`, details ? details : '');
        }
    }

    async checkAuthUsersTable() {
        console.log('\n🔍 Checking auth.users table...');

        try {
            const { data: authUser, error } = await supabase.auth.admin.getUserByEmail(SUPERADMIN_EMAIL);

            if (error) {
                this.log('error', 'Failed to query auth.users table', error.message);
                return null;
            }

            if (!authUser.user) {
                this.log('error', 'No auth.users record found for superadmin email');
                return null;
            }

            const user = authUser.user;
            this.log('success', 'Found auth.users record');

            // Check email confirmation
            if (!user.email_confirmed_at) {
                this.log('error', 'Email not confirmed in auth.users');
            } else {
                this.log('success', 'Email is confirmed');
            }

            // Check last sign in
            if (!user.last_sign_in_at) {
                this.log('warning', 'User has never signed in successfully');
            } else {
                this.log('success', `Last sign in: ${user.last_sign_in_at}`);
            }

            return user;
        } catch (err) {
            this.log('error', 'Exception checking auth.users table', err.message);
            return null;
        }
    }

    async checkProfilesTable(userId) {
        console.log('\n🔍 Checking profiles table...');

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', SUPERADMIN_EMAIL)
                .single();

            if (error && error.code !== 'PGRST116') {
                this.log('error', 'Failed to query profiles table', error.message);
                return null;
            }

            if (!profile) {
                this.log('error', 'No profiles record found for superadmin');
                return null;
            }

            this.log('success', 'Found profiles record');

            // Check if profile ID matches auth user ID
            if (userId && profile.id !== userId) {
                this.log('error', 'Profile ID does not match auth.users ID');
            }

            // Check role
            if (profile.role !== 'superuser') {
                this.log('error', `Profile role is '${profile.role}', expected 'superuser'`);
            } else {
                this.log('success', 'Profile has correct superuser role');
            }

            return profile;
        } catch (err) {
            this.log('error', 'Exception checking profiles table', err.message);
            return null;
        }
    }
    async checkMembersTable(userId) {
        console.log('\n🔍 Checking members table...');

        try {
            const { data: member, error } = await supabase
                .from('members')
                .select('*')
                .eq('email', SUPERADMIN_EMAIL)
                .single();

            if (error && error.code !== 'PGRST116') {
                this.log('error', 'Failed to query members table', error.message);
                return null;
            }

            if (!member) {
                this.log('error', 'No members record found for superadmin');
                return null;
            }

            this.log('success', 'Found members record');

            // Check if member user_id matches auth user ID
            if (userId && member.user_id !== userId) {
                this.log('error', 'Member user_id does not match auth.users ID');
            }

            // Check if member is active
            if (!member.isactive) {
                this.log('warning', 'Member record is marked as inactive');
            } else {
                this.log('success', 'Member is active');
            }

            // Check category
            if (!member.category || !['Pastors', 'Members', 'MINT'].includes(member.category)) {
                this.log('warning', `Member category is '${member.category}', may need adjustment`);
            }

            return member;
        } catch (err) {
            this.log('error', 'Exception checking members table', err.message);
            return null;
        }
    }

    async checkUserRolesTable(userId) {
        console.log('\n🔍 Checking user_roles table...');

        try {
            const { data: userRoles, error } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                this.log('error', 'Failed to query user_roles table', error.message);
                return null;
            }

            if (!userRoles || userRoles.length === 0) {
                this.log('error', 'No user_roles records found for superadmin');
                return null;
            }

            this.log('success', `Found ${userRoles.length} user_roles record(s)`);

            // Check for superuser role
            const superuserRole = userRoles.find(role => role.role === 'superuser');
            if (!superuserRole) {
                this.log('error', 'No superuser role found in user_roles');
            } else {
                this.log('success', 'Found superuser role assignment');
            }

            return userRoles;
        } catch (err) {
            this.log('error', 'Exception checking user_roles table', err.message);
            return null;
        }
    }

    async checkRLSPolicies() {
        console.log('\n🔍 Checking RLS policies...');

        try {
            const { data: policies, error } = await supabase.rpc('get_rls_policies');

            if (error) {
                // Fallback to direct query if RPC doesn't exist
                const { data: policiesData, error: policyError } = await supabase
                    .from('pg_policies')
                    .select('*')
                    .in('tablename', ['profiles', 'members', 'user_roles']);

                if (policyError) {
                    this.log('warning', 'Could not check RLS policies', policyError.message);
                    return;
                }

                if (policiesData && policiesData.length > 0) {
                    this.log('success', `Found ${policiesData.length} RLS policies`);
                    policiesData.forEach(policy => {
                        console.log(`  - ${policy.tablename}.${policy.policyname}: ${policy.cmd}`);
                    });
                } else {
                    this.log('warning', 'No RLS policies found for user tables');
                }
            }
        } catch (err) {
            this.log('warning', 'Exception checking RLS policies', err.message);
        }
    }

    async testAuthentication() {
        console.log('\n🔍 Testing authentication...');

        try {
            // Create a regular client for testing authentication
            const testClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '');

            const { data, error } = await testClient.auth.signInWithPassword({
                email: SUPERADMIN_EMAIL,
                password: 'Fa-#8rC6DRTkd$5'
            });

            if (error) {
                this.log('error', 'Authentication test failed', error.message);
                return false;
            }

            if (data.user) {
                this.log('success', 'Authentication test successful');

                // Test accessing user data
                const { data: profileData, error: profileError } = await testClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    this.log('error', 'Failed to access profile after authentication', profileError.message);
                } else {
                    this.log('success', 'Successfully accessed profile data after authentication');
                }

                // Sign out
                await testClient.auth.signOut();
                return true;
            }
        } catch (err) {
            this.log('error', 'Exception during authentication test', err.message);
        }

        return false;
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            email: SUPERADMIN_EMAIL,
            summary: {
                totalIssues: this.issues.length,
                totalWarnings: this.warnings.length,
                totalSuccesses: this.successes.length
            },
            issues: this.issues,
            warnings: this.warnings,
            successes: this.successes,
            recommendations: []
        };

        // Generate recommendations based on issues found
        if (this.issues.some(issue => issue.message.includes('No auth.users record'))) {
            report.recommendations.push('Create auth.users record for superadmin');
        }

        if (this.issues.some(issue => issue.message.includes('Email not confirmed'))) {
            report.recommendations.push('Confirm email address in auth.users');
        }

        if (this.issues.some(issue => issue.message.includes('No profiles record'))) {
            report.recommendations.push('Create profiles record with superuser role');
        }

        if (this.issues.some(issue => issue.message.includes('No members record'))) {
            report.recommendations.push('Create members record for superadmin');
        }

        if (this.issues.some(issue => issue.message.includes('No user_roles'))) {
            report.recommendations.push('Create user_roles record with superuser role');
        }

        if (this.issues.some(issue => issue.message.includes('Authentication test failed'))) {
            report.recommendations.push('Reset password for superadmin account');
        }

        // Save report to file
        const reportPath = `superadmin-diagnostic-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`\n📊 Diagnostic report saved to: ${reportPath}`);
        return report;
    }

    async runFullDiagnostic() {
        console.log('🚀 Starting Superadmin Authentication Diagnostic...');
        console.log(`📧 Target email: ${SUPERADMIN_EMAIL}`);

        // Check auth.users table
        const authUser = await this.checkAuthUsersTable();
        const userId = authUser?.id;

        // Check profiles table
        await this.checkProfilesTable(userId);

        // Check members table
        await this.checkMembersTable(userId);

        // Check user_roles table
        if (userId) {
            await this.checkUserRolesTable(userId);
        }

        // Check RLS policies
        await this.checkRLSPolicies();

        // Test authentication
        await this.testAuthentication();

        // Generate and save report
        const report = await this.generateReport();

        console.log('\n📋 DIAGNOSTIC SUMMARY:');
        console.log(`✅ Successes: ${report.summary.totalSuccesses}`);
        console.log(`⚠️  Warnings: ${report.summary.totalWarnings}`);
        console.log(`❌ Issues: ${report.summary.totalIssues}`);

        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }

        return report;
    }
}

// Run diagnostic if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const diagnostic = new SuperadminDiagnostics();
    diagnostic.runFullDiagnostic()
        .then(() => {
            console.log('\n🏁 Diagnostic complete');
            process.exit(0);
        })
        .catch(err => {
            console.error('💥 Diagnostic failed:', err);
            process.exit(1);
        });
}

export default SuperadminDiagnostics;