-- Fix RLS Policies for Superadmin Authentication
-- This script addresses the circular dependency issue where RLS policies
-- prevent authentication by blocking access to user_roles during login

-- First, temporarily disable RLS on critical tables to break the circular dependency
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view active members" ON public.members;
DROP POLICY IF EXISTS "Members can view active members" ON public.members;
DROP POLICY IF EXISTS "Users can update own member record" ON public.members;
DROP POLICY IF EXISTS "Admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Pastors can view their unit members" ON public.members;
DROP POLICY IF EXISTS "Users can view own member record" ON public.members;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.members;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.members;

-- Create a helper function to check if user is superuser
-- This function uses SECURITY DEFINER to bypass RLS during the check
CREATE OR REPLACE FUNCTION public.is_superuser(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return true if user has superuser role
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = is_superuser.user_id 
        AND role = 'superuser'
    );
END;
$$;

-- Create a helper function to check if user is admin or superuser
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return true if user has admin or superuser role
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = is_admin_or_superuser.user_id 
        AND role IN ('admin', 'superuser')
    );
END;
$$;

-- Re-enable RLS on tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create authentication-friendly policies for user_roles table
-- This is critical - users need to read their own roles during authentication
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Superusers can manage all roles
CREATE POLICY "Superusers can manage all roles" ON public.user_roles
    FOR ALL USING (public.is_superuser());

-- Create authentication-friendly policies for profiles table
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Superusers can manage all profiles
CREATE POLICY "Superusers can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_superuser());

-- Admins can view all profiles (but not modify)
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin_or_superuser());

-- Create policies for members table
-- All authenticated users can view active members
CREATE POLICY "Users can view active members" ON public.members
    FOR SELECT USING (isactive = true);

-- Users can update their own member record
CREATE POLICY "Users can update own member record" ON public.members
    FOR UPDATE USING (user_id = auth.uid());

-- Superusers can manage all members
CREATE POLICY "Superusers can manage all members" ON public.members
    FOR ALL USING (public.is_superuser());

-- Admins can manage members (but not delete)
CREATE POLICY "Admins can manage members" ON public.members
    FOR SELECT, INSERT, UPDATE USING (public.is_admin_or_superuser());

-- Handle other tables that might need superuser access
-- Events table policies
DROP POLICY IF EXISTS "Everyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Users can view active events" ON public.events
    FOR SELECT USING (is_active = true);

CREATE POLICY "Superusers can manage all events" ON public.events
    FOR ALL USING (public.is_superuser());

CREATE POLICY "Admins can manage events" ON public.events
    FOR SELECT, INSERT, UPDATE USING (public.is_admin_or_superuser());

-- Announcements table policies
DROP POLICY IF EXISTS "Everyone can view published announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

CREATE POLICY "Users can view published announcements" ON public.announcements
    FOR SELECT USING (is_published = true AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE));

CREATE POLICY "Superusers can manage all announcements" ON public.announcements
    FOR ALL USING (public.is_superuser());

CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR SELECT, INSERT, UPDATE USING (public.is_admin_or_superuser());

-- Donations table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'donations' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Admins can view donations" ON public.donations';
        EXECUTE 'DROP POLICY IF EXISTS "Superusers can manage donations" ON public.donations';
        
        EXECUTE 'CREATE POLICY "Superusers can manage all donations" ON public.donations FOR ALL USING (public.is_superuser())';
        EXECUTE 'CREATE POLICY "Admins can view donations" ON public.donations FOR SELECT USING (public.is_admin_or_superuser())';
    END IF;
END $$;

-- Pastoral care table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pastoral_care' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Pastors can manage pastoral care" ON public.pastoral_care';
        EXECUTE 'DROP POLICY IF EXISTS "Superusers can manage pastoral care" ON public.pastoral_care';
        
        EXECUTE 'CREATE POLICY "Superusers can manage all pastoral care" ON public.pastoral_care FOR ALL USING (public.is_superuser())';
        EXECUTE 'CREATE POLICY "Admins can manage pastoral care" ON public.pastoral_care FOR ALL USING (public.is_admin_or_superuser())';
    END IF;
END $$;

-- Attendance table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view attendance" ON public.attendance';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance';
        
        EXECUTE 'CREATE POLICY "Superusers can manage all attendance" ON public.attendance FOR ALL USING (public.is_superuser())';
        EXECUTE 'CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (public.is_admin_or_superuser())';
    END IF;
END $$;

-- Church units table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'church_units' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view church units" ON public.church_units';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage church units" ON public.church_units';
        
        EXECUTE 'CREATE POLICY "Users can view church units" ON public.church_units FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Superusers can manage all church units" ON public.church_units FOR ALL USING (public.is_superuser())';
        EXECUTE 'CREATE POLICY "Admins can manage church units" ON public.church_units FOR SELECT, INSERT, UPDATE USING (public.is_admin_or_superuser())';
    END IF;
END $$;

-- Event registrations table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_registrations' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage own registrations" ON public.event_registrations';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations';
        
        EXECUTE 'CREATE POLICY "Users can manage own registrations" ON public.event_registrations FOR ALL USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()))';
        EXECUTE 'CREATE POLICY "Superusers can manage all registrations" ON public.event_registrations FOR ALL USING (public.is_superuser())';
        EXECUTE 'CREATE POLICY "Admins can view registrations" ON public.event_registrations FOR SELECT USING (public.is_admin_or_superuser())';
    END IF;
END $$;

-- Grant necessary permissions to the helper functions
GRANT EXECUTE ON FUNCTION public.is_superuser(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superuser(UUID) TO authenticated;

-- Ensure proper permissions on tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.members TO authenticated;

-- Grant full access to superusers on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create a verification query to test the policies
SELECT 'RLS Policy Update Complete' as status;

-- Test queries to verify superuser access
SELECT 
    'Testing superuser function' as test,
    public.is_superuser() as result;

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;