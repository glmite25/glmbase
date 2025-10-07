#!/usr/bin/env node

/**
 * Create Fresh Ojide User
 * Alternative approach using temporary email then updating
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const TEMP_EMAIL = 'ojidelawrence.temp@gmail.com'; // Temporary email for creation
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

async function createFreshUser() {
    console.log('🆕 Creating fresh Ojide Lawrence user...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Create user with temporary email
        console.log('1. Creating user with temporary email...');
        
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
            email: TEMP_EMAIL,
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
        console.log(`   ✅ Created user with ID: ${newUserId}`);
        console.log(`   📧 Temporary email: ${TEMP_EMAIL}`);
        
        // Step 2: Create profiles record with correct email
        console.log('\n2. Creating profiles record...');
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: newUserId,
                email: SUPERADMIN_EMAIL, // Use the real email here
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
        console.log('   ✅ Profile created with correct email');
        
        // Step 3: Create members record with correct email
        console.log('\n3. Creating members record...');
        const { error: memberError } = await supabase
            .from('members')
            .insert({
                user_id: newUserId,
                email: SUPERADMIN_EMAIL, // Use the real email here
                fullname: 'Ojide Lawrence',
                category: 'Pastors',
                isactive: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (memberError) {
            throw new Error(`Failed to create member: ${memberError.message}`);
        }
        console.log('   ✅ Member record created with correct email');
        
        // Step 4: Create user_roles record
        console.log('\n4. Creating superuser role...');
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
        console.log('   ✅ Superuser role created');
        
        // Step 5: Test authentication with temporary email first
        console.log('\n5. Testing authentication with temporary email...');
        
        const { data: tempAuthData, error: tempAuthError } = await testClient.auth.signInWithPassword({
            email: TEMP_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (tempAuthError) {
            console.log(`   ❌ Temp authentication failed: ${tempAuthError.message}`);
        } else {
            console.log('   ✅ Temporary authentication successful!');
            
            // Test profile access
            const { data: profileData, error: profileAccessError } = await testClient
                .from('profiles')
                .select('*')
                .eq('id', tempAuthData.user.id)
                .single();
            
            if (profileAccessError) {
                console.log(`   ⚠️  Profile access warning: ${profileAccessError.message}`);
            } else {
                console.log(`   ✅ Profile access successful - Role: ${profileData.role}`);
                console.log(`   📧 Profile email: ${profileData.email}`);
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎉 SUCCESS: Fresh user created!');
        console.log(`🆔 User ID: ${newUserId}`);
        console.log(`📧 Auth Email (temporary): ${TEMP_EMAIL}`);
        console.log(`📧 Profile/Members Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        
        console.log('\n💡 Next steps:');
        console.log(`   1. Try signing in with: ${TEMP_EMAIL} / ${SUPERADMIN_PASSWORD}`);
        console.log('   2. The system will recognize you as the superuser based on profile data');
        console.log('   3. Optionally, update the auth email in Supabase dashboard later');
        
        console.log('\n🧪 Testing the setup...');
        
        // Final comprehensive test
        const { data: finalAuthData, error: finalAuthError } = await testClient.auth.signInWithPassword({
            email: TEMP_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (finalAuthError) {
            console.log(`❌ Final test failed: ${finalAuthError.message}`);
            return false;
        }
        
        console.log('✅ Final authentication test passed!');
        
        // Test all data access
        const { data: allProfiles } = await testClient.from('profiles').select('count');
        const { data: allMembers } = await testClient.from('members').select('count');
        const { data: allRoles } = await testClient.from('user_roles').select('count');
        
        console.log(`✅ Can access profiles: ${allProfiles ? 'Yes' : 'No'}`);
        console.log(`✅ Can access members: ${allMembers ? 'Yes' : 'No'}`);
        console.log(`✅ Can access user_roles: ${allRoles ? 'Yes' : 'No'}`);
        
        await testClient.auth.signOut();
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the creation
createFreshUser()
    .then(success => {
        if (success) {
            console.log('\n🎊 COMPLETE: Ojide can now sign in!');
            console.log(`📧 Use email: ${TEMP_EMAIL}`);
            console.log(`🔑 Use password: ${SUPERADMIN_PASSWORD}`);
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });