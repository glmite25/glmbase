#!/usr/bin/env node

// Direct approach to sync users using Supabase Management API
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_PROJECT_ID = 'jaicfvakzxfeijtuogir';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN environment variable is required');
  console.log('Please get your access token from https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

async function runSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Running Direct User Synchronization Fix...\n');

  // Step 1: Check current state
  console.log('📊 Checking current state...');
  
  const checkQuery = `
    SELECT 
      'auth.users' as table_name,
      COUNT(*) as count
    FROM auth.users
    UNION ALL
    SELECT 
      'profiles' as table_name,
      COUNT(*) as count
    FROM profiles
    UNION ALL
    SELECT 
      'members' as table_name,
      COUNT(*) as count
    FROM members
    UNION ALL
    SELECT 
      'members_with_user_id' as table_name,
      COUNT(*) as count
    FROM members
    WHERE user_id IS NOT NULL;
  `;

  const { success: checkSuccess, result: checkResult } = await runSQL(checkQuery);
  
  if (checkSuccess && checkResult) {
    console.log('Current state:');
    checkResult.forEach(row => {
      console.log(`   ${row.table_name}: ${row.count}`);
    });
  }

  console.log('\n🔄 Running synchronization steps...\n');

  // Step 2: Ensure profiles table exists and sync all auth.users
  console.log('1. Syncing auth.users to profiles...');
  const syncProfilesQuery = `
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    SELECT 
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', u.email),
      u.created_at,
      NOW()
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
  `;

  const { success: profilesSuccess, error: profilesError } = await runSQL(syncProfilesQuery);
  if (profilesSuccess) {
    console.log('   ✅ Profiles synced successfully');
  } else {
    console.log('   ❌ Profiles sync failed:', profilesError);
  }

  // Step 3: Add user_id column to members if it doesn't exist
  console.log('2. Ensuring members table has user_id column...');
  const addUserIdQuery = `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'user_id') THEN
            ALTER TABLE public.members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END $$;
  `;

  const { success: columnSuccess, error: columnError } = await runSQL(addUserIdQuery);
  if (columnSuccess) {
    console.log('   ✅ user_id column ensured');
  } else {
    console.log('   ❌ user_id column failed:', columnError);
  }

  // Step 4: Link existing members to auth.users by email
  console.log('3. Linking existing members to auth.users...');
  const linkMembersQuery = `
    UPDATE public.members 
    SET user_id = u.id,
        updated_at = NOW()
    FROM auth.users u
    WHERE members.email = u.email 
    AND members.user_id IS NULL;
  `;

  const { success: linkSuccess, error: linkError } = await runSQL(linkMembersQuery);
  if (linkSuccess) {
    console.log('   ✅ Members linked successfully');
  } else {
    console.log('   ❌ Members linking failed:', linkError);
  }

  // Step 5: Create member records for auth.users that don't have them
  console.log('4. Creating missing member records...');
  const createMembersQuery = `
    INSERT INTO public.members (
      user_id,
      email,
      fullname,
      category,
      isactive,
      created_at,
      updated_at
    )
    SELECT 
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', u.email),
      CASE 
        WHEN u.email IN ('ojidelawrence@gmail.com', 'admin@gospellabourministry.com', 'superadmin@gospellabourministry.com') 
        THEN 'Pastors'
        ELSE 'Members'
      END,
      true,
      u.created_at,
      NOW()
    FROM auth.users u
    LEFT JOIN public.members m ON u.id = m.user_id
    WHERE m.user_id IS NULL
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      updated_at = NOW();
  `;

  const { success: createSuccess, error: createError } = await runSQL(createMembersQuery);
  if (createSuccess) {
    console.log('   ✅ Missing member records created');
  } else {
    console.log('   ❌ Member creation failed:', createError);
  }

  // Step 6: Verify final state
  console.log('\n📊 Checking final state...');
  
  const finalCheckQuery = `
    SELECT 
      'auth.users' as table_name,
      COUNT(*) as count
    FROM auth.users
    UNION ALL
    SELECT 
      'profiles' as table_name,
      COUNT(*) as count
    FROM profiles
    UNION ALL
    SELECT 
      'members' as table_name,
      COUNT(*) as count
    FROM members
    UNION ALL
    SELECT 
      'members_with_user_id' as table_name,
      COUNT(*) as count
    FROM members
    WHERE user_id IS NOT NULL;
  `;

  const { success: finalSuccess, result: finalResult } = await runSQL(finalCheckQuery);
  
  if (finalSuccess && finalResult) {
    console.log('Final state:');
    finalResult.forEach(row => {
      console.log(`   ${row.table_name}: ${row.count}`);
    });

    // Check if sync was successful
    const authUsers = finalResult.find(r => r.table_name === 'auth.users')?.count || 0;
    const profiles = finalResult.find(r => r.table_name === 'profiles')?.count || 0;
    const members = finalResult.find(r => r.table_name === 'members')?.count || 0;
    const membersWithUserId = finalResult.find(r => r.table_name === 'members_with_user_id')?.count || 0;

    console.log('\n🎯 Synchronization Results:');
    if (authUsers === profiles) {
      console.log('✅ All auth.users synced to profiles');
    } else {
      console.log('❌ Profile sync incomplete');
    }

    if (membersWithUserId === members) {
      console.log('✅ All members linked to auth.users');
    } else {
      console.log(`⚠️  ${members - membersWithUserId} members still unlinked`);
    }

    if (authUsers === membersWithUserId) {
      console.log('✅ Perfect sync: All auth.users have member records');
    } else {
      console.log(`⚠️  ${authUsers - membersWithUserId} auth.users missing member records`);
    }
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Refresh your frontend members page');
  console.log('2. All members should now show "Linked" in Auth Status');
  console.log('3. Test user registration to ensure auto-sync works');
}

main().catch(console.error);
