#!/usr/bin/env node

/**
 * Force Delete Ojide User
 * Remove all database references first, then delete the auth user
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const USER_ID = '47c693aa-e85c-4450-8d35-250aa4c61587';

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

async function forceDeleteUser() {
    console.log('🗑️  Force deleting Ojide Lawrence user and all references...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Delete from user_roles table first (no foreign key dependencies)
        console.log('1. Deleting user_roles records...');
        const { error: deleteRolesError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', USER_ID);
        
        if (deleteRolesError) {
            console.log(`   ⚠️  Warning deleting user_roles: ${deleteRolesError.message}`);
        } else {
            console.log('   ✅ Deleted user_roles records');
        }
        
        // Step 2: Delete from members table
        console.log('\n2. Deleting members records...');
        const { error: deleteMemberError } = await supabase
            .from('members')
            .delete()
            .eq('user_id', USER_ID);
        
        if (deleteMemberError) {
            console.log(`   ⚠️  Warning deleting members: ${deleteMemberError.message}`);
        } else {
            console.log('   ✅ Deleted members record');
        }
        
        // Also delete by email in case user_id doesn't match
        const { error: deleteMemberByEmailError } = await supabase
            .from('members')
            .delete()
            .eq('email', SUPERADMIN_EMAIL);
        
        if (deleteMemberByEmailError) {
            console.log(`   ⚠️  Warning deleting members by email: ${deleteMemberByEmailError.message}`);
        } else {
            console.log('   ✅ Deleted members record by email');
        }
        
        // Step 3: Delete from profiles table
        console.log('\n3. Deleting profiles records...');
        const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', USER_ID);
        
        if (deleteProfileError) {
            console.log(`   ⚠️  Warning deleting profiles: ${deleteProfileError.message}`);
        } else {
            console.log('   ✅ Deleted profiles record');
        }
        
        // Also delete by email in case id doesn't match
        const { error: deleteProfileByEmailError } = await supabase
            .from('profiles')
            .delete()
            .eq('email', SUPERADMIN_EMAIL);
        
        if (deleteProfileByEmailError) {
            console.log(`   ⚠️  Warning deleting profiles by email: ${deleteProfileByEmailError.message}`);
        } else {
            console.log('   ✅ Deleted profiles record by email');
        }
        
        // Step 4: Check for any other tables that might reference this user
        console.log('\n4. Checking for other references...');
        
        // Check if there are any other tables with user_id or references to this user
        const tablesToCheck = [
            'user_sessions', 'user_preferences', 'user_activities', 
            'audit_logs', 'notifications', 'user_permissions'
        ];
        
        for (const table of tablesToCheck) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', USER_ID)
                    .limit(1);
                
                if (!error && data && data.length > 0) {
                    console.log(`   🔍 Found references in ${table}, attempting to delete...`);
                    
                    const { error: deleteError } = await supabase
                        .from(table)
                        .delete()
                        .eq('user_id', USER_ID);
                    
                    if (deleteError) {
                        console.log(`   ⚠️  Warning deleting from ${table}: ${deleteError.message}`);
                    } else {
                        console.log(`   ✅ Deleted references from ${table}`);
                    }
                }
            } catch (err) {
                // Table doesn't exist, ignore
                console.log(`   ℹ️  Table ${table} doesn't exist or not accessible`);
            }
        }
        
        // Step 5: Try to delete the auth user using admin API
        console.log('\n5. Attempting to delete auth user...');
        
        try {
            const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(USER_ID);
            
            if (deleteAuthError) {
                console.log(`   ❌ Failed to delete auth user: ${deleteAuthError.message}`);
                console.log('   💡 You will need to delete manually in Supabase dashboard');
            } else {
                console.log('   ✅ Successfully deleted auth user!');
            }
        } catch (authError) {
            console.log(`   ❌ Exception deleting auth user: ${authError.message}`);
            console.log('   💡 You will need to delete manually in Supabase dashboard');
        }
        
        // Step 6: Verify cleanup
        console.log('\n6. Verifying cleanup...');
        
        const { data: remainingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL);
        
        const { data: remainingMember } = await supabase
            .from('members')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL);
        
        const { data: remainingRoles } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', USER_ID);
        
        console.log(`   Remaining profiles: ${remainingProfile?.length || 0}`);
        console.log(`   Remaining members: ${remainingMember?.length || 0}`);
        console.log(`   Remaining roles: ${remainingRoles?.length || 0}`);
        
        if ((remainingProfile?.length || 0) === 0 && 
            (remainingMember?.length || 0) === 0 && 
            (remainingRoles?.length || 0) === 0) {
            console.log('   ✅ All database references cleaned up!');
        } else {
            console.log('   ⚠️  Some references may still exist');
        }
        
        console.log('\n🎯 CLEANUP COMPLETE!');
        console.log('\n💡 Next steps:');
        console.log('   1. Try deleting the user in Supabase dashboard again');
        console.log('   2. If it still fails, the user should be deletable now');
        console.log('   3. After deletion, create a new user with the same email');
        console.log('   4. Run the setup script to recreate all records');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 FAILED:', error.message);
        return false;
    }
}

// Run the cleanup
forceDeleteUser()
    .then(success => {
        if (success) {
            console.log('\n✅ Database cleanup completed!');
            console.log('Now try deleting the user in Supabase dashboard.');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });