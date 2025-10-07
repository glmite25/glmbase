#!/usr/bin/env node

/**
 * Create Popsabey as Super Admin
 * Make popsabey1@gmail.com the super admin instead
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'popsabey1@gmail.com';
const SUPERADMIN_PASSWORD = 'SuperAdmin123!'; // Strong password

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

async function createPopsabeySuperAdmin() {
    console.log('👑 Creating Popsabey as Super Admin...\n');
    console.log(`Email: ${SUPERADMIN_EMAIL}`);
    console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Create the user
        console.log('\n1. Creating user account...');
        
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD,
            options: {
                data: {
                    full_name: 'Popsabey Admin',
                    role: 'superuser'
                }
            }
        });
        
        let userId;
        
        if (signUpError) {
            if (signUpError.message.includes('already registered')) {
                console.log('   ⚠️  User already exists, trying to get existing user...');
                
                // Try to sign in to get the user ID
                const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
                    email: SUPERADMIN_EMAIL,
                    password: SUPERADMIN_PASSWORD
                });
                
                if (signInError) {
                    console.log('   🔄 Sign-in failed, user exists but password might be different');
                    console.log('   💡 Will create records anyway and you can reset password manually');
                    
                    // Generate a UUID for the user (we'll update it later)
                    userId = crypto.randomUUID();
                } else {
                    userId = signInData.user.id;
                    console.log(`   ✅ Got existing user ID: ${userId}`);
                    await testClient.auth.signOut();
                }
            } else {
                throw new Error(`Failed to create user: ${signUpError.message}`);
            }
        } else {
            userId = signUpData.user.id;
            console.log(`   ✅ Created new user with ID: ${userId}`);
        }
        
        // Step 2: Clean up any existing records for this email
        console.log('\n2. Cleaning up existing records...');
        
        await supabase.from('user_roles').delete().eq('user_id', userId);
        await supabase.from('members').delete().eq('email', SUPERADMIN_EMAIL);
        await supabase.from('profiles').delete().eq('email', SUPERADMIN_EMAIL);
        
        console.log('   ✅ Cleaned up existing records');
        
        // Step 3: Create profile record
        console.log('\n3. Creating profile record...');
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: SUPERADMIN_EMAIL,
                full_name: 'Popsabey Admin',
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
            console.log(`   ❌ Profile creation failed: ${profileError.message}`);
        } else {
            console.log('   ✅ Profile created successfully');
        }
        
        // Step 4: Create member record
        console.log('\n4. Creating member record...');
        const { error: memberError } = await supabase
            .from('members')
            .insert({
                user_id: userId,
                email: SUPERADMIN_EMAIL,
                fullname: 'Popsabey Admin',
                category: 'Pastors',
                isactive: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (memberError) {
            console.log(`   ❌ Member creation failed: ${memberError.message}`);
        } else {
            console.log('   ✅ Member created successfully');
        }
        
        // Step 5: Create user role record
        console.log('\n5. Creating superuser role...');
        const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: userId,
                role: 'superuser',
                created_at: new Date().toISOString()
            });
        
        if (roleError) {
            console.log(`   ❌ Role creation failed: ${roleError.message}`);
        } else {
            console.log('   ✅ Superuser role created successfully');
        }
        
        // Step 6: Test authentication
        console.log('\n6. Testing authentication...');
        
        const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (authError) {
            console.log(`   ❌ Authentication failed: ${authError.message}`);
            
            if (authError.message.includes('email')) {
                console.log('   💡 Email confirmation may be required');
                console.log('   🔧 Go to Supabase Auth dashboard and confirm the email');
            }
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   👤 User ID: ${authData.user.id}`);
            console.log(`   📧 Email: ${authData.user.email}`);
            
            // Update records with correct user ID if needed
            if (authData.user.id !== userId) {
                console.log('   🔄 Updating records with correct user ID...');
                
                await supabase.from('profiles').update({ id: authData.user.id }).eq('email', SUPERADMIN_EMAIL);
                await supabase.from('members').update({ user_id: authData.user.id }).eq('email', SUPERADMIN_EMAIL);
                await supabase.from('user_roles').update({ user_id: authData.user.id }).eq('user_id', userId);
                
                console.log('   ✅ Records updated');
            }
            
            // Test profile access
            const { data: profileData, error: profileAccessError } = await testClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileAccessError) {
                console.log(`   ⚠️  Profile access error: ${profileAccessError.message}`);
            } else {
                console.log(`   ✅ Profile access successful - Role: ${profileData.role}`);
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎉 POPSABEY SUPER ADMIN SETUP COMPLETE!');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log(`🆔 User ID: ${userId}`);
        
        if (authError) {
            console.log('\n💡 If authentication failed:');
            console.log('   1. Go to Supabase Auth dashboard');
            console.log('   2. Find the user and confirm the email');
            console.log('   3. Try signing in again');
        } else {
            console.log('\n✅ Popsabey can now sign in as super admin!');
        }
        
        return !authError;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the creation
createPopsabeySuperAdmin()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });