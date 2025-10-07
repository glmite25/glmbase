-- EMERGENCY SIGNIN BYPASS
-- If the main restoration doesn't work, this creates alternative access

-- ========================================
-- OPTION 1: CREATE TEMPORARY ADMIN USER
-- ========================================

SELECT 'Creating emergency admin user...' as status;

-- Create a temporary admin user that bypasses email confirmation
DO $$
DECLARE
    temp_user_id UUID := gen_random_uuid();
BEGIN
    -- Insert directly into auth.users (bypassing normal signup process)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        temp_user_id,
        'authenticated',
        'authenticated',
        'emergency@admin.local',
        crypt('TempAdmin123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO UPDATE SET
        encrypted_password = crypt('TempAdmin123!', gen_salt('bf')),
        email_confirmed_at = NOW(),
        updated_at = NOW();

    -- Create member record for emergency admin
    INSERT INTO public.members (
        user_id,
        email,
        fullname,
        category,
        isactive,
        created_at,
        updated_at
    ) VALUES (
        temp_user_id,
        'emergency@admin.local',
        'Emergency Admin',
        'Pastors',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        category = 'Pastors',
        isactive = true,
        updated_at = NOW();

    -- Give emergency admin superuser role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (temp_user_id, 'superuser', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Emergency admin created with ID: %', temp_user_id;
END $$;

-- ========================================
-- OPTION 2: RESET ORIGINAL SUPERADMIN PASSWORD
-- ========================================

SELECT 'Resetting original superadmin password...' as status;

-- Reset password for original superadmin
UPDATE auth.users 
SET 
    encrypted_password = crypt('NewPassword123!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'ojidelawrence@gmail.com';

-- ========================================
-- OPTION 3: DISABLE EMAIL CONFIRMATION REQUIREMENT
-- ========================================

SELECT 'Checking auth configuration...' as status;

-- Note: This would normally be done in Supabase Dashboard
-- But we can check current settings
SELECT 
    'Auth Configuration Check:' as info,
    'Check Supabase Dashboard > Authentication > Settings' as action,
    'Disable "Enable email confirmations" temporarily' as solution;

-- ========================================
-- VERIFICATION AND INSTRUCTIONS
-- ========================================

SELECT 'EMERGENCY ACCESS OPTIONS CREATED!' as status;

SELECT 'Available Login Options:' as info;

-- Show all available admin accounts
SELECT 
    'Admin Accounts:' as type,
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    m.fullname,
    ur.role
FROM auth.users u
LEFT JOIN public.members m ON u.id = m.user_id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'superuser' OR u.email IN ('ojidelawrence@gmail.com', 'emergency@admin.local')
ORDER BY u.created_at;

SELECT '🔑 LOGIN CREDENTIALS:' as credentials;
SELECT '📧 Original: ojidelawrence@gmail.com / NewPassword123!' as option1;
SELECT '🚨 Emergency: emergency@admin.local / TempAdmin123!' as option2;

SELECT '⚠️  IMPORTANT SECURITY NOTES:' as security;
SELECT '1. Change passwords immediately after gaining access' as note1;
SELECT '2. Delete emergency admin account after fixing main account' as note2;
SELECT '3. Re-enable RLS policies after testing' as note3;
SELECT '4. Fix Supabase SMTP configuration for proper email auth' as note4;

-- Instructions for cleanup
SELECT 'CLEANUP INSTRUCTIONS:' as cleanup;
SELECT 'After regaining access, run these commands:' as instruction;

SELECT '-- Delete emergency admin account
DELETE FROM public.user_roles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = ''emergency@admin.local''
);
DELETE FROM public.members WHERE email = ''emergency@admin.local'';
DELETE FROM auth.users WHERE email = ''emergency@admin.local'';

-- Re-enable RLS (run re-enable-rls.sql)
-- Fix Supabase SMTP settings
-- Change superadmin password to something secure' as cleanup_sql;