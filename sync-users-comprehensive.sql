-- Comprehensive User Synchronization Script
-- This script ensures all auth.users are properly synced to profiles and members tables

-- Step 1: Ensure profiles table has proper structure
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

-- Step 2: Ensure members table has user_id column
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'user_id') THEN
        ALTER TABLE public.members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- Step 4: Sync all auth.users to profiles table
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

-- Step 5: Link existing members to auth.users by email
UPDATE public.members 
SET user_id = u.id,
    updated_at = NOW()
FROM auth.users u
WHERE members.email = u.email 
AND members.user_id IS NULL;

-- Step 6: Create member records for auth.users that don't have them
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

-- Step 7: Create function to automatically sync new users
CREATE OR REPLACE FUNCTION public.sync_new_user_to_tables()
RETURNS TRIGGER AS $$
BEGIN
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
        CASE 
            WHEN NEW.email IN ('ojidelawrence@gmail.com', 'admin@gospellabourministry.com', 'superadmin@gospellabourministry.com') 
            THEN 'Pastors'
            ELSE 'Members'
        END,
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

-- Step 8: Create trigger for automatic sync
DROP TRIGGER IF EXISTS trigger_sync_new_user ON auth.users;
CREATE TRIGGER trigger_sync_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_new_user_to_tables();

-- Step 9: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.members TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_new_user_to_tables() TO authenticated;

-- Step 10: Create a view to check sync status
CREATE OR REPLACE VIEW public.user_sync_status AS
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as auth_created_at,
    CASE WHEN p.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_profile,
    CASE WHEN m.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_member_record,
    m.fullname as member_name,
    m.category as member_category,
    m.isactive as member_active
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.members m ON u.id = m.user_id
ORDER BY u.created_at DESC;

-- Step 11: Grant access to the view
GRANT SELECT ON public.user_sync_status TO authenticated;

-- Step 12: Verification query to show sync results
SELECT 
    'Total auth.users' as description,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total profiles' as description,
    COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
    'Total members' as description,
    COUNT(*) as count
FROM public.members
UNION ALL
SELECT 
    'Members with user_id' as description,
    COUNT(*) as count
FROM public.members
WHERE user_id IS NOT NULL
UNION ALL
SELECT 
    'Members without user_id' as description,
    COUNT(*) as count
FROM public.members
WHERE user_id IS NULL;
