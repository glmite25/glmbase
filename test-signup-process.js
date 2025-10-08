#!/usr/bin/env node

/**
 * Test the signup process to identify the exact issue
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
    console.log('🧪 Testing Signup Process\n');

    const testUser = {
        email: 'test.user@example.com',
        password: 'TestPassword123!',
        fullName: 'Test User',
        churchUnit: 'youth',
        phone: '+1234567890'
    };

    console.log('Test user data:', testUser);

    try {
        console.log('\n1. Testing Supabase Auth Signup...');
        
        const { data, error } = await supabase.auth.signUp({
            email: testUser.email,
            password: testUser.password,
            options: {
                data: {
                    full_name: testUser.fullName,
                    church_unit: testUser.churchUnit,
                    phone: testUser.phone,
                }
            }
        });

        if (error) {
            console.error('❌ Signup failed:', error.message);
            console.error('Error details:', error);
            return;
        }

        console.log('✅ Supabase auth signup successful');
        console.log('User ID:', data.user?.id);
        console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');

        if (!data.user?.id) {
            console.error('❌ No user ID returned from signup');
            return;
        }

        console.log('\n2. Testing Profile Creation...');
        
        // Test profile creation
        const profileData = {
            id: data.user.id,
            email: testUser.email,
            full_name: testUser.fullName,
            updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData);

        if (profileError) {
            console.error('❌ Profile creation failed:', profileError.message);
            console.error('Profile error details:', profileError);
        } else {
            console.log('✅ Profile created successfully');
        }

        console.log('\n3. Testing Member Record Creation...');
        
        // Test member record creation
        const memberData = {
            id: data.user.id,
            email: testUser.email,
            fullname: testUser.fullName,
            phone: testUser.phone,
            category: 'Members',
            churchunit: testUser.churchUnit,
            isactive: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error: memberError } = await supabase
            .from('members')
            .upsert(memberData, { onConflict: 'id' });

        if (memberError) {
            console.error('❌ Member record creation failed:', memberError.message);
            console.error('Member error details:', memberError);
        } else {
            console.log('✅ Member record created successfully');
        }

        console.log('\n4. Testing Auto Sign-in...');
        
        // Test signing in with the new account
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password,
        });

        if (signInError) {
            console.error('❌ Auto sign-in failed:', signInError.message);
            console.error('Sign-in error details:', signInError);
        } else {
            console.log('✅ Auto sign-in successful');
            
            // Clean up - sign out
            await supabase.auth.signOut();
        }

        console.log('\n5. Cleanup - Removing test user...');
        
        // Clean up the test user (requires service role)
        const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                await serviceClient.auth.admin.deleteUser(data.user.id);
                console.log('✅ Test user cleaned up');
            } catch (cleanupError) {
                console.warn('⚠️ Could not clean up test user:', cleanupError.message);
            }
        } else {
            console.warn('⚠️ No service role key - test user not cleaned up');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

testSignup().catch(console.error);