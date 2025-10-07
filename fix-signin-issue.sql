-- FIX SIGNIN ISSUE - Troubleshooting Authentication Problems
-- Run this to identify and fix authentication issues

-- ========================================
-- STEP 1: CHECK AUTHENTICATION SETUP
-- ========================================

SELECT 'Checking Authentication Setup...' as status;

-- Check if auth.users table is accessible
SELECT 'Auth Users Count:' as info, COUNT(*) as count FROM auth.users;

-- Check if members table is accessible
SELECT 'Members Count:' as info, COUNT(*) as count FROM public.members;

-- Check if user_roles table is accessible
SELECT 'User Roles Count:' as info, COUNT(*) as count FROM public.user_roles;

-- ========================================
-- STEP 2: CHECK RLS POLICIES
-- ========================================

SELECT 'Checking RLS Policies...' as status;

-- Show current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('members', 'user_roles', 'profiles')
ORDER BY tablename;

-- Show current policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- STEP 3: TEMPORARILY DISABLE RLS FOR TESTING
-- ========================================

SELECT 'Temporarily disabling RLS for troubleshooting...' as status;

-- Disable RLS temporarily to test if that's the issue
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- If profiles table exists, disable RLS there too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

SELECT 'RLS temporarily disabled. Try signing in now.' as status;

-- ========================================
-- STEP 4: CHECK FOR PROBLEMATIC TRIGGERS
-- ========================================

SELECT 'Checking for problematic triggers...' as status;

-- Show all triggers on auth and public tables
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    event_object_schema
FROM information_schema.triggers 
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table, trigger_name;

-- ========================================
-- STEP 5: CHECK SPECIFIC USER
-- ========================================

SELECT 'Checking specific user data...' as status;

-- Check if the user exists in auth.users
SELECT 
    'User in auth.users:' as info,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Check if user exists in members table
SELECT 
    'User in members:' as info,
    id,
    user_id,
    email,
    fullname,
    isactive
FROM public.members 
WHERE email = 'ojidelawrence@gmail.com';

-- Check if user has roles
SELECT 
    'User roles:' as info,
    ur.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'ojidelawrence@gmail.com';

-- ========================================
-- STEP 6: BASIC CONNECTIVITY TEST
-- ========================================

SELECT 'Testing basic database connectivity...' as status;

-- Test basic queries
SELECT 'Current timestamp:' as test, NOW() as result;
SELECT 'Database version:' as test, version() as result;
SELECT 'Current user:' as test, current_user as result;

SELECT '🔍 Troubleshooting complete. Check the results above.' as final_status;
SELECT '⚠️  RLS is temporarily disabled. Re-enable after testing.' as warning;