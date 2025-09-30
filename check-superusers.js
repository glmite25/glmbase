/**
 * Check current superusers in the system and make ojidelawrence a superadmin
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndManageSuperusers() {
  console.log('🔍 Checking current superusers in the system...\n');
  
  try {
    // Check current superusers from user_roles table
    const { data: superuserRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .eq('role', 'superuser');
    
    if (rolesError) {
      console.error('Error fetching superuser roles:', rolesError);
      throw rolesError;
    }
    
    // Check current superusers from profiles table
    const { data: superuserProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'superuser');
    
    if (profilesError) {
      console.error('Error fetching superuser profiles:', profilesError);
      throw profilesError;
    }
    
    console.log('📊 CURRENT SUPERUSERS SUMMARY:');
    console.log('================================');
    console.log(`Total superusers in user_roles table: ${superuserRoles?.length || 0}`);
    console.log(`Total superusers in profiles table: ${superuserProfiles?.length || 0}`);
    
    if (superuserProfiles && superuserProfiles.length > 0) {
      console.log('\n👑 Current Superusers:');
      superuserProfiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name || 'No name'} (${profile.email || 'No email'})`);
        console.log(`   ID: ${profile.id}`);
      });
    } else {
      console.log('\n⚠️  No superusers found in profiles table');
    }
    
    // Check if ojidelawrence is already a superuser
    const isAlreadySuperuser = superuserProfiles?.some(
      profile => profile.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
    );
    
    if (isAlreadySuperuser) {
      console.log(`\n✅ ${SUPERADMIN_EMAIL} is already a superuser!`);
      return;
    }
    
    console.log(`\n🔧 Making ${SUPERADMIN_EMAIL} a superadmin...`);
    
    // Get all users to find ojidelawrence
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }
    
    const user = users.users.find(u => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());
    
    if (!user) {
      console.log('❌ User not found in auth system. Creating user...');
      
      // Create the user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: 'Fa-#8rC6DRTkd$5',
        email_confirm: true,
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
      user = newUser.user;
    }
    
    // Update/create profile
    const { error: upsertProfileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: SUPERADMIN_EMAIL.toLowerCase(),
        full_name: 'Lawrence Ojide',
        role: 'superuser',
        updated_at: new Date().toISOString()
      });
    
    if (upsertProfileError) {
      console.error('Error upserting profile:', upsertProfileError);
      throw upsertProfileError;
    }
    
    // Add superuser role
    const { error: insertRoleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'superuser',
        created_at: new Date().toISOString()
      });
    
    if (insertRoleError) {
      console.error('Error inserting user role:', insertRoleError);
      throw insertRoleError;
    }
    
    // Create/update member record
    const { error: upsertMemberError } = await supabase
      .from('members')
      .upsert({
        id: user.id,
        fullname: 'Lawrence Ojide',
        email: SUPERADMIN_EMAIL.toLowerCase(),
        category: 'Pastors',
        churchunit: 'Administration',
        isactive: true,
        joindate: new Date().toISOString().split('T')[0],
        userid: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (upsertMemberError) {
      console.error('Error upserting member record:', upsertMemberError);
    }
    
    console.log('\n🎉 SUCCESS! ojidelawrence@gmail.com is now a superadmin!');
    console.log('\nLogin credentials:');
    console.log('Email: ojidelawrence@gmail.com');
    console.log('Password: Fa-#8rC6DRTkd$5');
    
    // Final count
    const { data: finalCount } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'superuser');
    
    console.log(`\n📊 Total superusers now: ${finalCount?.length || 0}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
checkAndManageSuperusers();