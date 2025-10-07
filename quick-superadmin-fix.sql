-- QUICK SUPERADMIN FIX - Run each section separately

-- Section 1: Check if superadmin exists
SELECT 'Checking superadmin account...' as status;

SELECT 
    'Superadmin in auth.users:' as info,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Section 2: Check member record
SELECT 
    'Superadmin in members:' as info,
    id,
    user_id,
    email,
    fullname,
    category,
    isactive
FROM public.members 
WHERE email = 'ojidelawrence@gmail.com';

-- Section 3: Check roles
SELECT 
    'Superadmin roles:' as info,
    ur.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'ojidelawrence@gmail.com';