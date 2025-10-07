#!/usr/bin/env node

/**
 * Upgrade Popsabey to Super Admin
 * Update existing popsabey1@gmail.com account to have superuser privileges
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const POPSABEY_EMAIL = 'popsabey1@gmail.com';

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

async function upgradePopsabeyToSuperAdmin() {
    console.log('👑 Upgrading Popsabey to Super Admin...\n');
    console.log(`Target email: ${POPSABEY_EMAIL}`);
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Find existing profile
        console.log('\n1. Finding existing profile...');
        const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', POPSABEY_EMAIL)
            .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
            throw new Error(`Profile query error: ${profileError.message}`);
        }
        
        if (!existingProfile) {
            console.log('   ❌ Profile not found');
            throw new Error('Popsabey profile not found. Please ensure they are registered.');
        }
        
        console.log('   ✅ Found existing profile');
        console.log(`   🆔 User ID: ${existingProfile.id}`);
        console.log(`   📧 Email: ${existingProfile.email}`);
        console.log(`   👤 Current role: ${existingProfile.role}`);
        
        const userId = existingProfile.id;
        
        // Step 2: Update profile role to superuser
        console.log('\n2. Updating profile role to superuser...');
        const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
                role: 'superuser',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (updateProfileError) {
            throw new Error(`Failed to update profile: ${updateProfileError.message}`);
        }
        console.log('   ✅ Profile role updated to superuser');
        
        // Step 3: Check/update member record
        console.log('\n3. Checking member record...');
        const { data: existingMember, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('email', POPSABEY_EMAIL)
            .single();
        
        if (memberError && memberError.code !== 'PGRST116') {
            console.log(`   ⚠️  Member query warning: ${memberError.message}`);
        }
        
        if (!existingMember) {
            console.log('   🔄 Creating member record...');
            const { error: createMemberError } = await supabase
                .from('members')
                .insert({
                    user_id: userId,
                    email: POPSABEY_EMAIL,
                    fullname: existingProfile.full_name || 'Popsabey Admin',
                    category: 'Pastors',
                    isactive: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (createMemberError) {
                console.log(`   ⚠️  Member creation warning: ${createMemberError.message}`);
            } else {
                console.log('   ✅ Member record created');
            }
        } else {
            console.log('   ✅ Member record exists');
            console.log(`   📋 Category: ${existingMember.category}`);
            console.log(`   ✅ Active: ${existingMember.isactive}`);
            
            // Update member to ensure it's active and linked properly
            const { error: updateMemberError } = await supabase
                .from('members')
                .update({
                    user_id: userId,
                    isactive: true,
                    updated_at: new Date().toISOString()
                })
                .eq('email', POPSABEY_EMAIL);
            
            if (updateMemberError) {
                console.log(`   ⚠️  Member update warning: ${updateMemberError.message}`);
            } else {
                console.log('   ✅ Member record updated');
            }
        }
        
        // Step 4: Add/update superuser role
        console.log('\n4. Adding superuser role...');
        const { data: existingRole, error: roleQueryError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('role', 'superuser')
            .single();
        
        if (roleQueryError && roleQueryError.code !== 'PGRST116') {
            console.log(`   ⚠️  Role query warning: ${roleQueryError.message}`);
        }
        
        if (!existingRole) {
            const { error: createRoleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'superuser',
                    created_at: new Date().toISOString()
                });
            
            if (createRoleError) {
                console.log(`   ⚠️  Role creation warning: ${createRoleError.message}`);
            } else {
                console.log('   ✅ Superuser role added');
            }
        } else {
            console.log('   ✅ Superuser role already exists');
        }
        
        // Step 5: Verify the upgrade
        console.log('\n5. Verifying upgrade...');
        
        const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        const { data: userRoles } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId);
        
        const { data: memberRecord } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        console.log(`   Profile role: ${updatedProfile?.role || 'Not found'}`);
        console.log(`   User roles: ${userRoles?.map(r => r.role).join(', ') || 'None'}`);
        console.log(`   Member active: ${memberRecord?.isactive || 'Not found'}`);
        
        const isSuperAdmin = updatedProfile?.role === 'superuser' && 
                           userRoles?.some(r => r.role === 'superuser');
        
        if (isSuperAdmin) {
            console.log('\n🎉 SUCCESS: Popsabey is now a Super Admin!');
            console.log(`📧 Email: ${POPSABEY_EMAIL}`);
            console.log(`🆔 User ID: ${userId}`);
            console.log(`👑 Role: ${updatedProfile.role}`);
            console.log('\n✅ Popsabey can now:');
            console.log('   - Access all admin features');
            console.log('   - Manage users and roles');
            console.log('   - View all members and profiles');
            console.log('   - Perform superuser operations');
        } else {
            console.log('\n⚠️  PARTIAL SUCCESS: Some records may not have been updated properly');
        }
        
        return isSuperAdmin;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the upgrade
upgradePopsabeyToSuperAdmin()
    .then(success => {
        if (success) {
            console.log('\n🎊 UPGRADE COMPLETE: Popsabey is now a Super Admin!');
        } else {
            console.log('\n❌ UPGRADE FAILED: Check the errors above');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });