-- Comprehensive Admin Authentication Fix
-- This script fixes database schema issues and ensures proper admin authentication

-- 1. Ensure profiles table exists with proper structure
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

-- 2. Ensure user_roles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) CHECK (role IN ('user', 'admin', 'superuser')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 3. Ensure members table has proper structure and relationships
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- 5. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view active members" ON public.members;
DROP POLICY IF EXISTS "Users can update own member record" ON public.members;
DROP POLICY IF EXISTS "Admins can manage all members" ON public.members;

-- 7. Create comprehensive RLS policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Members policies
CREATE POLICY "Users can view active members" ON public.members
    FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

CREATE POLICY "Users can update own member record" ON public.members
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all members" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- 8. Create or update profiles for all auth users
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
    updated_at = NOW();

-- 9. Create admin user roles for known admin emails
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'ojidelawrence@gmail.com' THEN 'superuser'
        ELSE 'admin'
    END,
    NOW()
FROM auth.users u
WHERE u.email IN (
    'ojidelawrence@gmail.com',
    'admin@gospellabourministry.com',
    'superadmin@gospellabourministry.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 10. Update members table with user_id relationships
UPDATE public.members 
SET user_id = u.id,
    updated_at = NOW()
FROM auth.users u
WHERE members.email = u.email 
AND members.user_id IS NULL;

-- 11. Create member records for users without them
INSERT INTO public.members (
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
    CASE 
        WHEN u.email IN ('ojidelawrence@gmail.com', 'admin@gospellabourministry.com', 'superadmin@gospellabourministry.com') 
        THEN 'Pastor'
        ELSE 'Members'
    END,
    'active',
    u.created_at,
    NOW()
FROM auth.users u
LEFT JOIN public.members m ON u.id = m.user_id
WHERE m.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, UPDATE ON public.members TO authenticated;

-- 13. Create a function to check admin status (for debugging)
CREATE OR REPLACE FUNCTION public.check_admin_status(user_email TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    has_profile BOOLEAN,
    has_member_record BOOLEAN,
    roles TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        (p.id IS NOT NULL) as has_profile,
        (m.user_id IS NOT NULL) as has_member_record,
        COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.members m ON u.id = m.user_id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.email = user_email
    GROUP BY u.id, u.email, p.id, m.user_id;
END;
$$;

-- 14. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_admin_status(TEXT) TO authenticated;
