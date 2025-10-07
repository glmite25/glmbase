#!/usr/bin/env node

/**
 * Simple script to check current RLS status and policies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function checkCurrentStatus() {
    console.log('🔍 Checking Current RLS Status\n');

    try {
        // Check if helper functions exist
        console.log('1. Checking helper functions...');
        try {
            const { data, error } = await serviceClient.rpc('is_superuser');
            if (error) {
                console.log('❌ is_superuser function does not exist');
            } else {
                console.log('✅ is_superuser function exists');
            }
        } catch (err) {
            console.log('❌ is_superuser function does not exist');
        }

        // Check tables and their RLS status
        console.log('\n2. Checking table RLS status...');
        const tables = ['user_roles', 'profiles', 'members', 'events', 'announcements'];
        
        for (const table of tables) {
            try {
                // Try to access the table
                const { data, error } = await serviceClient
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.log(`❌ ${table}: ${error.message}`);
                } else {
                    console.log(`✅ ${table}: Accessible (${data.length} records)`);
                }
            } catch (err) {
                console.log(`❌ ${table}: ${err.message}`);
            }
        }

        // Check superadmin account
        console.log('\n3. Checking superadmin account...');
        const { data: userRoles, error: rolesError } = await serviceClient
            .from('user_roles')
            .select('*')
            .eq('role', 'superuser');

        if (rolesError) {
            console.log('❌ Cannot check user roles:', rolesError.message);
        } else {
            console.log(`✅ Found ${userRoles.length} superuser role(s)`);
            userRoles.forEach(role => {
                console.log(`   - User ID: ${role.user_id}`);
            });
        }

        // Test authentication
        console.log('\n4. Testing authentication...');
        const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
        const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
            email: 'ojidelawrence@gmail.com',
            password: 'Fa-#8rC6DRTkd$5'
        });

        if (authError) {
            console.log('❌ Authentication failed:', authError.message);
        } else {
            console.log('✅ Authentication successful');
            
            // Test authenticated access
            const authClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
            await authClient.auth.setSession(authData.session);

            const { data: authUserRoles, error: authRolesError } = await authClient
                .from('user_roles')
                .select('*')
                .eq('user_id', authData.user.id);

            if (authRolesError) {
                console.log('❌ Cannot access user_roles as authenticated user:', authRolesError.message);
            } else {
                console.log(`✅ Authenticated user can access user_roles (${authUserRoles.length} roles)`);
            }

            await authClient.auth.signOut();
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkCurrentStatus().catch(console.error);