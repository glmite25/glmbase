#!/usr/bin/env node

/**
 * Final Admin Setup Script
 * This script ensures the complete admin system is working
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
  console.log('\n💡 Please check your .env file and ensure these variables are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_NAME = 'Lawrence Ojide';

async function setupAdminUser() {
  console.log('👤 Setting up admin user...');
  
  try {
    // Check if admin user exists
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return false;
    }

    let adminUser = authUsers.users.find(user => user.email === ADMIN_EMAIL);
    
    if (!adminUser) {
      console.log('Creating admin user...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: 'AdminPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_NAME,
        }
      });

      if (createError) {
        console.error('❌ Error creating admin user:', createError.message);
        return false;
      }

      adminUser = newUser.user;
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Ensure profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError.message);
      return false;
    }

    if (!profile) {
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .upsert({
          id: adminUser.id,
          email: ADMIN_EMAIL,
          full_name: ADMIN_NAME,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertProfileError) {
        console.error('❌ Error creating profile:', insertProfileError.message);
        return false;
      }

      console.log('✅ Admin profile created');
    } else {
      console.log('✅ Admin profile exists');
    }

    // Ensure member record exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', adminUser.id)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('❌ Error checking member record:', memberError.message);
      return false;
    }

    if (!member) {
      const { error: insertMemberError } = await supabase
        .from('members')
        .upsert({
          user_id: adminUser.id,
          email: ADMIN_EMAIL,
          fullname: ADMIN_NAME,
          category: 'Pastors',
          isactive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertMemberError) {
        console.error('❌ Error creating member record:', insertMemberError.message);
        return false;
      }

      console.log('✅ Admin member record created');
    } else {
      console.log('✅ Admin member record exists');
    }

    // Ensure admin role exists
    const { data: existingRole, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id)
      .eq('role', 'superuser')
      .single();

    if (roleCheckError && roleCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking admin role:', roleCheckError.message);
      return false;
    }

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: adminUser.id,
          role: 'superuser',
          created_at: new Date().toISOString()
        });

      if (roleError) {
        console.error('❌ Error creating admin role:', roleError.message);
        return false;
      }

      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role exists');
    }

    return true;
  } catch (error) {
    console.error('❌ Admin setup failed:', error);
    return false;
  }
}

async function testAdminSystem() {
  console.log('🧪 Testing admin system components...');
  
  try {
    // Test database connection
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connection working');

    // Test members table
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('id')
      .limit(1);
    
    if (membersError) {
      console.error('❌ Members table access failed:', membersError.message);
      return false;
    }
    console.log('✅ Members table accessible');

    // Test user_roles table
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);
    
    if (rolesError) {
      console.error('❌ User roles table access failed:', rolesError.message);
      return false;
    }
    console.log('✅ User roles table accessible');

    return true;
  } catch (error) {
    console.error('❌ System test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Final Admin Setup for Gospel Labour Ministry\n');

  // Step 1: Setup admin user
  const adminSetupSuccess = await setupAdminUser();
  if (!adminSetupSuccess) {
    console.error('\n❌ Admin setup failed. Please check your database configuration.');
    process.exit(1);
  }

  // Step 2: Test system
  const systemTestSuccess = await testAdminSystem();
  if (!systemTestSuccess) {
    console.error('\n❌ System test failed. Please check your database setup.');
    process.exit(1);
  }

  console.log('\n🎉 Admin setup completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   ✅ Admin user created/verified');
  console.log('   ✅ Profile record exists');
  console.log('   ✅ Member record exists');
  console.log('   ✅ Super admin role assigned');
  console.log('   ✅ Database tables accessible');
  
  console.log('\n🔑 Admin Login Details:');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log('   Password: AdminPassword123!');
  console.log('   Role: Super Admin');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Run the clean database schema:');
  console.log('   Execute clean-database-schema.sql in your Supabase SQL editor');
  console.log('');
  console.log('2. Start your application:');
  console.log('   npm run dev');
  console.log('');
  console.log('3. Open browser and go to:');
  console.log('   http://localhost:5173/auth');
  console.log('');
  console.log('4. Login with the credentials above');
  console.log('');
  console.log('5. Access admin dashboard:');
  console.log('   • Admin button in header (for admins only)');
  console.log('   • Floating admin button (admins only)');
  console.log('   • Admin option in user dropdown');
  console.log('   • Direct access: http://localhost:5173/admin');

  console.log('\n✨ Your admin system is ready!');
}

main().catch(console.error);