#!/usr/bin/env node

/**
 * Test script to verify RLS policies work correctly for superadmin access
 * This script tests the authentication-friendly RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

// Create clients
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

async function testRLSPolicies() {
    console.log('🔍 Testing RLS Policies for Superadmin Access\n');

    try {
        // Test 1: Verify helper functions exist
        console.log('1. Testing helper functions...');
        const { data: helperTest, error: helperError } = await serviceClient
            .rpc('is_superuser', { user_id: null });
        
        if (helperError) {
            console.error('❌ Helper function test failed:', helperError.message);
        } else {
            console.log('✅ Helper functions are available');
        }

        // Test 2: Check current policies
        console.log('\n2. Checking current RLS policies...');
        const { data: policies, error: policiesError } = await serviceClient
            .from('pg_policies')
            .select('tablename, policyname, cmd, qual')
            .eq('schemaname', 'public')
            .order('tablename');

        if (policiesError) {
            console.error('❌ Failed to fetch policies:', policiesError.message);
        } else {
            console.log(`✅ Found ${policies.length} RLS policies`);
            
            // Group policies by table
            const policyGroups = policies.reduce((acc, policy) => {
                if (!acc[policy.tablename]) acc[policy.tablename] = [];
                acc[policy.tablename].push(policy);
                return acc;
            }, {});

            Object.entries(policyGroups).forEach(([table, tablePolicies]) => {
                console.log(`   📋 ${table}: ${tablePolicies.length} policies`);
                tablePolicies.forEach(policy => {
                    console.log(`      - ${policy.policyname} (${policy.cmd})`);
                });
            });
        }

        // Test 3: Test authentication with superadmin credentials
        console.log('\n3. Testing superadmin authentication...');
        const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });

        if (authError) {
            console.error('❌ Authentication failed:', authError.message);
            return;
        }

        if (!authData.user) {
            console.error('❌ No user data returned from authentication');
            return;
        }

        console.log('✅ Authentication successful');
        console.log(`   User ID: ${authData.user.id}`);
        console.log(`   Email: ${authData.user.email}`);

        // Create authenticated client
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        await authClient.auth.setSession(authData.session);

        // Test 4: Test access to user_roles table
        console.log('\n4. Testing access to user_roles table...');
        const { data: userRoles, error: rolesError } = await authClient
            .from('user_roles')
            .select('*')
            .eq('user_id', authData.user.id);

        if (rolesError) {
            console.error('❌ Failed to access user_roles:', rolesError.message);
        } else {
            console.log('✅ Successfully accessed user_roles table');
            console.log(`   Found ${userRoles.length} role(s):`, userRoles.map(r => r.role));
        }

        // Test 5: Test superuser function
        console.log('\n5. Testing is_superuser function...');
        const { data: isSuperuser, error: superuserError } = await authClient
            .rpc('is_superuser');

        if (superuserError) {
            console.error('❌ Failed to call is_superuser function:', superuserError.message);
        } else {
            console.log(`✅ is_superuser function result: ${isSuperuser}`);
        }

        // Test 6: Test access to profiles table
        console.log('\n6. Testing access to profiles table...');
        const { data: profiles, error: profilesError } = await authClient
            .from('profiles')
            .select('*');

        if (profilesError) {
            console.error('❌ Failed to access profiles:', profilesError.message);
        } else {
            console.log(`✅ Successfully accessed profiles table (${profiles.length} records)`);
        }

        // Test 7: Test access to members table
        console.log('\n7. Testing access to members table...');
        const { data: members, error: membersError } = await authClient
            .from('members')
            .select('*')
            .limit(5);

        if (membersError) {
            console.error('❌ Failed to access members:', membersError.message);
        } else {
            console.log(`✅ Successfully accessed members table (showing ${members.length} records)`);
        }

        // Test 8: Test write access (superuser should be able to create/update)
        console.log('\n8. Testing write access to members table...');
        const testMember = {
            fullname: 'Test Member for RLS',
            email: 'test-rls@example.com',
            category: 'Members',
            churchunit: 'Test Unit',
            isactive: true
        };

        const { data: insertData, error: insertError } = await authClient
            .from('members')
            .insert(testMember)
            .select();

        if (insertError) {
            console.error('❌ Failed to insert test member:', insertError.message);
        } else {
            console.log('✅ Successfully inserted test member');
            
            // Clean up - delete the test member
            const { error: deleteError } = await authClient
                .from('members')
                .delete()
                .eq('id', insertData[0].id);

            if (deleteError) {
                console.warn('⚠️  Failed to clean up test member:', deleteError.message);
            } else {
                console.log('✅ Successfully cleaned up test member');
            }
        }

        // Test 9: Test access to other admin tables
        console.log('\n9. Testing access to admin tables...');
        
        const adminTables = ['events', 'announcements', 'church_units'];
        
        for (const table of adminTables) {
            try {
                const { data, error } = await authClient
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.log(`   ❌ ${table}: ${error.message}`);
                } else {
                    console.log(`   ✅ ${table}: Access granted`);
                }
            } catch (err) {
                console.log(`   ❌ ${table}: ${err.message}`);
            }
        }

        console.log('\n🎉 RLS Policy Testing Complete!');

    } catch (error) {
        console.error('💥 Unexpected error during testing:', error);
    }
}

// Run the test
testRLSPolicies().catch(console.error);