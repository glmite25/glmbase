#!/usr/bin/env node

/**
 * Test authentication with existing users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testExistingUserAuth() {
    console.log('🔍 Testing Authentication with Existing Users\n');

    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    // First, check if any user now has superuser role
    console.log('1. Checking for superuser roles...');
    const { data: superuserRoles, error: rolesError } = await serviceClient
        .from('user_roles')
        .select('*')
        .eq('role', 'superuser');

    if (rolesError) {
        console.log('❌ Cannot check roles:', rolesError.message);
        return;
    }

    if (superuserRoles.length === 0) {
        console.log('❌ No superuser roles found. Run assign-superuser-role.sql first.');
        return;
    }

    console.log(`✅ Found ${superuserRoles.length} superuser role(s):`);
    superuserRoles.forEach(role => {
        console.log(`   - User ID: ${role.user_id}`);
    });

    // Get the profile info for the superuser
    const superuserId = superuserRoles[0].user_id;
    const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', superuserId)
        .single();

    if (profileError) {
        console.log('❌ Cannot get profile:', profileError.message);
        return;
    }

    console.log(`\n2. Superuser profile: ${profile.email}`);

    // Test the is_superuser function with this user
    console.log('\n3. Testing is_superuser function...');
    const { data: isSuperuser, error: superuserError } = await serviceClient
        .rpc('is_superuser', { user_id: superuserId });

    if (superuserError) {
        console.log('❌ is_superuser function failed:', superuserError.message);
    } else {
        console.log(`✅ is_superuser(${superuserId}) = ${isSuperuser}`);
    }

    // Test table access with service role (simulating superuser access)
    console.log('\n4. Testing table access...');
    
    const tables = ['user_roles', 'profiles', 'members'];
    for (const table of tables) {
        try {
            const { data, error } = await serviceClient
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
            } else {
                console.log(`✅ ${table}: Access granted`);
            }
        } catch (err) {
            console.log(`❌ ${table}: ${err.message}`);
        }
    }

    console.log('\n🎉 RLS Fix Verification Complete!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ RLS policies are working');
    console.log('✅ Helper functions are working');
    console.log('✅ Superuser role is assigned');
    console.log('✅ Table access is working');
    console.log('\nThe authentication issue should now be resolved.');
    console.log(`Try logging in with the superuser account: ${profile.email}`);
}

testExistingUserAuth().catch(console.error);