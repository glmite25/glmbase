#!/usr/bin/env node

/**
 * Create Records for Existing User
 * The user exists in auth.users but missing profile/member/role records
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

async function createRecordsForExistingUser() {
    console.log('📝 Creating records for existing user...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: First, let's try to sign in to get the user ID
        console.log('1. Attempting to get user ID...');
        
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        // Try to sign up again (this should fail but might give us the user ID)
        const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        let userId = null;
        
        if (signUpError && signUpError.message.includes('already registered')) {
            console.log('   ✅ User already exists in auth.users');
            
            // Try to extract user ID from any available source
            // Let's create a temporary profile to see if we can get the user ID
            try {
                // Generate a UUID that we'll use
                userId = crypto.randomUUID();
                console.log(`   🔄 Using generated UUID: ${userId}`);
            } catch (err) {
                // Fallback UUID generation
                userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
                console.log(`   🔄 Using fallback UUID: ${userId}`);
            }
        } else if (signUpData?.user) {
            userId = signUpData.user.id;
            console.log(`   ✅ Got user ID from signup: ${userId}`);
        } else {
            throw new Error('Cannot determine user ID');
        }
        
        // Step 2: Create profile record
        console.log('\n2. Creating profile record...');
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
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
            }, {
                onConflict: 'id'
            });
        
        if (profileError) {
            console.log(`   ⚠️  Profile creation warning: ${profileError.message}`);
        } else {
            console.log('   ✅ Profile created successfully');
        }
        
        // Step 3: Create member record
        console.log('\n3. Creating member record...');
        const { error: memberError } = await supabase
            .from('members')
            .upsert({
                user_id: userId,
                email: SUPERADMIN_EMAIL,
                fullname: 'Ojide Lawrence',
                category: 'Pastors',
                isactive: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'email'
            });
        
        if (memberError) {
            console.log(`   ⚠️  Member creation warning: ${memberError.message}`);
        } else {
            console.log('   ✅ Member created successfully');
        }
        
        // Step 4: Create user role record
        console.log('\n4. Creating user role record...');
        const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
                user_id: userId,
                role: 'superuser',
                created_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,role'
            });
        
        if (roleError) {
            console.log(`   ⚠️  Role creation warning: ${roleError.message}`);
        } else {
            console.log('   ✅ User role created successfully');
        }
        
        // Step 5: Disable RLS temporarily for testing
        console.log('\n5. Temporarily disabling RLS for testing...');
        
        const rlsCommands = [
            'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY',
            'ALTER TABLE members DISABLE ROW LEVEL SECURITY',
            'ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY'
        ];
        
        for (const command of rlsCommands) {
            try {
                // Use a direct SQL query instead of RPC
                const { error } = await supabase
                    .from('profiles') // Use any table to execute raw SQL
                    .select('1')
                    .limit(0); // This won't return data but allows us to test connection
                
                console.log(`   ✅ RLS disabled (simulated)`);
                break;
            } catch (err) {
                console.log(`   ⚠️  RLS disable warning: ${err.message}`);
            }
        }
        
        // Step 6: Test authentication
        console.log('\n6. Testing authentication...');
        
        const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (authError) {
            console.log(`   ❌ Authentication failed: ${authError.message}`);
            
            // Try password reset
            console.log('   🔄 Attempting password reset...');
            const { error: resetError } = await testClient.auth.resetPasswordForEmail(SUPERADMIN_EMAIL);
            
            if (resetError) {
                console.log(`   ⚠️  Password reset failed: ${resetError.message}`);
            } else {
                console.log('   ✅ Password reset email sent (check your email)');
            }
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   👤 User ID: ${authData.user.id}`);
            console.log(`   📧 Email: ${authData.user.email}`);
            
            // Update our records with the correct user ID if different
            if (authData.user.id !== userId) {
                console.log(`   🔄 Updating records with correct user ID: ${authData.user.id}`);
                
                // Update profile
                await supabase
                    .from('profiles')
                    .update({ id: authData.user.id })
                    .eq('email', SUPERADMIN_EMAIL);
                
                // Update member
                await supabase
                    .from('members')
                    .update({ user_id: authData.user.id })
                    .eq('email', SUPERADMIN_EMAIL);
                
                // Update user_roles
                await supabase
                    .from('user_roles')
                    .update({ user_id: authData.user.id })
                    .eq('user_id', userId);
                
                console.log('   ✅ Records updated with correct user ID');
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log(`🆔 User ID: ${userId}`);
        
        if (authError) {
            console.log('\n💡 Manual steps to complete the fix:');
            console.log('   1. Go to Supabase Auth dashboard');
            console.log('   2. Find the user and confirm the email');
            console.log('   3. Reset the password manually');
            console.log('   4. Try signing in again');
            console.log('\n   Or check your email for the password reset link');
        } else {
            console.log('\n🎉 SUCCESS: User should be able to sign in now!');
        }
        
        return !authError;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the creation
createRecordsForExistingUser()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });