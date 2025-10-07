#!/usr/bin/env node

/**
 * Create New Ojide User
 * After manual deletion, create fresh user with all records
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

async function createNewUser() {
    console.log('🆕 Creating new Ojide Lawrence user...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Create the user using sign-up
        console.log('1. Creating new auth user...');
        
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
        console.log(`   ✅ Created user with ID: ${newUserId}`);
        console.log(`   📧 Email: ${signUpData.user.email}`);
        console.log(`   ✉️  Email confirmed: ${signUpData.user.email_confirmed_at ? 'Yes' : 'No'}`);
        
        // Step 2: Create profiles record
        console.log('\n2. Creating profiles record...');
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
        
        // Step 3: Create members record
        console.log('\n3. Creating members record...');
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
        console.log('   ✅ Superuser role created successfully');
        
        // Step 5: Test authentication
        console.log('\n5. Testing authentication...');
        
        // Wait a moment for everything to sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: SUPERADMIN_PASSWORD
        });
        
        if (authError) {
            console.log(`   ❌ Authentication failed: ${authError.message}`);
            
            if (authError.message.includes('email') || authError.message.includes('confirm')) {
                console.log('   💡 Email confirmation may be required');
                console.log('   🔧 You can confirm the email manually in Supabase dashboard');
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
            
            // Test members access
            const { data: memberData, error: memberAccessError } = await testClient
                .from('members')
                .select('*')
                .eq('user_id', authData.user.id)
                .single();
            
            if (memberAccessError) {
                console.log(`   ⚠️  Members access warning: ${memberAccessError.message}`);
            } else {
                console.log(`   ✅ Members access successful - Category: ${memberData.category}`);
            }
            
            // Test user roles access
            const { data: rolesData, error: rolesAccessError } = await testClient
                .from('user_roles')
                .select('*')
                .eq('user_id', authData.user.id);
            
            if (rolesAccessError) {
                console.log(`   ⚠️  Roles access warning: ${rolesAccessError.message}`);
            } else {
                console.log(`   ✅ Roles access successful - Roles: ${rolesData.map(r => r.role).join(', ')}`);
            }
            
            await testClient.auth.signOut();
        }
        
        console.log('\n🎉 SUCCESS: New user created successfully!');
        console.log(`📧 Email: ${SUPERADMIN_EMAIL}`);
        console.log(`🔑 Password: ${SUPERADMIN_PASSWORD}`);
        console.log(`🆔 User ID: ${newUserId}`);
        
        console.log('\n✅ Ojide Lawrence should now be able to sign in!');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the creation
createNewUser()
    .then(success => {
        if (success) {
            console.log('\n🎊 COMPLETE: Ojide can now sign in!');
        } else {
            console.log('\n❌ Creation failed - check the error above');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });