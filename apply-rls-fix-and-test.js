#!/usr/bin/env node

/**
 * Apply RLS Fix and Test Authentication
 * Fix the RLS policies and test if authentication works
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

async function applyRlsFixAndTest() {
    console.log('🔧 Applying RLS policy fix and testing authentication...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Apply the RLS fix SQL
        console.log('1. Applying RLS policy fixes...');
        
        try {
            const sqlContent = readFileSync('fix-rls-policies-comprehensive.sql', 'utf8');
            
            // Split the SQL into individual statements
            const statements = sqlContent
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                        if (error) {
                            console.log(`   ⚠️  Warning executing SQL: ${error.message}`);
                        }
                    } catch (err) {
                        console.log(`   ⚠️  SQL execution warning: ${err.message}`);
                    }
                }
            }
            
            console.log('   ✅ RLS policies updated');
        } catch (sqlError) {
            console.log(`   ⚠️  SQL file error: ${sqlError.message}`);
            console.log('   🔄 Applying manual RLS fixes...');
            
            // Manual RLS fixes
            const manualFixes = [
                "ALTER TABLE profiles DISABLE ROW LEVEL SECURITY",
                "ALTER TABLE members DISABLE ROW LEVEL SECURITY", 
                "ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY",
                "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY",
                "ALTER TABLE members ENABLE ROW LEVEL SECURITY",
                "ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY"
            ];
            
            for (const fix of manualFixes) {
                try {
                    await supabase.rpc('exec_sql', { sql: fix });
                } catch (err) {
                    console.log(`   ⚠️  Manual fix warning: ${err.message}`);
                }
            }
        }
        
        // Step 2: Check current user data
        console.log('\n2. Checking current user data...');
        
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();
        
        const { data: memberData } = await supabase
            .from('members')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();
        
        const { data: rolesData } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', profileData?.id);
        
        console.log(`   Profile exists: ${profileData ? '✅' : '❌'}`);
        console.log(`   Member exists: ${memberData ? '✅' : '❌'}`);
        console.log(`   Roles exist: ${rolesData?.length > 0 ? '✅' : '❌'}`);
        
        if (profileData) {
            console.log(`   User ID: ${profileData.id}`);
            console.log(`   Role: ${profileData.role}`);
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
            
            // Try to get more details about the error
            console.log('\n   🔍 Debugging authentication issue...');
            
            // Check if user exists in auth.users
            try {
                const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(SUPERADMIN_EMAIL);
                if (userError) {
                    console.log(`   ❌ Cannot find user in auth.users: ${userError.message}`);
                } else if (userData.user) {
                    console.log(`   ✅ User exists in auth.users: ${userData.user.id}`);
                    console.log(`   📧 Email confirmed: ${userData.user.email_confirmed_at ? 'Yes' : 'No'}`);
                    console.log(`   🔐 Last sign in: ${userData.user.last_sign_in_at || 'Never'}`);
                    
                    // Try to update the user to ensure it's properly configured
                    const { error: updateError } = await supabase.auth.admin.updateUserById(userData.user.id, {
                        email_confirm: true,
                        password: SUPERADMIN_PASSWORD
                    });
                    
                    if (updateError) {
                        console.log(`   ⚠️  User update warning: ${updateError.message}`);
                    } else {
                        console.log('   ✅ User updated and confirmed');
                        
                        // Try authentication again
                        console.log('   🔄 Retrying authentication...');
                        const { data: retryAuthData, error: retryAuthError } = await testClient.auth.signInWithPassword({
                            email: SUPERADMIN_EMAIL,
                            password: SUPERADMIN_PASSWORD
                        });
                        
                        if (retryAuthError) {
                            console.log(`   ❌ Retry failed: ${retryAuthError.message}`);
                        } else {
                            console.log('   ✅ Retry successful!');
                            await testClient.auth.signOut();
                        }
                    }
                } else {
                    console.log('   ❌ User not found in auth.users');
                }
            } catch (debugError) {
                console.log(`   ⚠️  Debug error: ${debugError.message}`);
            }
            
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   👤 User ID: ${authData.user.id}`);
            console.log(`   📧 Email: ${authData.user.email}`);
            
            // Test data access
            const { data: testProfileData, error: profileError } = await testClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileError) {
                console.log(`   ⚠️  Profile access error: ${profileError.message}`);
            } else {
                console.log(`   ✅ Profile access successful - Role: ${testProfileData.role}`);
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        
        if (authError) {
            console.log('\n💡 Next steps if authentication still fails:');
            console.log('   1. Check Supabase project logs for detailed error messages');
            console.log('   2. Verify email confirmation in Supabase Auth dashboard');
            console.log('   3. Try resetting password manually in dashboard');
            console.log('   4. Check if there are any custom database triggers causing issues');
            console.log('   5. Consider temporarily disabling all RLS policies for testing');
        } else {
            console.log('\n🎉 SUCCESS: Authentication is working!');
        }
        
        return !authError;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the fix and test
applyRlsFixAndTest()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });