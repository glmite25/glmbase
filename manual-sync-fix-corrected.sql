-- Manual User Synchronization Fix - CORRECTED VERSION
-- Run this SQL directly in Supabase SQL Editor to fix user sync issues

-- Step 1: Check current state
SELECT 
  'Current State Check' as step,
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Current State Check' as step,
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Current State Check' as step,
  'members' as table_name,
  COUNT(*) as count
FROM members
UNION ALL
SELECT 
  'Current State Check' as step,
  'members_with_user_id' as table_name,
  COUNT(*) as count
FROM members
WHERE user_id IS NOT NULL;

-- Step 2: Ensure profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add user_id column to members table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'user_id') THEN
        ALTER TABLE public.members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- Step 5: Sync all auth.users to profiles table
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

-- Step 6: Link existing members to auth.users by email
UPDATE public.members 
SET user_id = u.id,
    updated_at = NOW()
FROM auth.users u
WHERE members.email = u.email 
AND members.user_id IS NULL;

-- Step 7: Create member records for auth.users that don't have them
-- Using existing category values from the members table to avoid enum issues
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
        THEN (SELECT category FROM members WHERE category IS NOT NULL LIMIT 1)  -- Use existing category
        ELSE (SELECT category FROM members WHERE category IS NOT NULL LIMIT 1)  -- Use existing category
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

-- Step 8: Create function for automatic sync of new users
CREATE OR REPLACE FUNCTION public.sync_new_user_to_tables()
RETURNS TRIGGER AS $$
DECLARE
    default_category public.member_category;
BEGIN
    -- Get a default category from existing members
    SELECT category INTO default_category FROM public.members WHERE category IS NOT NULL LIMIT 1;
    
    -- Create profile record
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = NOW();

    -- Create member record
    INSERT INTO public.members (
        user_id,
        email,
        fullname,
        phone,
        address,
        churchunit,
        category,
        isactive,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'address',
        NEW.raw_user_meta_data->>'church_unit',
        COALESCE(default_category, 'Members'::public.member_category),
        true,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        fullname = COALESCE(EXCLUDED.fullname, members.fullname),
        phone = COALESCE(EXCLUDED.phone, members.phone),
        address = COALESCE(EXCLUDED.address, members.address),
        churchunit = COALESCE(EXCLUDED.churchunit, members.churchunit),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger for automatic sync
DROP TRIGGER IF EXISTS trigger_sync_new_user ON auth.users;
CREATE TRIGGER trigger_sync_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_new_user_to_tables();

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_new_user_to_tables() TO authenticated;

-- Step 11: Final verification
SELECT 
  'Final State Check' as step,
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Final State Check' as step,
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Final State Check' as step,
  'members' as table_name,
  COUNT(*) as count
FROM members
UNION ALL
SELECT 
  'Final State Check' as step,
  'members_with_user_id' as table_name,
  COUNT(*) as count
FROM members
WHERE user_id IS NOT NULL
UNION ALL
SELECT 
  'Final State Check' as step,
  'members_without_user_id' as table_name,
  COUNT(*) as count
FROM members
WHERE user_id IS NULL;

-- Step 12: Show detailed sync status for verification
SELECT 
    u.email as user_email,
    u.id as user_id,
    CASE WHEN p.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_profile,
    CASE WHEN m.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_member_record,
    m.fullname as member_name,
    m.category as member_category
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.members m ON u.id = m.user_id
ORDER BY u.created_at DESC;
