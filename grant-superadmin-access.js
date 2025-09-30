/**
 * Grant permanent superadmin access to ojidelawrence@gmail.com
 * This script will ensure the user has proper superadmin privileges
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  console.error('URL:', !!supabaseUrl);
  console.error('Service Key:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function grantSuperAdminAccess() {
  console.log(`🔧 Granting permanent superadmin access to ${SUPERADMIN_EMAIL}...`);
  
  try {
    // Step 1: Check if user exists in auth.users
    console.log('1. Checking if user exists in auth system...');
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }
    
    const user = users.users.find(u => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());
    
    if (!user) {
      console.log('❌ User not found in auth system. Creating user...');
      
      // Create the user with a temporary password
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: 'Fa-#8rC6DRTkd$5', // Your provided password
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Lawrence Ojide',
          role: 'superuser'
        }
      });
      
      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }
      
      console.log('✅ User created successfully');
      console.log('User ID:', newUser.user.id);
    } else {
      console.log('✅ User found in auth system');
      console.log('User ID:', user.id);
      console.log('Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      
      // Update user password if needed
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: 'Fa-#8rC6DRTkd$5',
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          role: 'superuser'
        }
      });
      
      if (updateError) {
        console.error('Error updating user:', updateError);
      } else {
        console.log('✅ User password and metadata updated');
      }
    }
    
    // Get the current user (after creation or finding)
    const { data: currentUsers } = await supabase.auth.admin.listUsers();
    const currentUser = currentUsers.users.find(u => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());
    
    if (!currentUser) {
      throw new Error('User not found after creation/update');
    }
    
    // Step 2: Ensure profile exists
    console.log('2. Checking/creating profile...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError);
    }
    
    if (!profile) {
      console.log('Creating profile...');
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          email: SUPERADMIN_EMAIL.toLowerCase(),
          full_name: 'Lawrence Ojide',
          role: 'superuser',
          updated_at: new Date().toISOString()
        });
      
      if (insertProfileError) {
        console.error('Error creating profile:', insertProfileError);
      } else {
        console.log('✅ Profile created');
      }
    } else {
      console.log('✅ Profile exists');
      
      // Update profile to ensure superuser role
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          role: 'superuser',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);
      
      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
      } else {
        console.log('✅ Profile updated with superuser role');
      }
    }
    
    // Step 3: Ensure user_roles entry exists
    console.log('3. Checking/creating user_roles entry...');
    
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('role', 'superuser')
      .maybeSingle();
    
    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Error checking user_roles:', roleError);
    }
    
    if (!userRole) {
      console.log('Creating user_roles entry...');
      const { error: insertRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: currentUser.id,
          role: 'superuser',
          created_at: new Date().toISOString()
        });
      
      if (insertRoleError) {
        console.error('Error creating user_roles entry:', insertRoleError);
      } else {
        console.log('✅ User_roles entry created');
      }
    } else {
      console.log('✅ User_roles entry exists');
    }
    
    // Step 4: Ensure member record exists
    console.log('4. Checking/creating member record...');
    
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('userid', currentUser.id)
      .maybeSingle();
    
    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error checking members:', memberError);
    }
    
    if (!member) {
      console.log('Creating member record...');
      const { error: insertMemberError } = await supabase
        .from('members')
        .insert({
          fullname: 'Lawrence Ojide',
          email: SUPERADMIN_EMAIL.toLowerCase(),
          category: 'Pastors',
          churchunit: 'Administration',
          isactive: true,
          joindate: new Date().toISOString().split('T')[0],
          userid: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertMemberError) {
        console.error('Error creating member record:', insertMemberError);
      } else {
        console.log('✅ Member record created');
      }
    } else {
      console.log('✅ Member record exists');
    }
    
    console.log('\n🎉 SUCCESS! Permanent superadmin access granted to ojidelawrence@gmail.com');
    console.log('\nYou can now sign in with:');
    console.log('Email: ojidelawrence@gmail.com');
    console.log('Password: Fa-#8rC6DRTkd$5');
    console.log('\nYour account has full superadmin privileges.');
    
  } catch (error) {
    console.error('\n❌ Error granting superadmin access:', error);
    process.exit(1);
  }
}

// Run the script
grantSuperAdminAccess();