#!/usr/bin/env node

/**
 * Test Ojide Lawrence Sign-in
 * Simple test to verify authentication works
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

async function testSignin() {
    console.log('🧪 Testing Ojide Lawrence sign-in...\n');
    
    try {
        // Create regular client for authentication
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        console.log('📧 Email:', SUPERADMIN_EMAIL);
        console.log('🔑 Password:', SUPERADMIN_PASSWORD);
        console.log('🌐 Supabase URL:', process.env.VITE_SUPABASE_URL);
        console.log();
        
        // Attempt sign-in
        console.log('🔐 Attempting sign-in...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (error) {
            console.log('❌ Sign-in failed:', error.message);
            console.log('🔍 Error details:', error);
            
            // Try to get more information about the user
            console.log('\n🔍 Checking user status with service role...');
            const serviceClient = createClient(
                process.env.VITE_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );
            
            // Check if profile exists
            const { data: profile, error: profileError } = await serviceClient
                .from('profiles')
                .select('*')
                .eq('email', SUPERADMIN_EMAIL)
                .single();
            
            if (profileError) {
                console.log('❌ Profile check failed:', profileError.message);
            } else {
                console.log('✅ Profile exists:', profile);
            }
            
            return false;
        }
        
        if (!data.user) {
            console.log('❌ Sign-in returned no user data');
            return false;
        }
        
        console.log('✅ Sign-in successful!');
        console.log('👤 User ID:', data.user.id);
        console.log('📧 Email:', data.user.email);
        console.log('✉️  Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
        console.log('🕐 Last sign-in:', data.user.last_sign_in_at || 'Never');
        
        // Test accessing profile data
        console.log('\n🔍 Testing profile access...');
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        if (profileError) {
            console.log('❌ Profile access failed:', profileError.message);
        } else {
            console.log('✅ Profile access successful');
            console.log('👑 Role:', profileData.role);
            console.log('📝 Full name:', profileData.full_name);
        }
        
        // Test accessing members data
        console.log('\n🔍 Testing members access...');
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
        
        if (memberError) {
            console.log('❌ Members access failed:', memberError.message);
        } else {
            console.log('✅ Members access successful');
            console.log('📋 Category:', memberData.category);
            console.log('✅ Active:', memberData.isactive);
        }
        
        // Test accessing user roles
        console.log('\n🔍 Testing user roles access...');
        const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', data.user.id);
        
        if (rolesError) {
            console.log('❌ User roles access failed:', rolesError.message);
        } else {
            console.log('✅ User roles access successful');
            console.log('🎭 Roles:', rolesData.map(r => r.role).join(', '));
        }
        
        // Sign out
        await supabase.auth.signOut();
        console.log('\n🚪 Signed out successfully');
        
        console.log('\n🎉 ALL TESTS PASSED! Ojide can sign in successfully.');
        return true;
        
    } catch (error) {
        console.error('\n💥 Test failed with exception:', error.message);
        return false;
    }
}

// Run the test
testSignin()
    .then(success => {
        if (success) {
            console.log('\n✅ RESULT: Authentication is working!');
        } else {
            console.log('\n❌ RESULT: Authentication is not working');
            console.log('\n💡 Next steps:');
            console.log('   1. Run the SQL fix: Execute fix-ojide-authentication-final.sql in Supabase');
            console.log('   2. Check Supabase Auth dashboard for the user');
            console.log('   3. Manually reset password if needed');
            console.log('   4. Ensure email is confirmed');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test script failed:', error);
        process.exit(1);
    });