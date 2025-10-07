#!/usr/bin/env node

/**
 * Comprehensive verification script for RLS policy fixes
 * This script verifies that the superadmin can authenticate and access all necessary resources
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables');
    console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

async function verifyRLSPolicyFix() {
    console.log('🔍 Comprehensive RLS Policy Fix Verification\n');
    console.log('=' .repeat(60));

    let testResults = {
        passed: 0,
        failed: 0,
        warnings: 0
    };

    try {
        // Test 1: Verify database connection
        console.log('\n📡 Test 1: Database Connection');
        const { data: connectionTest, error: connectionError } = await serviceClient
            .from('user_roles')
            .select('count')
            .limit(1);

        if (connectionError) {
            console.error('❌ Database connection failed:', connectionError.message);
            testResults.failed++;
            return testResults;
        } else {
            console.log('✅ Database connection successful');
            testResults.passed++;
        }

        // Test 2: Verify helper functions exist
        console.log('\n🔧 Test 2: Helper Functions');
        try {
            const { data: superuserTest, error: superuserError } = await serviceClient
                .rpc('is_superuser', { user_id: '00000000-0000-0000-0000-000000000000' });

            if (superuserError) {
                console.error('❌ is_superuser function not available:', superuserError.message);
                testResults.failed++;
            } else {
                console.log('✅ is_superuser function is available');
                testResults.passed++;
            }

            const { data: adminTest, error: adminError } = await serviceClient
                .rpc('is_admin_or_superuser', { user_id: '00000000-0000-0000-0000-000000000000' });

            if (adminError) {
                console.error('❌ is_admin_or_superuser function not available:', adminError.message);
                testResults.failed++;
            } else {
                console.log('✅ is_admin_or_superuser function is available');
                testResults.passed++;
            }
        } catch (err) {
            console.error('❌ Helper function test failed:', err.message);
            testResults.failed++;
        }

        // Test 3: Verify RLS policies exist
        console.log('\n📋 Test 3: RLS Policies');
        const { data: policies, error: policiesError } = await serviceClient
            .rpc('sql', { 
                query: `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'` 
            });

        if (policiesError) {
            console.error('❌ Failed to fetch RLS policies:', policiesError.message);
            testResults.failed++;
        } else {
            const expectedPolicies = [
                'Users can view own roles',
                'Superusers can manage all roles',
                'Users can view own profile',
                'Superusers can manage all profiles'
            ];

            const policyNames = policies.map(p => p.policyname);
            let foundPolicies = 0;

            expectedPolicies.forEach(expectedPolicy => {
                if (policyNames.includes(expectedPolicy)) {
                    console.log(`✅ Found policy: ${expectedPolicy}`);
                    foundPolicies++;
                } else {
                    console.log(`❌ Missing policy: ${expectedPolicy}`);
                }
            });

            if (foundPolicies === expectedPolicies.length) {
                console.log('✅ All expected RLS policies are present');
                testResults.passed++;
            } else {
                console.log(`⚠️  Found ${foundPolicies}/${expectedPolicies.length} expected policies`);
                testResults.warnings++;
            }
        }

        // Test 4: Verify superadmin account exists
        console.log('\n👤 Test 4: Superadmin Account');
        const { data: authUser, error: authUserError } = await serviceClient.auth.admin
            .listUsers();

        if (authUserError) {
            console.error('❌ Failed to list users:', authUserError.message);
            testResults.failed++;
            return testResults;
        }

        const superadminUser = authUser.users?.find(user => user.email === SUPERADMIN_EMAIL);
        
        if (!superadminUser) {
            console.error('❌ Superadmin account not found');
            testResults.failed++;
            return testResults;
        }

        console.log('✅ Superadmin account exists');
        console.log(`   User ID: ${superadminUser.id}`);
        console.log(`   Email confirmed: ${superadminUser.email_confirmed_at ? 'Yes' : 'No'}`);
        testResults.passed++;

        const superadminId = superadminUser.id;

        // Test 5: Verify superadmin has superuser role
        console.log('\n🔑 Test 5: Superadmin Role Assignment');
        const { data: userRoles, error: rolesError } = await serviceClient
            .from('user_roles')
            .select('role')
            .eq('user_id', superadminId);

        if (rolesError) {
            console.error('❌ Failed to check user roles:', rolesError.message);
            testResults.failed++;
        } else {
            const hasSuperuserRole = userRoles.some(role => role.role === 'superuser');
            if (hasSuperuserRole) {
                console.log('✅ Superadmin has superuser role');
                testResults.passed++;
            } else {
                console.error('❌ Superadmin does not have superuser role');
                console.log('   Current roles:', userRoles.map(r => r.role));
                testResults.failed++;
            }
        }

        // Test 6: Test authentication
        console.log('\n🔐 Test 6: Authentication Test');
        const anonClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });

        if (authError) {
            console.error('❌ Authentication failed:', authError.message);
            testResults.failed++;
        } else if (!authData.user) {
            console.error('❌ Authentication returned no user data');
            testResults.failed++;
        } else {
            console.log('✅ Authentication successful');
            testResults.passed++;

            // Test 7: Test authenticated access to tables
            console.log('\n📊 Test 7: Authenticated Table Access');
            const authClient = createClient(supabaseUrl, supabaseAnonKey);
            await authClient.auth.setSession(authData.session);

            const tablesToTest = [
                { name: 'user_roles', description: 'User roles table' },
                { name: 'profiles', description: 'User profiles table' },
                { name: 'members', description: 'Church members table' },
                { name: 'events', description: 'Events table' },
                { name: 'announcements', description: 'Announcements table' }
            ];

            for (const table of tablesToTest) {
                try {
                    const { data, error } = await authClient
                        .from(table.name)
                        .select('*')
                        .limit(1);

                    if (error) {
                        console.log(`❌ ${table.description}: ${error.message}`);
                        testResults.failed++;
                    } else {
                        console.log(`✅ ${table.description}: Access granted`);
                        testResults.passed++;
                    }
                } catch (err) {
                    console.log(`❌ ${table.description}: ${err.message}`);
                    testResults.failed++;
                }
            }

            // Test 8: Test superuser function with authenticated user
            console.log('\n🔍 Test 8: Superuser Function Test');
            try {
                const { data: isSuperuser, error: superuserFuncError } = await authClient
                    .rpc('is_superuser');

                if (superuserFuncError) {
                    console.error('❌ is_superuser function failed:', superuserFuncError.message);
                    testResults.failed++;
                } else {
                    if (isSuperuser) {
                        console.log('✅ is_superuser function correctly identifies superuser');
                        testResults.passed++;
                    } else {
                        console.error('❌ is_superuser function returned false for superuser');
                        testResults.failed++;
                    }
                }
            } catch (err) {
                console.error('❌ Superuser function test failed:', err.message);
                testResults.failed++;
            }

            // Clean up - sign out
            await authClient.auth.signOut();
        }

        // Test 9: Verify RLS is enabled on critical tables
        console.log('\n🛡️  Test 9: RLS Status Check');
        const { data: rlsStatus, error: rlsError } = await serviceClient
            .rpc('sql', { 
                query: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_roles', 'profiles', 'members')` 
            });

        if (rlsError) {
            console.error('❌ Failed to check RLS status:', rlsError.message);
            testResults.failed++;
        } else {
            rlsStatus.forEach(table => {
                if (table.rowsecurity) {
                    console.log(`✅ RLS enabled on ${table.tablename}`);
                    testResults.passed++;
                } else {
                    console.log(`⚠️  RLS disabled on ${table.tablename}`);
                    testResults.warnings++;
                }
            });
        }

    } catch (error) {
        console.error('💥 Unexpected error during verification:', error);
        testResults.failed++;
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    
    const total = testResults.passed + testResults.failed + testResults.warnings;
    const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);

    if (testResults.failed === 0) {
        console.log('\n🎉 All critical tests passed! RLS policy fix appears successful.');
    } else {
        console.log('\n⚠️  Some tests failed. Review the errors above and consider running the rollback script if needed.');
    }

    return testResults;
}

// Run the verification
verifyRLSPolicyFix().catch(console.error);