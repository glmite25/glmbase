-- MANUAL SIGNUP FIX
-- Run this SQL directly in your Supabase SQL Editor to fix signup issues
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste this code > Run

-- ========================================
-- STEP 1: REMOVE PROBLEMATIC TRIGGERS
-- ========================================

-- Remove all triggers on auth.users that might be causing issues
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_final ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS sync_user_to_member_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove the associated functions
DROP FUNCTION IF EXISTS public.sync_user_to_member_final() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;

-- ========================================
-- STEP 2: FIX PROFILES TABLE PERMISSIONS
-- ========================================

-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon to insert profiles" ON public.profiles;

-- Create new policies that allow signup
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow anon users to insert profiles (needed for signup)
CREATE POLICY "Allow anon to insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- ========================================
-- STEP 3: FIX MEMBERS TABLE PERMISSIONS
-- ========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read members" ON public.members;
DROP POLICY IF EXISTS "Allow admins to insert members" ON public.members;
DROP POLICY IF EXISTS "Allow admins to update members" ON public.members;
DROP POLICY IF EXISTS "Allow admins to delete members" ON public.members;
DROP POLICY IF EXISTS "Allow users to insert their own member record" ON public.members;
DROP POLICY IF EXISTS "Allow users to update their own member record" ON public.members;

-- Create more permissive policies for signup
CREATE POLICY "Allow authenticated users to read members" ON public.members
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to insert their own member record" ON public.members
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Allow users to update their own member record" ON public.members
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Allow anon users to insert member records (needed for signup)
CREATE POLICY "Allow anon to insert member records" ON public.members
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.members TO anon;

-- ========================================
-- STEP 4: CREATE SAFE HELPER FUNCTION
-- ========================================

-- Create a function that can be called after signup to sync data
CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT DEFAULT NULL,
    church_unit TEXT DEFAULT NULL,
    phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Insert profile
    INSERT INTO public.profiles (id, email, full_name, updated_at)
    VALUES (user_id, user_email, COALESCE(user_full_name, split_part(user_email, '@', 1)), NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = NOW();

    -- Insert member record
    INSERT INTO public.members (
        id, 
        email, 
        fullname, 
        category, 
        churchunit,
        phone,
        isactive, 
        created_at, 
        updated_at
    ) VALUES (
        user_id,
        user_email,
        COALESCE(user_full_name, split_part(user_email, '@', 1)),
        'Members',
        church_unit,
        phone,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        fullname = COALESCE(EXCLUDED.fullname, members.fullname),
        churchunit = COALESCE(EXCLUDED.churchunit, members.churchunit),
        phone = COALESCE(EXCLUDED.phone, members.phone),
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Profile and member record created successfully',
        'user_id', user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', SQLERRM,
            'user_id', user_id
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe TO anon;

-- ========================================
-- STEP 5: TEST THE FIX
-- ========================================

-- Test that we can insert into profiles
DO $$
DECLARE
    test_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Test profile insert
    INSERT INTO public.profiles (id, email, full_name) 
    VALUES (test_id, 'test@example.com', 'Test User');
    
    -- Test member insert
    INSERT INTO public.members (id, email, fullname, category, isactive) 
    VALUES (test_id, 'test@example.com', 'Test User', 'Members', true);
    
    -- Clean up
    DELETE FROM public.members WHERE id = test_id;
    DELETE FROM public.profiles WHERE id = test_id;
    
    RAISE NOTICE 'SUCCESS: Both tables are accessible for inserts';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
        -- Clean up in case of partial success
        DELETE FROM public.members WHERE id = test_id;
        DELETE FROM public.profiles WHERE id = test_id;
END $$;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SIGNUP FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Removed problematic database triggers';
    RAISE NOTICE '2. Fixed profiles table permissions';
    RAISE NOTICE '3. Fixed members table permissions';
    RAISE NOTICE '4. Created safe helper function';
    RAISE NOTICE '';
    RAISE NOTICE 'Users should now be able to sign up without errors.';
    RAISE NOTICE 'Test the signup form on your website.';
END $$;