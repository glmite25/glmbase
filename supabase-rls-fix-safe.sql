-- Supabase RLS Policy Fix for Superadmin Authentication (Safe Version)
-- Execute this in Supabase SQL Editor

-- Step 1: Temporarily disable RLS to break circular dependency
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on these tables
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on user_roles table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on profiles table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on members table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.members', policy_record.policyname);
    END LOOP;
END $$;

-- Step 3: Create helper functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_superuser(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = is_superuser.user_id 
        AND role = 'superuser'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_superuser(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = is_admin_or_superuser.user_id 
        AND role IN ('admin', 'superuser')
    );
END;
$$;

-- Step 4: Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Step 5: Create authentication-friendly policies

-- User Roles Table Policies
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Superusers can manage all roles" ON public.user_roles
    FOR ALL USING (public.is_superuser());

-- Profiles Table Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Superusers can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_superuser());

-- Members Table Policies
CREATE POLICY "Users can view active members" ON public.members
    FOR SELECT USING (isactive = true);

CREATE POLICY "Users can update own member record" ON public.members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Superusers can manage all members" ON public.members
    FOR ALL USING (public.is_superuser());

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_superuser(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superuser(UUID) TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.members TO authenticated;

-- Step 7: Verification
SELECT 'RLS Policy Fix Applied Successfully' as status;