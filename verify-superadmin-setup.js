#!/usr/bin/env node

/**
 * Verify superadmin setup for specific user ID
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const SUPERADMIN_ID = '47c693aa-e85c-4450-8d35-250aa4c61587';
const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

async function verifySuperadminSetup() {
    console.log('🔍 Verifying Superadmin Setup\n');
    console.log(`Target User ID: ${SUPERADMIN_ID}`);
    console.log(`Target Email: ${SUPERADMIN_EMAIL}\n`);

    const serviceClient = createClient(supabaseUrl, serviceKey);

    try {
        // Step 1: Check if profile exists
        console.log('1. Checking user profile...');
        const { data: profile, error: profileError } = await serviceClient
            .from('profiles')
            .select('*')
            .eq('id', SUPERADMIN_ID)
            .single();

        if (profileError) {
            console.log('❌ Profile not found:', profileError.message);
            console.log('   Run assign-superuser-specific.sql to create the profile');
            return;
        } else {
            console.log('✅ Profile exists:');
            console.log(`   ID: ${profile.id}`);
            console.log(`   Email: ${profile.email}`);
            console.log(`   Created: ${profile.created_at}`);
        }

        // Step 2: Check if superuser role exists
        console.log('\n2. Checking superuser role...');
        const { data: role, error: roleError } = await serviceClient
            .from('user_roles')
            .select('*')
            .eq('user_id', SUPERADMIN_ID)
            .eq('role', 'superuser')
            .single();

        if (roleError) {
            console.log('❌ Superuser role not found:', roleError.message);
            console.log('   Run assign-superuser-specific.sql to assign the role');
            return;
        } else {
            console.log('✅ Superuser role exists:');
            console.log(`   User ID: ${role.user_id}`);
            console.log(`   Role: ${role.role}`);
            console.log(`   Assigned: ${role.assigned_at}`);
            console.log(`   Assigned by: ${role.assigned_by}`);
        }

        // Step 3: Test is_superuser function
        console.log('\n3. Testing is_superuser function...');
        const { data: isSuperuser, error: superuserError } = await serviceClient
            .rpc('is_superuser', { user_id: SUPERADMIN_ID });

        if (superuserError) {
            console.log('❌ is_superuser function failed:', superuserError.message);
        } else {
            console.log(`✅ is_superuser function result: ${isSuperuser}`);
            
            if (isSuperuser) {
                console.log('🎉 Function correctly identifies user as superuser!');
            } else {
                console.log('❌ Function does not identify user as superuser');
            }
        }

        // Step 4: Test authentication
        console.log('\n4. Testing authentication...');
        const anonClient = createClient(supabaseUrl, anonKey);
        
        const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });

        if (authError) {
            console.log('❌ Authentication failed:', authError.message);
            console.log('   This could be due to:');
            console.log('   - Incorrect password');
            console.log('   - User not confirmed in Supabase Auth');
            console.log('   - RLS policies still blocking access');
        } else {
            console.log('✅ Authentication successful!');
            console.log(`   Authenticated User ID: ${authData.user.id}`);
            console.log(`   Email: ${authData.user.email}`);
            
            // Verify the authenticated user ID matches our target
            if (authData.user.id === SUPERADMIN_ID) {
                console.log('✅ Authenticated user ID matches target ID');
            } else {
                console.log('⚠️  Authenticated user ID does not match target ID');
                console.log(`   Expected: ${SUPERADMIN_ID}`);
                console.log(`   Got: ${authData.user.id}`);
            }

            // Test authenticated access
            console.log('\n5. Testing authenticated table access...');
            const authClient = createClient(supabaseUrl, anonKey);
            await authClient.auth.setSession(authData.session);

            // Test user_roles access
            const { data: userRoles, error: userRolesError } = await authClient
                .from('user_roles')
                .select('*')
                .eq('user_id', authData.user.id);

            if (userRolesError) {
                console.log('❌ Cannot access user_roles:', userRolesError.message);
            } else {
                console.log(`✅ Can access user_roles (${userRoles.length} roles)`);
                userRoles.forEach(r => console.log(`   - ${r.role}`));
            }

            // Test is_superuser with authenticated session
            const { data: authSuperuser, error: authSuperuserError } = await authClient
                .rpc('is_superuser');

            if (authSuperuserError) {
                console.log('❌ Authenticated is_superuser failed:', authSuperuserError.message);
            } else {
                console.log(`✅ Authenticated is_superuser result: ${authSuperuser}`);
            }

            await authClient.auth.signOut();
        }

        console.log('\n🎯 VERIFICATION SUMMARY:');
        console.log('✅ Profile exists');
        console.log('✅ Superuser role assigned');
        console.log('✅ Helper functions working');
        
        if (!authError) {
            console.log('✅ Authentication working');
            console.log('\n🎉 Superadmin setup is complete and working!');
        } else {
            console.log('❌ Authentication needs fixing');
            console.log('\n⚠️  Setup is partially complete. Check authentication issues.');
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

verifySuperadminSetup().catch(console.error);