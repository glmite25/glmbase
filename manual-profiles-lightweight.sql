-- Manual Profiles Table Lightweight Update
-- Task 3.2: Update profiles table to lightweight authentication-only structure
-- Run this SQL after completing the data consolidation

-- Step 1: Create backup of current profiles table
CREATE TABLE IF NOT EXISTS public.profiles_backup AS 
SELECT * FROM public.profiles;

-- Step 2: Create the new lightweight profiles table structure
CREATE TABLE IF NOT EXISTS public.profiles_new (
    -- Direct auth.users reference
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- Minimal authentication-related data
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Migrate essential data to new lightweight structure
INSERT INTO public.profiles_new (id, email, full_name, created_at, updated_at)
SELECT 
    id,
    email,
    full_name,
    created_at,
    updated_at
FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = EXCLUDED.updated_at;

-- Step 4: Create function to update the updated_at timestamp for profiles
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles_new;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles_new 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_profiles_updated_at();

-- Step 6: Enable Row Level Security (RLS) for new profiles table
ALTER TABLE public.profiles_new ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for the lightweight profiles table
-- Policy for users to view their own profile
CREATE POLICY "users_can_view_own_profile" ON public.profiles_new
    FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles_new
    FOR UPDATE USING (auth.uid() = id);

-- Policy for admins to view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles_new
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR 
        -- Hardcoded superuser emails for emergency access
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy for admins to manage all profiles
CREATE POLICY "admins_can_manage_all_profiles" ON public.profiles_new
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR 
        -- Hardcoded superuser emails for emergency access
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Step 8: Grant necessary permissions
GRANT ALL ON public.profiles_new TO authenticated;

-- Step 9: Add comments for documentation
COMMENT ON TABLE public.profiles_new IS 'Lightweight profiles table for authentication-only data';
COMMENT ON COLUMN public.profiles_new.id IS 'Direct reference to auth.users.id';
COMMENT ON COLUMN public.profiles_new.email IS 'User email address for authentication';
COMMENT ON COLUMN public.profiles_new.full_name IS 'User display name';

-- Step 10: Validation queries for the lightweight profiles table
SELECT 'PROFILES_MIGRATED' as check_name,
       COUNT(*) as count_value,
       'Successfully migrated ' || COUNT(*) || ' profiles to lightweight structure' as details
FROM public.profiles_new;

-- Check for missing auth.users references
SELECT 'INVALID_AUTH_REFERENCES' as check_name,
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' profiles with invalid auth.users references' as details
FROM public.profiles_new p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

-- Check for duplicate emails
SELECT 'DUPLICATE_EMAILS_PROFILES' as check_name,
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' duplicate emails in profiles' as details
FROM (
    SELECT email, COUNT(*) as cnt 
    FROM public.profiles_new 
    GROUP BY email 
    HAVING COUNT(*) > 1
) duplicates;

-- Sample lightweight profiles data
SELECT 
    'SAMPLE_LIGHTWEIGHT_PROFILES' as info,
    id,
    email,
    full_name,
    created_at
FROM public.profiles_new 
ORDER BY created_at 
LIMIT 5;

-- Step 11: Instructions for final cutover (DO NOT RUN YET - MANUAL DECISION)
/*
-- IMPORTANT: Only run these commands after verifying the migration was successful
-- and all application code has been updated to use the new structure

-- Rename current profiles table to profiles_old
-- ALTER TABLE public.profiles RENAME TO profiles_old;

-- Rename new profiles table to profiles
-- ALTER TABLE public.profiles_new RENAME TO profiles;

-- Update any remaining foreign key references if needed
-- This step may require updating other tables that reference profiles

-- Drop the old profiles table after confirming everything works
-- DROP TABLE public.profiles_old;
*/