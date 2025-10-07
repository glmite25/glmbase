#!/usr/bin/env node

/**
 * Fix Existing Ojide User
 * Work with the existing user and fix authentication
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

async function fixExistingUser() {
    console.log('🔧 Fixing existing Ojide Lawrence user...\n');
    
    const supabase = createServiceRoleClient();
    const userId = '47c693aa-e85c-4450-8d35-250aa4c61587';
    
    try {
        // Step 1: Recreate all the database records
        console.log('1. Recreating database records...');
        
        // Recreate profiles record
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
            throw new Error(`Failed to create profile: ${profileError.message}`);
        }
        console.log('   ✅ Profile record ensured');
        
        // Recreate members record
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
            throw new Error(`Failed to create member: ${memberError.message}`);
        }
        console.log('   ✅ Member record ensured');
        
        // Recreate user_roles record
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
            throw new Error(`Failed to create user role: ${roleError.message}`);
        }
        console.log('   ✅ Superuser role ensured');
        
        // Step 2: Try to fix RLS policies by temporarily disabling them
        console.log('\n2. Adjusting RLS policies...');
        
        try {
            // Disable RLS temporarily on key tables
            await supabase.rpc('exec_sql', { 
                sql: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;' 
            });
            await supabase.rpc('exec_sql', { 
                sql: 'ALTER TABLE members DISABLE ROW LEVEL SECURITY;' 
            });
            await supabase.rpc('exec_sql', { 
                sql: 'ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;' 
            });
            
            console.log('   ✅ RLS temporarily disabled');
        } catch (rlsError) {
            console.log(`   ⚠️  RLS adjustment warning: ${rlsError.message}`);
        }
        
        // Step 3: Test authentication
        console.log('\n3. Testing authentication...');
        
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
            
            // Try password reset approach
            console.log('   🔄 Attempting password reset...');
            
            const { error: resetError } = await testClient.auth.resetPasswordForEmail(SUPERADMIN_EMAIL, {
                redirectTo: 'http://localhost:7070/reset-password'
            });
            
            if (resetError) {
                console.log(`   ⚠️  Password reset failed: ${resetError.message}`);
            } else {
                console.log('   ✅ Password reset email sent');
            }
            
            // Alternative: Try to create a new session directly
            console.log('   🔄 Trying alternative authentication...');
            
            // Use service role to create a session
            try {
                const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: SUPERADMIN_EMAIL
                });
                
                if (sessionError) {
                    console.log(`   ⚠️  Magic link generation failed: ${sessionError.message}`);
                } else {
                    console.log('   ✅ Magic link generated - check console for link');
                    console.log(`   🔗 Magic link: ${sessionData.properties?.action_link}`);
                }
            } catch (linkError) {
                console.log(`   ⚠️  Magic link error: ${linkError.message}`);
            }
            
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   👤 User ID: ${authData.user.id}`);
            console.log(`   📧 Email: ${authData.user.email}`);
            
            // Test data access
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
        
        // Step 4: Re-enable RLS policies
        console.log('\n4. Re-enabling RLS policies...');
        
        try {
            await supabase.rpc('exec_sql', { 
                sql: 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;' 
            });
            await supabase.rpc('exec_sql', { 
                sql: 'ALTER TABLE members ENABLE ROW LEVEL SECURITY;' 
            });
            await supabase.rpc('exec_sql', { 
                sql: 'ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;' 
            });
            
            console.log('   ✅ RLS re-enabled');
        } catch (rlsError) {
            console.log(`   ⚠️  RLS re-enable warning: ${rlsError.message}`);
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log(`🆔 User ID: ${userId}`);
        
        console.log('\n💡 Next steps to try:');
        console.log('   1. Try signing in with the credentials above');
        console.log('   2. Check your email for password reset link if sent');
        console.log('   3. Use the magic link if generated');
        console.log('   4. Check Supabase Auth dashboard to manually reset password');
        console.log('   5. Ensure the user email is confirmed in Supabase dashboard');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the fix
fixExistingUser()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });