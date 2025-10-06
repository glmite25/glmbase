#!/usr/bin/env node

/**
 * Complete Admin Setup Script
 * This script sets up the admin system and ensures proper user-member synchronization
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

async function setupDatabase() {
  console.log('🗄️ Setting up database schema...');
  
  try {
    // Create the database schema
    const schemaSQL = `
      -- Ensure members table has proper structure
      ALTER TABLE members 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      -- Create index for better performance
      CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
      CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

      -- Create function to sync auth users to members
      CREATE OR REPLACE FUNCTION sync_user_to_member()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Insert into members table when a new user is created
        INSERT INTO members (
          user_id,
          email,
          fullname,
          phone,
          address,
          church_unit,
          assigned_pastor,
          category,
          status,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          NEW.raw_user_meta_data->>'phone',
          NEW.raw_user_meta_data->>'address',
          NEW.raw_user_meta_data->>'church_unit',
          NEW.raw_user_meta_data->>'assigned_pastor',
          'Members',
          'active',
          NOW(),
          NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          email = EXCLUDED.email,
          fullname = COALESCE(EXCLUDED.fullname, members.fullname),
          phone = COALESCE(EXCLUDED.phone, members.phone),
          address = COALESCE(EXCLUDED.address, members.address),
          church_unit = COALESCE(EXCLUDED.church_unit, members.church_unit),
          assigned_pastor = COALESCE(EXCLUDED.assigned_pastor, members.assigned_pastor),
          updated_at = NOW();
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Create trigger to automatically sync users to members
      DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
      CREATE TRIGGER trigger_sync_user_to_member
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE FUNCTION sync_user_to_member();

      -- Update existing users without member records
      INSERT INTO members (
        user_id,
        email,
        fullname,
        category,
        status,
        created_at,
        updated_at
      )
      SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email),
        'Members',
        'active',
        u.created_at,
        NOW()
      FROM auth.users u
      LEFT JOIN members m ON u.id = m.user_id
      WHERE m.user_id IS NULL
      ON CONFLICT (user_id) DO NOTHING;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    if (error) {
      console.error('❌ Database setup error:', error.message);
      return false;
    }

    console.log('✅ Database schema updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  }
}

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
        .insert({
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
        .insert({
          user_id: adminUser.id,
          email: ADMIN_EMAIL,
          fullname: ADMIN_NAME,
          category: 'Pastors',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertMemberError) {
        console.error('❌ Error creating member record:', insertMemberError.message);
        return false;
      }

      console.log('✅ Admin member record created');
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
        .insert({
          user_id: adminUser.id,
          role: 'superuser',
          created_at: new Date().toISOString()
        });

      if (roleError) {
        console.error('❌ Error creating admin role:', roleError.message);
        return false;
      }

      console.log('✅ Admin role created');
    }

    return true;
  } catch (error) {
    console.error('❌ Admin setup failed:', error);
    return false;
  }
}

async function syncExistingUsers() {
  console.log('🔄 Syncing existing users to members table...');
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return false;
    }

    console.log(`Found ${authUsers.users.length} auth users`);

    // Get existing members
    const { data: existingMembers, error: membersError } = await supabase
      .from('members')
      .select('user_id');

    if (membersError) {
      console.error('❌ Error fetching members:', membersError.message);
      return false;
    }

    const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
    
    // Find users without member records
    const usersToSync = authUsers.users.filter(user => !existingUserIds.has(user.id));
    
    console.log(`Found ${usersToSync.length} users to sync`);

    if (usersToSync.length > 0) {
      const membersToInsert = usersToSync.map(user => ({
        user_id: user.id,
        email: user.email,
        fullname: user.user_metadata?.full_name || user.email,
        phone: user.user_metadata?.phone || null,
        address: user.user_metadata?.address || null,
        church_unit: user.user_metadata?.church_unit || null,
        assigned_pastor: user.user_metadata?.assigned_pastor || null,
        category: user.email === ADMIN_EMAIL ? 'Pastors' : 'Members',
        status: 'active',
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('members')
        .insert(membersToInsert);

      if (insertError) {
        console.error('❌ Error syncing users:', insertError.message);
        return false;
      }

      console.log(`✅ Synced ${usersToSync.length} users to members table`);
    }

    return true;
  } catch (error) {
    console.error('❌ User sync failed:', error);
    return false;
  }
}

async function cleanupMockData() {
  console.log('🧹 Cleaning up mock data...');
  
  try {
    // Remove mock members that don't have corresponding auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return false;
    }

    const authUserIds = new Set(authUsers.users.map(user => user.id));

    // Delete members without corresponding auth users (mock data)
    const { data: deletedMembers, error: deleteError } = await supabase
      .from('members')
      .delete()
      .not('user_id', 'in', `(${Array.from(authUserIds).map(id => `'${id}'`).join(',')})`)
      .select('id, fullname');

    if (deleteError) {
      console.error('❌ Error cleaning up mock data:', deleteError.message);
      return false;
    }

    if (deletedMembers && deletedMembers.length > 0) {
      console.log(`✅ Removed ${deletedMembers.length} mock member records`);
    } else {
      console.log('✅ No mock data found to clean up');
    }

    return true;
  } catch (error) {
    console.error('❌ Mock data cleanup failed:', error);
    return false;
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  try {
    // Check admin user
    const { data: adminUser, error: adminError } = await supabase.auth.admin.listUsers();
    if (adminError) throw adminError;

    const admin = adminUser.users.find(u => u.email === ADMIN_EMAIL);
    if (!admin) {
      console.error('❌ Admin user not found');
      return false;
    }

    // Check admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', admin.id)
      .single();

    if (profileError) {
      console.error('❌ Admin profile not found');
      return false;
    }

    // Check admin member record
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', admin.id)
      .single();

    if (memberError) {
      console.error('❌ Admin member record not found');
      return false;
    }

    // Check admin role
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', admin.id)
      .eq('role', 'superuser')
      .single();

    if (roleError) {
      console.error('❌ Admin role not found');
      return false;
    }

    // Check sync status
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const { data: members } = await supabase.from('members').select('user_id');

    const authCount = authUsers?.users.length || 0;
    const memberCount = members?.length || 0;

    console.log(`✅ Setup verification complete:`);
    console.log(`   - Auth users: ${authCount}`);
    console.log(`   - Member records: ${memberCount}`);
    console.log(`   - Admin user: ${admin.email}`);
    console.log(`   - Admin role: ${role.role}`);

    return true;
  } catch (error) {
    console.error('❌ Setup verification failed:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting complete admin setup...\n');

  const steps = [
    { name: 'Database Setup', fn: setupDatabase },
    { name: 'Admin User Setup', fn: setupAdminUser },
    { name: 'User Synchronization', fn: syncExistingUsers },
    { name: 'Mock Data Cleanup', fn: cleanupMockData },
    { name: 'Setup Verification', fn: verifySetup }
  ];

  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    const success = await step.fn();
    
    if (!success) {
      console.error(`\n❌ ${step.name} failed. Stopping setup.`);
      process.exit(1);
    }
  }

  console.log('\n🎉 Complete admin setup finished successfully!');
  console.log('\n📋 Summary:');
  console.log('   ✅ Database schema updated');
  console.log('   ✅ Admin user configured');
  console.log('   ✅ User-member synchronization active');
  console.log('   ✅ Mock data cleaned up');
  console.log('   ✅ All systems verified');
  
  console.log('\n🔑 Admin Login Details:');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log('   Password: AdminPassword123!');
  console.log('   Role: Super Admin');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Start your application: npm run dev');
  console.log('   2. Login with admin credentials');
  console.log('   3. Access admin dashboard at /admin');
  console.log('   4. All new user registrations will automatically appear in members table');
}

main().catch(console.error);