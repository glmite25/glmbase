-- Superadmin Account Diagnostic Queries
-- These queries check the current status of the superadmin account across all relevant tables

-- 1. Check auth.users table for superadmin account
SELECT 
    id,
    email,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'NOT_CONFIRMED'
        WHEN last_sign_in_at IS NULL THEN 'NEVER_SIGNED_IN'
        ELSE 'CONFIRMED'
    END as account_status
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- 2. Check profiles table for superadmin profile
SELECT 
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'ojidelawrence@gmail.com';

-- 3. Check members table for superadmin member record
SELECT 
    id,
    user_id,
    email,
    fullname,
    category,
    churchunit,
    isactive,
    created_at,
    updated_at
FROM public.members 
WHERE email = 'ojidelawrence@gmail.com';

-- 4. Check user_roles table for superadmin role assignment
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.created_at,
    au.email
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'ojidelawrence@gmail.com';

-- 5. Comprehensive superadmin account overview
SELECT 
    'auth.users' as table_name,
    CASE WHEN au.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as record_status,
    au.email,
    au.email_confirmed_at,
    NULL as role,
    NULL as category
FROM auth.users au
WHERE au.email = 'ojidelawrence@gmail.com'

UNION ALL

SELECT 
    'profiles' as table_name,
    CASE WHEN p.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as record_status,
    p.email,
    NULL as email_confirmed_at,
    p.role,
    NULL as category
FROM public.profiles p
WHERE p.email = 'ojidelawrence@gmail.com'

UNION ALL

SELECT 
    'members' as table_name,
    CASE WHEN m.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as record_status,
    m.email,
    NULL as email_confirmed_at,
    NULL as role,
    m.category
FROM public.members m
WHERE m.email = 'ojidelawrence@gmail.com'

UNION ALL

SELECT 
    'user_roles' as table_name,
    CASE WHEN ur.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as record_status,
    au.email,
    NULL as email_confirmed_at,
    ur.role,
    NULL as category
FROM public.user_roles ur
RIGHT JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'ojidelawrence@gmail.com';

-- 6. Check for data consistency issues
SELECT 
    'Data Consistency Check' as check_type,
    CASE 
        WHEN au.id IS NULL THEN 'CRITICAL: No auth.users record'
        WHEN p.id IS NULL THEN 'WARNING: No profiles record'
        WHEN m.id IS NULL THEN 'WARNING: No members record'
        WHEN ur.id IS NULL THEN 'CRITICAL: No user_roles record'
        WHEN au.email_confirmed_at IS NULL THEN 'CRITICAL: Email not confirmed'
        WHEN ur.role != 'superuser' THEN 'CRITICAL: Wrong role assignment'
        ELSE 'OK: All records present and consistent'
    END as issue_description
FROM auth.users au
FULL OUTER JOIN public.profiles p ON au.id = p.id AND au.email = p.email
FULL OUTER JOIN public.members m ON au.id = m.user_id AND au.email = m.email
FULL OUTER JOIN public.user_roles ur ON au.id = ur.user_id
WHERE au.email = 'ojidelawrence@gmail.com' OR p.email = 'ojidelawrence@gmail.com' OR m.email = 'ojidelawrence@gmail.com';

-- 7. Check RLS policies that might affect superadmin access
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
AND tablename IN ('profiles', 'members', 'user_roles')
ORDER BY tablename, policyname;