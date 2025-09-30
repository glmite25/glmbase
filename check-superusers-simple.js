/**
 * Check current superusers and make ojidelawrence a superadmin
 * Using only the profiles table since user_roles may not exist
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
    // Check current superusers from profiles table
    const { data: superuserProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'superuser');
    
    if (profilesError) {
      console.log('Profiles table query failed, checking members table...');
      
      // Try checking members table for admin/superuser roles
      const { data: adminMembers, error: membersError } = await supabase
        .from('members')
        .select('id, fullname, email, category, userid')
        .eq('category', 'Pastors');
      
      if (membersError) {
        console.error('Error fetching from members table:', membersError);
        throw membersError;
      }
      
      console.log('📊 CURRENT ADMIN MEMBERS (Pastors):');
      console.log('===================================');
      console.log(`Total pastors: ${adminMembers?.length || 0}`);
      
      if (adminMembers && adminMembers.length > 0) {
        adminMembers.forEach((member, index) => {
          console.log(`${index + 1}. ${member.fullname || 'No name'} (${member.email || 'No email'})`);
          console.log(`   Category: ${member.category}`);
          console.log(`   User ID: ${member.userid || 'Not linked'}`);
        });
      }
      
      // Check if ojidelawrence exists in members
      const existingMember = adminMembers?.find(
        member => member.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
      );
      
      if (existingMember) {
        console.log(`\n✅ ${SUPERADMIN_EMAIL} already exists as a pastor!`);
        return;
      }
      
    } else {
      console.log('📊 CURRENT SUPERUSERS:');
      console.log('======================');
      console.log(`Total superusers: ${superuserProfiles?.length || 0}`);
      
      if (superuserProfiles && superuserProfiles.length > 0) {
        superuserProfiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.full_name || 'No name'} (${profile.email || 'No email'})`);
          console.log(`   Role: ${profile.role}`);
        });
      }
      
      // Check if ojidelawrence is already a superuser
      const isAlreadySuperuser = superuserProfiles?.some(
        profile => profile.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
      );
      
      if (isAlreadySuperuser) {
        console.log(`\n✅ ${SUPERADMIN_EMAIL} is already a superuser!`);
        return;
      }
    }
    
    console.log(`\n🔧 Making ${SUPERADMIN_EMAIL} a superadmin...`);
    
    // Get all users to find ojidelawrence
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }
    
    let user = users.users.find(u => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());
    
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
    } else {
      console.log('✅ User found in auth system');
    }
    
    // Try to update/create profile (if profiles table exists)
    try {
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
        console.log('Profiles table update failed, continuing with members table...');
      } else {
        console.log('✅ Profile updated with superuser role');
      }
    } catch (e) {
      console.log('Profiles table not available, using members table...');
    }
    
    // Create/update member record as Pastor (admin equivalent)
    const { error: upsertMemberError } = await supabase
      .from('members')
      .upsert({
        fullname: 'Lawrence Ojide',
        email: SUPERADMIN_EMAIL.toLowerCase(),
        category: 'Pastors',
        title: 'System Administrator',
        churchunit: 'Administration',
        isactive: true,
        joindate: new Date().toISOString().split('T')[0],
        userid: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });
    
    if (upsertMemberError) {
      console.error('Error upserting member record:', upsertMemberError);
      throw upsertMemberError;
    }
    
    console.log('✅ Member record created/updated as Pastor');
    
    console.log('\n🎉 SUCCESS! ojidelawrence@gmail.com now has superadmin access!');
    console.log('\nLogin credentials:');
    console.log('Email: ojidelawrence@gmail.com');
    console.log('Password: Fa-#8rC6DRTkd$5');
    console.log('\nAccess level: Pastor (Administrative privileges)');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
checkAndManageSuperusers();