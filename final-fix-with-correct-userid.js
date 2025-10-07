#!/usr/bin/env node

/**
 * Final Fix with Correct User ID
 * Use the actual user ID from the auth system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';
const CORRECT_USER_ID = 'dfe576dc-5585-4fa0-8017-cd2fda28f0c0'; // From the previous output

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

async function finalFixWithCorrectUserId() {
    console.log('🎯 Final fix with correct user ID...\n');
    console.log(`Using User ID: ${CORRECT_USER_ID}`);
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Create profile record with correct user ID
        console.log('\n1. Creating profile record...');
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: CORRECT_USER_ID,
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
            console.log(`   ❌ Profile creation failed: ${profileError.message}`);
        } else {
            console.log('   ✅ Profile created successfully');
        }
        
        // Step 2: Create member record
        console.log('\n2. Creating member record...');
        const { error: memberError } = await supabase
            .from('members')
            .upsert({
                user_id: CORRECT_USER_ID,
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
            console.log(`   ❌ Member creation failed: ${memberError.message}`);
        } else {
            console.log('   ✅ Member created successfully');
        }
        
        // Step 3: Create user role record
        console.log('\n3. Creating user role record...');
        const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
                user_id: CORRECT_USER_ID,
                role: 'superuser',
                created_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,role'
            });
        
        if (roleError) {
            console.log(`   ❌ Role creation failed: ${roleError.message}`);
        } else {
            console.log('   ✅ User role created successfully');
        }
        
        // Step 4: Verify records were created
        console.log('\n4. Verifying records...');
        
        const { data: profileData, error: profileCheckError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', CORRECT_USER_ID)
            .single();
        
        const { data: memberData, error: memberCheckError } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', CORRECT_USER_ID)
            .single();
        
        const { data: rolesData, error: rolesCheckError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', CORRECT_USER_ID);
        
        console.log(`   Profile exists: ${profileData && !profileCheckError ? '✅' : '❌'}`);
        console.log(`   Member exists: ${memberData && !memberCheckError ? '✅' : '❌'}`);
        console.log(`   Roles exist: ${rolesData && rolesData.length > 0 && !rolesCheckError ? '✅' : '❌'}`);
        
        if (profileData) {
            console.log(`   Profile role: ${profileData.role}`);
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
            
            console.log('\n   🔧 Final troubleshooting steps:');
            console.log('   1. The user exists in auth.users but authentication is failing');
            console.log('   2. This is likely due to email confirmation or RLS policies');
            console.log('   3. Go to Supabase Auth dashboard and:');
            console.log('      - Find user: ojidelawrence@gmail.com');
            console.log('      - Confirm the email manually');
            console.log('      - Reset password to: Fa-#8rC6DRTkd$5');
            console.log('   4. Or run this SQL in Supabase SQL Editor:');
            console.log(`      UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${CORRECT_USER_ID}';`);
            
        } else {
            console.log('   ✅ Authentication successful!');
            console.log(`   👤 User ID: ${authData.user.id}`);
            console.log(`   📧 Email: ${authData.user.email}`);
            console.log(`   ✉️  Email confirmed: ${authData.user.email_confirmed_at ? 'Yes' : 'No'}`);
            
            // Test data access
            const { data: testProfileData, error: profileAccessError } = await testClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileAccessError) {
                console.log(`   ⚠️  Profile access error: ${profileAccessError.message}`);
            } else {
                console.log(`   ✅ Profile access successful - Role: ${testProfileData.role}`);
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎯 FINAL SUMMARY:');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log(`🆔 User ID: ${CORRECT_USER_ID}`);
        
        const allRecordsCreated = profileData && memberData && rolesData && rolesData.length > 0;
        
        if (allRecordsCreated && !authError) {
            console.log('\n🎉 COMPLETE SUCCESS: Ojide can now sign in!');
        } else if (allRecordsCreated && authError) {
            console.log('\n🔧 ALMOST THERE: Records created, but authentication needs manual fix');
            console.log('   Go to Supabase dashboard and confirm the email');
        } else {
            console.log('\n❌ PARTIAL SUCCESS: Some records may not have been created');
        }
        
        return allRecordsCreated && !authError;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the final fix
finalFixWithCorrectUserId()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });