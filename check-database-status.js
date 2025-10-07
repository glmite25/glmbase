#!/usr/bin/env node

/**
 * Check current database status after RLS fix
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceKey);

async function checkDatabaseStatus() {
    console.log('🔍 Checking Database Status After RLS Fix\n');

    try {
        // Check helper functions
        console.log('1. Testing helper functions...');
        const { data: helperTest, error: helperError } = await serviceClient
            .rpc('is_superuser');
        
        if (helperError) {
            console.log('❌ Helper function error:', helperError.message);
        } else {
            console.log('✅ Helper functions working');
        }

        // Check user_roles table
        console.log('\n2. Checking user_roles table...');
        const { data: allRoles, error: rolesError } = await serviceClient
            .from('user_roles')
            .select('*');

        if (rolesError) {
            console.log('❌ Cannot access user_roles:', rolesError.message);
        } else {
            console.log(`✅ user_roles table accessible (${allRoles.length} total roles)`);
            
            // Check for superuser roles
            const superuserRoles = allRoles.filter(role => role.role === 'superuser');
            console.log(`   - Superuser roles: ${superuserRoles.length}`);
            
            if (superuserRoles.length === 0) {
                console.log('⚠️  No superuser roles found! This is why authentication fails.');
                console.log('   You need to assign superuser role to your admin account.');
            } else {
                superuserRoles.forEach(role => {
                    console.log(`   - User ID: ${role.user_id} (${role.role})`);
                });
            }

            // Show all roles for reference
            console.log('\n   All current roles:');
            allRoles.forEach(role => {
                console.log(`   - ${role.user_id}: ${role.role}`);
            });
        }

        // Check profiles table
        console.log('\n3. Checking profiles table...');
        const { data: profiles, error: profilesError } = await serviceClient
            .from('profiles')
            .select('*');

        if (profilesError) {
            console.log('❌ Cannot access profiles:', profilesError.message);
        } else {
            console.log(`✅ profiles table accessible (${profiles.length} profiles)`);
            profiles.forEach(profile => {
                console.log(`   - ${profile.email} (ID: ${profile.id})`);
            });
        }

        // Check current RLS policies
        console.log('\n4. Checking current RLS policies...');
        try {
            const { data: policies, error: policiesError } = await serviceClient
                .rpc('sql', { 
                    query: `
                        SELECT tablename, policyname, cmd 
                        FROM pg_policies 
                        WHERE schemaname = 'public' 
                        AND tablename IN ('user_roles', 'profiles', 'members')
                        ORDER BY tablename, policyname
                    ` 
                });

            if (policiesError) {
                console.log('❌ Cannot check policies:', policiesError.message);
            } else {
                console.log('✅ Current RLS policies:');
                let currentTable = '';
                policies.forEach(policy => {
                    if (policy.tablename !== currentTable) {
                        console.log(`\n   ${policy.tablename}:`);
                        currentTable = policy.tablename;
                    }
                    console.log(`     - ${policy.policyname} (${policy.cmd})`);
                });
            }
        } catch (err) {
            console.log('❌ Policy check failed:', err.message);
        }

        console.log('\n📋 NEXT STEPS:');
        console.log('1. If no superuser roles exist, you need to create one');
        console.log('2. Get the User ID from Supabase Dashboard > Authentication > Users');
        console.log('3. Run the setup-superadmin-user.sql script');
        console.log('4. Use the assign_superuser_role_by_id() function with your user ID');

    } catch (error) {
        console.error('Error:', error);
    }
}

checkDatabaseStatus().catch(console.error);