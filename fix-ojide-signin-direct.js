#!/usr/bin/env node

/**
 * Direct Fix for Ojide Lawrence Sign-in Issue
 * Uses direct database queries instead of admin API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

function createServiceRoleClient() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing required environment variables');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

async function fixOjideSignin() {
    console.log('🔧 Fixing Ojide Lawrence sign-in issue...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Check profiles table first (easier to query)
        console.log('1. Checking profiles record...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
            throw new Error(`Profile query error: ${profileError.message}`);
        }
        
        let userId = profile?.id;
        
        if (!profile) {
            console.log('   ❌ Profile not found');
            // We'll need to create everything from scratch
            console.log('   🔄 Creating new superadmin account...');
            
            // Try to create user using auth.signUp (which should work)
            const testClient = createClient(
                process.env.VITE_SUPABASE_URL,
                process.env.VITE_SUPABASE_ANON_KEY
            );
            
            const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
                email: SUPERADMIN_EMAIL,
                password: SUPERADMIN_PASSWORD,
                options: {
                    data: {
                        full_name: 'Ojide Lawrence',
                        role: 'superuser'
                    }
                }
            });
            
            if (signUpError) {
                console.log(`   ⚠️  SignUp error: ${signUpError.message}`);
                // User might already exist, let's try to sign in
                const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
                    email: SUPERADMIN_EMAIL,
                    password: SUPERADMIN_PASSWORD
                });
                
                if (signInError) {
                    throw new Error(`Cannot sign up or sign in: ${signInError.message}`);
                }
                
                userId = signInData.user.id;
                console.log(`   ✅ Signed in existing user: ${userId}`);
            } else {
                userId = signUpData.user.id;
                console.log(`   ✅ Created new user: ${userId}`);
            }
            
            await testClient.auth.signOut();
        } else {
            userId = profile.id;
            console.log(`   ✅ Found profile with user ID: ${userId}`);
        }
        
        // Step 2: Ensure profile exists and is correct
        console.log('\n2. Ensuring profile is correct...');
        const { error: upsertProfileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: SUPERADMIN_EMAIL,
                full_name: 'Ojide Lawrence',
                role: 'superuser',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });
        
        if (upsertProfileError) {
            throw new Error(`Failed to upsert profile: ${upsertProfileError.message}`);
        }
        console.log('   ✅ Profile ensured');
        
        // Step 3: Ensure members record exists and is correct
        console.log('\n3. Ensuring members record...');
        const { error: upsertMemberError } = await supabase
            .from('members')
            .upsert({
                user_id: userId,
                email: SUPERADMIN_EMAIL,
                fullname: 'Ojide Lawrence',
                category: 'Pastors',
                isactive: true,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'email'
            });
        
        if (upsertMemberError) {
            throw new Error(`Failed to upsert member: ${upsertMemberError.message}`);
        }
        console.log('   ✅ Member record ensured');
        
        // Step 4: Ensure user_roles record exists
        console.log('\n4. Ensuring superuser role...');
        const { data: existingRole } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('role', 'superuser')
            .single();
        
        if (!existingRole) {
            const { error: insertRoleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'superuser',
                    created_at: new Date().toISOString()
                });
            
            if (insertRoleError) {
                throw new Error(`Failed to create user role: ${insertRoleError.message}`);
            }
            console.log('   ✅ Superuser role created');
        } else {
            console.log('   ✅ Superuser role exists');
        }
        
        // Step 5: Test authentication
        console.log('\n5. Testing authentication...');
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (authError) {
            console.log(`   ❌ Authentication failed: ${authError.message}`);
            
            // Try to reset password using service role
            console.log('   🔄 Attempting password reset...');
            
            // Use RPC to update password
            const { error: passwordError } = await supabase.rpc('update_user_password', {
                user_email: SUPERADMIN_EMAIL,
                new_password: SUPERADMIN_PASSWORD
            });
            
            if (passwordError) {
                console.log(`   ⚠️  Password reset failed: ${passwordError.message}`);
                console.log('   💡 You may need to reset the password manually in Supabase dashboard');
            } else {
                console.log('   ✅ Password reset successful');
                
                // Try authentication again
                const { data: retryAuthData, error: retryAuthError } = await testClient.auth.signInWithPassword({
                    email: SUPERADMIN_EMAIL,
                    password: SUPERADMIN_PASSWORD
                });
                
                if (retryAuthError) {
                    throw new Error(`Authentication still failed: ${retryAuthError.message}`);
                }
                
                console.log('   ✅ Authentication successful after password reset!');
                await testClient.auth.signOut();
            }
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   📧 Email: ${authData.user.email}`);
            console.log(`   🆔 User ID: ${authData.user.id}`);
            
            // Test profile access
            const { data: profileData, error: profileAccessError } = await testClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileAccessError) {
                console.log(`   ⚠️  Profile access warning: ${profileAccessError.message}`);
            } else {
                console.log(`   ✅ Profile access successful - Role: ${profileData.role}`);
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎉 SUCCESS: Setup completed!');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log('\n💡 If authentication still fails, try:');
        console.log('   1. Check Supabase dashboard for the user');
        console.log('   2. Manually reset password in Supabase Auth');
        console.log('   3. Ensure email is confirmed');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the fix
fixOjideSignin()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });