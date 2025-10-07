#!/usr/bin/env node

/**
 * Fix Ojide Lawrence Sign-in Issue
 * Comprehensive fix for authentication problems
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

async function fixAuthenticationIssues() {
    console.log('🔧 Fixing Ojide Lawrence authentication issues...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Check if user exists in auth.users
        console.log('1. Checking auth.users record...');
        const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(SUPERADMIN_EMAIL);
        
        let userId;
        
        if (getUserError || !existingUser.user) {
            console.log('   ❌ User not found in auth.users, creating...');
            
            // Create the user
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: SUPERADMIN_EMAIL,
                password: SUPERADMIN_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    full_name: 'Ojide Lawrence',
                    role: 'superuser'
                }
            });
            
            if (createError) {
                throw new Error(`Failed to create user: ${createError.message}`);
            }
            
            userId = newUser.user.id;
            console.log(`   ✅ Created user with ID: ${userId}`);
        } else {
            userId = existingUser.user.id;
            console.log(`   ✅ Found existing user with ID: ${userId}`);
            
            // Update password to ensure it's correct
            console.log('   🔄 Updating password...');
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password: SUPERADMIN_PASSWORD
            });
            
            if (updateError) {
                console.log(`   ⚠️  Password update warning: ${updateError.message}`);
            } else {
                console.log('   ✅ Password updated successfully');
            }
        }
        
        // Step 2: Ensure profiles record exists and is correct
        console.log('\n2. Checking profiles record...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
            throw new Error(`Profile query error: ${profileError.message}`);
        }
        
        if (!profile) {
            console.log('   ❌ Profile not found, creating...');
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: SUPERADMIN_EMAIL,
                    full_name: 'Ojide Lawrence',
                    role: 'superuser',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (insertError) {
                throw new Error(`Failed to create profile: ${insertError.message}`);
            }
            console.log('   ✅ Profile created successfully');
        } else {
            console.log('   ✅ Profile exists');
            
            // Update profile to ensure correct data
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    id: userId,
                    role: 'superuser',
                    updated_at: new Date().toISOString()
                })
                .eq('email', SUPERADMIN_EMAIL);
            
            if (updateError) {
                console.log(`   ⚠️  Profile update warning: ${updateError.message}`);
            } else {
                console.log('   ✅ Profile updated with correct user ID and role');
            }
        }
        
        // Step 3: Ensure members record exists and is correct
        console.log('\n3. Checking members record...');
        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();
        
        if (memberError && memberError.code !== 'PGRST116') {
            throw new Error(`Member query error: ${memberError.message}`);
        }
        
        if (!member) {
            console.log('   ❌ Member not found, creating...');
            const { error: insertError } = await supabase
                .from('members')
                .insert({
                    user_id: userId,
                    email: SUPERADMIN_EMAIL,
                    firstname: 'Ojide',
                    lastname: 'Lawrence',
                    fullname: 'Ojide Lawrence',
                    category: 'Pastors',
                    isactive: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (insertError) {
                throw new Error(`Failed to create member: ${insertError.message}`);
            }
            console.log('   ✅ Member created successfully');
        } else {
            console.log('   ✅ Member exists');
            
            // Update member to ensure correct data
            const { error: updateError } = await supabase
                .from('members')
                .update({
                    user_id: userId,
                    isactive: true,
                    updated_at: new Date().toISOString()
                })
                .eq('email', SUPERADMIN_EMAIL);
            
            if (updateError) {
                console.log(`   ⚠️  Member update warning: ${updateError.message}`);
            } else {
                console.log('   ✅ Member updated with correct user ID');
            }
        }
        
        // Step 4: Ensure user_roles record exists
        console.log('\n4. Checking user_roles record...');
        const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('role', 'superuser');
        
        if (rolesError) {
            throw new Error(`User roles query error: ${rolesError.message}`);
        }
        
        if (!userRoles || userRoles.length === 0) {
            console.log('   ❌ Superuser role not found, creating...');
            const { error: insertError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'superuser',
                    created_at: new Date().toISOString()
                });
            
            if (insertError) {
                throw new Error(`Failed to create user role: ${insertError.message}`);
            }
            console.log('   ✅ Superuser role created successfully');
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
            throw new Error(`Authentication failed: ${authError.message}`);
        }
        
        if (!authData.user) {
            throw new Error('Authentication returned no user data');
        }
        
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
        
        // Clean up
        await testClient.auth.signOut();
        
        console.log('\n🎉 SUCCESS: Ojide Lawrence can now sign in!');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the fix
fixAuthenticationIssues()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });