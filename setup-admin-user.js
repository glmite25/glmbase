#!/usr/bin/env node

/**
 * Admin User Setup Script
 * This script ensures the admin user is properly configured in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_NAME = 'Lawrence Ojide';

async function setupAdminUser() {
  console.log('🚀 Setting up admin user...');
  
  try {
    // 1. Check if user exists in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    let adminUser = authUsers.users.find(user => user.email === ADMIN_EMAIL);
    
    if (!adminUser) {
      console.log('👤 Admin user not found in auth, creating...');
      
      // Create admin user in auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: 'AdminPassword123!', // Should be changed on first login
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_NAME,
        }
      });

      if (createError) {
        console.error('❌ Error creating admin user:', createError.message);
        return;
      }

      adminUser = newUser.user;
      console.log('✅ Admin user created in auth');
    } else {
      console.log('✅ Admin user found in auth');
    }

    // 2. Ensure profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError.message);
      return;
    }

    if (!profile) {
      console.log('👤 Creating admin profile...');
      
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: ADMIN_EMAIL,
          full_name: ADMIN_NAME,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertProfileError) {
        console.error('❌ Error creating profile:', insertProfileError.message);
        return;
      }

      console.log('✅ Admin profile created');
    } else {
      console.log('✅ Admin profile exists');
    }

    // 3. Ensure admin role exists
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id)
      .eq('role', 'superuser')
      .single();

    if (roleCheckError && roleCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking admin role:', roleCheckError.message);
      return;
    }

    if (!existingRole) {
      console.log('🔑 Creating admin role...');
      
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: adminUser.id,
          role: 'superuser',
          created_at: new Date().toISOString()
        });

      if (roleError) {
        console.error('❌ Error creating admin role:', roleError.message);
        return;
      }

      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role exists');
    }

    console.log('\n🎉 Admin user setup complete!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: AdminPassword123! (change on first login)`);
    console.log(`🛡️  Role: Super Admin`);
    console.log('\n💡 The admin user can now:');
    console.log('   - Access the admin dashboard at /admin');
    console.log('   - See the admin button in the header');
    console.log('   - Use the floating admin button');
    console.log('   - Manage all system settings');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupAdminUser().then(() => {
  console.log('\n✨ Setup script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Setup script failed:', error);
  process.exit(1);
});