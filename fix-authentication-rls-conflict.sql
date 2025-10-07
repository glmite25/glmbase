-- FIX AUTHENTICATION RLS CONFLICT
-- This script fixes the circular dependency issue in RLS policies that prevents user authentication
-- The issue: RLS policies require auth.uid() but authentication fails because of RLS policies

-- ========================================
-- STEP 1: TEMPORARILY DISABLE RLS TO ALLOW AUTHENTICATION
-- ========================================

-- Disable RLS temporarily to break the circular dependency
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: DROP PROBLEMATIC POLICIES
-- ========================================

-- Drop all existing RLS policies that might cause conflicts
DROP POLICY IF EXISTS "Users can view own member record" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Pastors can view their unit members" ON public.members;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view active members" ON public.members;
DROP POLICY IF EXISTS "Users can update own member record" ON public.members;
DROP POLICY IF EXISTS "Admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- ========================================
-- STEP 3: CREATE AUTHENTICATION-FRIENDLY RLS POLICIES
-- ========================================

-- Re-enable RLS with better policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- PROFILES TABLE POLICIES
-- Allow all authenticated users to read profiles (needed for authentication flow)
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Super admins can do everything with profiles
CREATE POLICY "Super admins can manage profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- USER_ROLES TABLE POLICIES
-- Allow all authenticated users to read user_roles (needed for role checking)
CREATE POLICY "Authenticated users can read user_roles" ON public.user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Super admins can manage all roles
CREATE POLICY "Super admins can manage user_roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- MEMBERS TABLE POLICIES
-- Allow all authenticated users to read active members (needed for authentication and app functionality)
CREATE POLICY "Authenticated users can read active members" ON public.members
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND (isactive = true OR auth.uid() = user_id)
    );

-- Users can update their own member record (limited fields)
CREATE POLICY "Users can update own member info" ON public.members
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND category = OLD.category          -- Can't change their own category
        AND user_id = OLD.user_id           -- Can't change user_id
        AND assignedto = OLD.assignedto     -- Can't change assigned pastor
        AND isactive = OLD.isactive         -- Can't change active status
    );

-- Super admins can do everything with members
CREATE POLICY "Super admins can manage members" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- Pastors can view and update members in their church unit
CREATE POLICY "Pastors can manage their unit members" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members pastor 
            WHERE pastor.user_id = auth.uid() 
            AND pastor.category = 'Pastors'
            AND pastor.churchunit = members.churchunit
            AND pastor.isactive = true
        )
    );

-- ========================================
-- STEP 4: GRANT NECESSARY PERMISSIONS
-- ========================================

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.members TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT UPDATE ON public.members TO authenticated;

-- Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.get_member_count_by_category() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_church_unit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_church_stats() TO authenticated;

-- ========================================
-- STEP 5: VERIFICATION QUERIES
-- ========================================

-- Test that the user can be found (this should work now)
SELECT 'Testing user lookup...' as test;
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.role as profile_role,
    ur.role as user_role,
    m.category as member_category,
    m.isactive
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.members m ON u.id = m.user_id
WHERE u.email = 'ojidelawrence@gmail.com';

-- Show current RLS policies
SELECT 'Current RLS Policies:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Authentication RLS conflict fix completed!' as status;
SELECT 'User should now be able to sign in successfully.' as next_step;
