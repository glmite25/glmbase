#!/usr/bin/env node

/**
 * Delete and Recreate Ojide Lawrence User
 * Clean slate approach to fix authentication issues
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

async function deleteAndRecreateUser() {
    console.log('🗑️  Deleting and recreating Ojide Lawrence user...\n');
    
    const supabase = createServiceRoleClient();
    const existingUserId = '47c693aa-e85c-4450-8d35-250aa4c61587';
    
    try {
        // Step 1: Delete from all related tables first
        console.log('1. Cleaning up existing records...');
        
        // Delete user_roles
        const { error: deleteRolesError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', existingUserId);
        
        if (deleteRolesError) {
            console.log(`   ⚠️  Warning deleting user_roles: ${deleteRolesError.message}`);
        } else {
            console.log('   ✅ Deleted user_roles records');
        }
        
        // Delete members record
        const { error: deleteMemberError } = await supabase
            .from('members')
            .delete()
            .eq('email', SUPERADMIN_EMAIL);
        
        if (deleteMemberError) {
            console.log(`   ⚠️  Warning deleting members: ${deleteMemberError.message}`);
        } else {
            console.log('   ✅ Deleted members record');
        }
        
        // Delete profiles record
        const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('email', SUPERADMIN_EMAIL);
        
        if (deleteProfileError) {
            console.log(`   ⚠️  Warning deleting profiles: ${deleteProfileError.message}`);
        } else {
            console.log('   ✅ Deleted profiles record');
        }
        
        console.log('   🧹 Database cleanup completed');
        
        // Step 2: Create new user using sign-up
        console.log('\n2. Creating new user account...');
        
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
            throw new Error(`Failed to create user: ${signUpError.message}`);
        }
        
        if (!signUpData.user) {
            throw new Error('Sign-up returned no user data');
        }
        
        const newUserId = signUpData.user.id;
        console.log(`   ✅ Created new user with ID: ${newUserId}`);
        console.log(`   📧 Email: ${signUpData.user.email}`);
        console.log(`   ✉️  Email confirmed: ${signUpData.user.email_confirmed_at ? 'Yes' : 'No'}`);
        
        // Step 3: Create profiles record
        console.log('\n3. Creating profiles record...');
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: newUserId,
                email: SUPERADMIN_EMAIL,
                full_name: 'Ojide Lawrence',
                role: 'superuser',
                church_unit: 'Administration',
                country: 'Nigeria',
                join_date: new Date().toISOString().split('T')[0],
                membership_status: 'active',
                preferred_contact_method: 'email',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (profileError) {
            throw new Error(`Failed to create profile: ${profileError.message}`);
        }
        console.log('   ✅ Profile created successfully');
        
        // Step 4: Create members record
        console.log('\n4. Creating members record...');
        const { error: memberError } = await supabase
            .from('members')
            .insert({
                user_id: newUserId,
                email: SUPERADMIN_EMAIL,
                fullname: 'Ojide Lawrence',
                category: 'Pastors',
                isactive: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (memberError) {
            throw new Error(`Failed to create member: ${memberError.message}`);
        }
        console.log('   ✅ Member record created successfully');
        
        // Step 5: Create user_roles record
        console.log('\n5. Creating superuser role...');
        const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: newUserId,
                role: 'superuser',
                created_at: new Date().toISOString()
            });
        
        if (roleError) {
            throw new Error(`Failed to create user role: ${roleError.message}`);
        }
        console.log('   ✅ Superuser role created successfully');
        
        // Step 6: Test authentication immediately
        console.log('\n6. Testing authentication...');
        
        // Wait a moment for the database to sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (authError) {
            console.log(`   ❌ Authentication failed: ${authError.message}`);
            console.log('   💡 This might be due to email confirmation requirement');
            
            // If email confirmation is required, let's try to confirm it
            if (authError.message.includes('email') || authError.message.includes('confirm')) {
                console.log('   🔄 Attempting to confirm email...');
                
                // Use service role to update email confirmation
                const { error: confirmError } = await supabase.rpc('confirm_user_email', {
                    user_email: SUPERADMIN_EMAIL
                });
                
                if (confirmError) {
                    console.log(`   ⚠️  Email confirmation failed: ${confirmError.message}`);
                } else {
                    console.log('   ✅ Email confirmed, trying authentication again...');
                    
                    // Try authentication again
                    const { data: retryAuthData, error: retryAuthError } = await testClient.auth.signInWithPassword({
                        email: SUPERADMIN_EMAIL,
                        password: SUPERADMIN_PASSWORD
                    });
                    
                    if (retryAuthError) {
                        console.log(`   ❌ Authentication still failed: ${retryAuthError.message}`);
                    } else {
                        console.log('   ✅ Authentication successful after email confirmation!');
                        await testClient.auth.signOut();
                    }
                }
            }
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   👤 User ID: ${authData.user.id}`);
            console.log(`   📧 Email: ${authData.user.email}`);
            
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
        
        console.log('\n🎉 SUCCESS: User recreated successfully!');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log(`🆔 New User ID: ${newUserId}`);
        
        console.log('\n💡 Next steps:');
        console.log('   1. Try signing in with the credentials above');
        console.log('   2. If authentication still fails, check Supabase Auth dashboard');
        console.log('   3. Confirm the email if required');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check Supabase dashboard for any remaining user records');
        console.log('   2. Manually delete the user from Auth dashboard if needed');
        console.log('   3. Ensure RLS policies allow user creation');
        return false;
    }
}

// Run the recreation
deleteAndRecreateUser()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });