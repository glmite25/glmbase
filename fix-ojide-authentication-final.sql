-- Fix Ojide Lawrence Authentication Issues
-- This script addresses RLS policies and ensures proper authentication

-- First, let's check if the user exists in auth.users
-- Note: This query might not work in all environments, but it's worth trying
DO $$
DECLARE
    user_exists boolean := false;
    user_record record;
BEGIN
    -- Try to find the user in auth.users (if accessible)
    BEGIN
        SELECT EXISTS(
            SELECT 1 FROM auth.users 
            WHERE email = 'ojidelawrence@gmail.com'
        ) INTO user_exists;
        
        IF user_exists THEN
            RAISE NOTICE 'User exists in auth.users';
        ELSE
            RAISE NOTICE 'User does not exist in auth.users - may need manual creation';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Cannot access auth.users table directly';
    END;
END $$;

-- Ensure the profiles record is correct
INSERT INTO profiles (
    id, 
    email, 
    full_name, 
    role, 
    created_at, 
    updated_at
)
SELECT 
    '47c693aa-e85c-4450-8d35-250aa4c61587'::uuid,
    'ojidelawrence@gmail.com',
    'Ojide Lawrence',
    'superuser',
    NOW(),
    NOW()
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Ensure the members record is correct
INSERT INTO members (
    user_id,
    email,
    fullname,
    category,
    isactive,
    created_at,
    updated_at
)
SELECT 
    '47c693aa-e85c-4450-8d35-250aa4c61587'::uuid,
    'ojidelawrence@gmail.com',
    'Ojide Lawrence',
    'Pastors',
    true,
    NOW(),
    NOW()
ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    fullname = EXCLUDED.fullname,
    category = EXCLUDED.category,
    isactive = EXCLUDED.isactive,
    updated_at = NOW();

-- Ensure the user_roles record exists
INSERT INTO user_roles (
    user_id,
    role,
    created_at
)
SELECT 
    '47c693aa-e85c-4450-8d35-250aa4c61587'::uuid,
    'superuser',
    NOW()
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix RLS policies that might be blocking authentication

-- Temporarily disable RLS on profiles for superuser access
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create or replace policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Superusers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Superusers can manage all profiles" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Superusers can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

CREATE POLICY "Superusers can manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

-- Fix RLS policies for members table
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own member record" ON members;
DROP POLICY IF EXISTS "Users can update own member record" ON members;
DROP POLICY IF EXISTS "Superusers can view all members" ON members;
DROP POLICY IF EXISTS "Superusers can manage all members" ON members;

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own member record" ON members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own member record" ON members
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Superusers can view all members" ON members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

CREATE POLICY "Superusers can manage all members" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

-- Fix RLS policies for user_roles table
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Superusers can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Superusers can manage all roles" ON user_roles;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superusers can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

CREATE POLICY "Superusers can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

-- Create a function to help with password updates (if needed)
CREATE OR REPLACE FUNCTION update_user_password(user_email text, new_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function would need to be implemented with proper auth.users access
    -- For now, it just returns a message
    RETURN 'Password update function created - use Supabase dashboard for actual password reset';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the setup
SELECT 
    'Profile Check' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM profiles WHERE email = 'ojidelawrence@gmail.com' AND role = 'superuser') 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

SELECT 
    'Member Check' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM members WHERE email = 'ojidelawrence@gmail.com' AND isactive = true) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

SELECT 
    'User Role Check' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = '47c693aa-e85c-4450-8d35-250aa4c61587' AND role = 'superuser') 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- Final message
SELECT 'Setup completed. If authentication still fails, reset password in Supabase Auth dashboard.' as message;