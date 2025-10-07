-- Rollback script for RLS policy changes
-- Use this script if the new RLS policies cause authentication issues

-- Drop the new helper functions
DROP FUNCTION IF EXISTS public.is_superuser(UUID);
DROP FUNCTION IF EXISTS public.is_admin_or_superuser(UUID);

-- Temporarily disable RLS to allow cleanup
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;

-- Drop all policies created by the fix
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superusers can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view active members" ON public.members;
DROP POLICY IF EXISTS "Users can update own member record" ON public.members;
DROP POLICY IF EXISTS "Superusers can manage all members" ON public.members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.members;

-- Events table
DROP POLICY IF EXISTS "Users can view active events" ON public.events;
DROP POLICY IF EXISTS "Superusers can manage all events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Announcements table
DROP POLICY IF EXISTS "Users can view published announcements" ON public.announcements;
DROP POLICY IF EXISTS "Superusers can manage all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

-- Create simple fallback policies that allow all authenticated users
-- This is a temporary measure to restore functionality

-- User roles - allow authenticated users to view their own roles
CREATE POLICY "Allow authenticated users to view own roles" ON public.user_roles
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Profiles - allow authenticated users to manage their own profiles
CREATE POLICY "Allow authenticated users to manage own profiles" ON public.profiles
    FOR ALL USING (auth.role() = 'authenticated' AND id = auth.uid());

-- Members - allow authenticated users to view active members
CREATE POLICY "Allow authenticated users to view active members" ON public.members
    FOR SELECT USING (auth.role() = 'authenticated' AND isactive = true);

-- Events - allow authenticated users to view active events
CREATE POLICY "Allow authenticated users to view active events" ON public.events
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Announcements - allow authenticated users to view published announcements
CREATE POLICY "Allow authenticated users to view published announcements" ON public.announcements
    FOR SELECT USING (auth.role() = 'authenticated' AND is_published = true);

-- Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

SELECT 'RLS policies rolled back to simple authenticated-only access' as status;