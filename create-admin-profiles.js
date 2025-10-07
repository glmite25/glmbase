#!/usr/bin/env node

// Script to create admin profiles and roles using Supabase client
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jaicfvakzxfeijtuogir.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminProfiles() {
  console.log('🚀 Creating admin profiles and roles...\n');

  const adminUsers = [
    {
      email: 'ojidelawrence@gmail.com',
      full_name: 'Lawrence Ojide',
      role: 'superuser',
      category: 'Pastor'
    },
    {
      email: 'admin@gospellabourministry.com',
      full_name: 'Admin User',
      role: 'admin',
      category: 'Pastor'
    },
    {
      email: 'superadmin@gospellabourministry.com',
      full_name: 'Super Admin',
      role: 'admin',
      category: 'Pastor'
    }
  ];

  for (const adminUser of adminUsers) {
    console.log(`📧 Processing: ${adminUser.email}`);

    // First, check if user exists in auth.users by trying to find their profile
    // We'll create a dummy profile entry to get the user ID
    try {
      // Try to create a profile - this will help us identify if the user exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', adminUser.email)
        .single();

      let userId = null;

      if (existingProfile) {
        console.log(`   ✅ Profile already exists`);
        userId = existingProfile.id;
      } else {
        // We need to find the user ID from auth.users
        // Since we can't query auth.users directly, we'll try a different approach
        console.log(`   ❌ No profile found, user may not exist in auth.users`);
        console.log(`   💡 Please ensure ${adminUser.email} has signed up first`);
        continue;
      }

      // Check if user role exists
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', adminUser.role)
        .single();

      if (!existingRole && !roleCheckError) {
        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: adminUser.role
          });

        if (roleError) {
          console.log(`   ❌ Failed to create role:`, roleError.message);
        } else {
          console.log(`   ✅ Role '${adminUser.role}' created`);
        }
      } else if (existingRole) {
        console.log(`   ✅ Role '${adminUser.role}' already exists`);
      }

      // Check if member record exists
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingMember && !memberCheckError) {
        // Create member record
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            user_id: userId,
            email: adminUser.email,
            fullname: adminUser.full_name,
            category: adminUser.category,
            status: 'active'
          });

        if (memberError) {
          console.log(`   ❌ Failed to create member record:`, memberError.message);
        } else {
          console.log(`   ✅ Member record created`);
        }
      } else if (existingMember) {
        console.log(`   ✅ Member record already exists`);
      }

    } catch (error) {
      console.log(`   ❌ Error processing ${adminUser.email}:`, error.message);
    }

    console.log('');
  }

  console.log('🎯 Admin profile creation completed!\n');
  
  // Verify the setup
  console.log('🔍 Verifying admin setup...\n');
  
  for (const adminUser of adminUsers) {
    console.log(`📧 Checking: ${adminUser.email}`);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminUser.email)
      .single();

    if (profile) {
      console.log(`   ✅ Profile exists (ID: ${profile.id})`);
      
      // Check roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);

      if (roles && roles.length > 0) {
        console.log(`   ✅ Roles: ${roles.map(r => r.role).join(', ')}`);
      } else {
        console.log(`   ❌ No roles found`);
      }

      // Check member record
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (member) {
        console.log(`   ✅ Member record exists (Category: ${member.category})`);
      } else {
        console.log(`   ❌ No member record found`);
      }
    } else {
      console.log(`   ❌ No profile found`);
    }
    
    console.log('');
  }

  console.log('📋 Next Steps:');
  console.log('1. Ensure admin users have signed up in the application first');
  console.log('2. If users exist but profiles are missing, they may need to sign in once');
  console.log('3. Test admin login in the application');
  console.log('4. Check browser console for any remaining errors');
}

createAdminProfiles().catch(console.error);
