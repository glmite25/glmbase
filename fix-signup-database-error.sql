-- Fix for signup database error
-- This script removes problematic triggers that are causing signup failures

-- ========================================
-- PART 1: REMOVE PROBLEMATIC TRIGGERS
-- ========================================

-- Drop all triggers that might interfere with auth.users table
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_final ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS sync_user_to_member_trigger ON auth.users;

-- Drop the associated functions
DROP FUNCTION IF EXISTS sync_user_to_member_final() CASCADE;
DROP FUNCTION IF EXISTS sync_user_to_member() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ========================================
-- PART 2: ENSURE PROFILES TABLE IS ACCESSIBLE
-- ========================================

-- Make sure profiles table exists and is properly configured
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- ========================================
-- PART 3: ENSURE MEMBERS TABLE IS ACCESSIBLE
-- ========================================

-- Make sure members table policies allow new user creation
DROP POLICY IF EXISTS "Allow authenticated users to read members" ON public.members;
DROP POLICY IF EXISTS "Allow users to insert their own member record" ON public.members;
DROP POLICY IF EXISTS "Allow users to update their own member record" ON public.members;

CREATE POLICY "Allow authenticated users to read members" ON public.members
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to insert their own member record" ON public.members
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Allow users to update their own member record" ON public.members
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.members TO anon;

-- ========================================
-- PART 4: CREATE SAFE PROFILE SYNC FUNCTION (OPTIONAL)
-- ========================================

-- Create a simple function that can be called manually if needed
-- This does NOT use triggers to avoid interference with auth
CREATE OR REPLACE FUNCTION public.sync_profile_to_member_manual(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_record RECORD;
    result JSONB;
BEGIN
    -- Get profile data
    SELECT * INTO profile_record FROM public.profiles WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found');
    END IF;
    
    -- Insert or update member record
    INSERT INTO public.members (
        id, 
        email, 
        fullname, 
        category, 
        isactive, 
        created_at, 
        updated_at
    ) VALUES (
        profile_record.id,
        profile_record.email,
        profile_record.full_name,
        'Members',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        fullname = EXCLUDED.fullname,
        updated_at = NOW();
    
    RETURN jsonb_build_object('success', true, 'message', 'Profile synced to member record');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PART 5: VERIFY CONFIGURATION
-- ========================================

-- Test that we can insert into profiles table
DO $$
BEGIN
    -- This is just a test, we'll rollback
    BEGIN
        INSERT INTO public.profiles (id, email, full_name) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test User');
        
        DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000000';
        
        RAISE NOTICE 'SUCCESS: Profiles table is accessible for inserts';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Profiles table insert failed: %', SQLERRM;
    END;
END $$;

-- Test that we can insert into members table
DO $$
BEGIN
    -- This is just a test, we'll rollback
    BEGIN
        INSERT INTO public.members (id, email, fullname, category, isactive) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test User', 'Members', true);
        
        DELETE FROM public.members WHERE id = '00000000-0000-0000-0000-000000000000';
        
        RAISE NOTICE 'SUCCESS: Members table is accessible for inserts';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Members table insert failed: %', SQLERRM;
    END;
END $$;