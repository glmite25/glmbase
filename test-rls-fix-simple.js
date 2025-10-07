#!/usr/bin/env node

/**
 * Simple test to verify RLS fix is working
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

async function testRLSFix() {
    console.log('🔍 Testing RLS Fix\n');

    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    // Test 1: Check if helper functions exist
    console.log('1. Testing helper functions...');
    try {
        const { data, error } = await serviceClient.rpc('is_superuser');
        if (error) {
            console.log('❌ Helper functions not working:', error.message);
        } else {
            console.log('✅ Helper functions are working');
        }
    } catch (err) {
        console.log('❌ Helper functions error:', err.message);
    }

    // Test 2: Try authentication
    console.log('\n2. Testing authentication...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD
    });

    if (authError) {
        console.log('❌ Authentication failed:', authError.message);
        return;
    }

    console.log('✅ Authentication successful!');
    console.log(`   User ID: ${authData.user.id}`);

    // Test 3: Test table access with authenticated user
    console.log('\n3. Testing table access...');
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    await authClient.auth.setSession(authData.session);

    // Test user_roles access
    const { data: roles, error: rolesError } = await authClient
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id);

    if (rolesError) {
        console.log('❌ Cannot access user_roles:', rolesError.message);
    } else {
        console.log(`✅ Can access user_roles (${roles.length} roles found)`);
        roles.forEach(role => console.log(`   - Role: ${role.role}`));
    }

    // Test profiles access
    const { data: profile, error: profileError } = await authClient
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id);

    if (profileError) {
        console.log('❌ Cannot access profiles:', profileError.message);
    } else {
        console.log(`✅ Can access profiles (${profile.length} records found)`);
    }

    // Test members access
    const { data: members, error: membersError } = await authClient
        .from('members')
        .select('*')
        .limit(5);

    if (membersError) {
        console.log('❌ Cannot access members:', membersError.message);
    } else {
        console.log(`✅ Can access members (${members.length} records found)`);
    }

    // Test superuser function
    console.log('\n4. Testing superuser function...');
    const { data: isSuperuser, error: superuserError } = await authClient
        .rpc('is_superuser');

    if (superuserError) {
        console.log('❌ Superuser function failed:', superuserError.message);
    } else {
        console.log(`✅ Superuser function result: ${isSuperuser}`);
    }

    await authClient.auth.signOut();
    console.log('\n🎉 RLS fix test completed!');
}

testRLSFix().catch(console.error);