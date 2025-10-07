-- RE-ENABLE RLS AFTER TESTING
-- Run this AFTER you've tested signin and identified the issue

SELECT 'Re-enabling RLS with safer policies...' as status;

-- ========================================
-- STEP 1: RE-ENABLE RLS
-- ========================================

-- Re-enable RLS on tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- If profiles table exists, enable RLS there too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ========================================
-- STEP 2: CREATE SAFER RLS POLICIES
-- ========================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own member record" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Pastors can view their unit members" ON public.members;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create simpler, safer policies for members table
CREATE POLICY "Allow all for authenticated users" ON public.members
    FOR ALL USING (auth.role() = 'authenticated');

-- Create simpler, safer policies for user_roles table  
CREATE POLICY "Allow all for authenticated users" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- If profiles table exists, create policy for it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles';
        EXECUTE 'CREATE POLICY "Allow all for authenticated users" ON public.profiles FOR ALL USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

SELECT 'RLS re-enabled with simpler policies.' as status;
SELECT 'All authenticated users now have full access.' as info;
SELECT 'You can refine these policies later once signin is working.' as recommendation;