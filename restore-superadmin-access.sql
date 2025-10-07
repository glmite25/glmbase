-- RESTORE SUPERADMIN ACCESS
-- Emergency script to restore access for ojidelawrence@gmail.com

-- ========================================
-- STEP 1: VERIFY SUPERADMIN DATA
-- ========================================

SELECT 'Checking superadmin account...' as status;

-- Check if superadmin exists in auth.users
SELECT 
    'Superadmin in auth.users:' as info,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'EMAIL_NOT_CONFIRMED'
        ELSE 'EMAIL_CONFIRMED'
    END as email_status
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Check if superadmin exists in members table
SELECT 
    'Superadmin in members:' as info,
    id,
    user_id,
    email,
    fullname,
    category,
    isactive,
    churchunit
FROM public.members 
WHERE email = 'ojidelawrence@gmail.com';

-- Check superadmin roles
SELECT 
    'Superadmin roles:' as info,
    ur.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'ojidelawrence@gmail.com';

-- ========================================
-- STEP 2: ENSURE SUPERADMIN HAS PROPER ROLES
-- ========================================

SELECT 'Ensuring superadmin has proper roles...' as status;

-- Get the superadmin user_id
DO $$
DECLARE
    superadmin_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO superadmin_id 
    FROM auth.users 
    WHERE email = 'ojidelawrence@gmail.com';
    
    IF superadmin_id IS NOT NULL THEN
        -- Ensure superuser role exists
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (superadmin_id, 'superuser', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Ensure member record exists with proper category
        INSERT INTO public.members (
            user_id,
            email,
            fullname,
            category,
            isactive,
            created_at,
            updated_at
        ) VALUES (
            superadmin_id,
            'ojidelawrence@gmail.com',
            'Ojide Lawrence (Super Admin)',
            'Pastors',
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            category = 'Pastors',
            isactive = true,
            updated_at = NOW();
            
        RAISE NOTICE 'Superadmin roles and member record updated for user ID: %', superadmin_id;
    ELSE
        RAISE NOTICE 'Superadmin user not found in auth.users table';
    END IF;
END $$;

-- ========================================
-- STEP 3: TEMPORARILY DISABLE ALL RLS FOR SUPERADMIN ACCESS
-- ========================================

SELECT 'Temporarily disabling RLS for emergency access...' as status;

-- Disable RLS on all tables to ensure superadmin can access everything
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- If profiles table exists, disable RLS there too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ========================================
-- STEP 4: CREATE EMERGENCY ADMIN FUNCTION
-- ========================================

SELECT 'Creating emergency admin verification function...' as status;

-- Function to verify if a user is superadmin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_superadmin(user_email text)
RETURNS boolean AS $$
DECLARE
    is_admin boolean := false;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM auth.users u
        JOIN public.user_roles ur ON u.id = ur.user_id
        WHERE u.email = user_email 
        AND ur.role = 'superuser'
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 
    'Superadmin verification:' as test,
    public.is_superadmin('ojidelawrence@gmail.com') as is_superadmin;

-- ========================================
-- STEP 5: CONFIRM EMAIL IN AUTH.USERS (IF NEEDED)
-- ========================================

SELECT 'Confirming email if needed...' as status;

-- Confirm email for superadmin if not already confirmed
UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'ojidelawrence@gmail.com' 
AND email_confirmed_at IS NULL;

-- ========================================
-- STEP 6: VERIFICATION SUMMARY
-- ========================================

SELECT 'EMERGENCY ACCESS RESTORATION COMPLETED!' as status;

-- Final verification
SELECT 'Final Superadmin Status:' as info;

SELECT 
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    m.category as member_category,
    m.isactive as is_active,
    ur.role as user_role,
    'RLS_DISABLED' as security_status
FROM auth.users u
LEFT JOIN public.members m ON u.id = m.user_id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ojidelawrence@gmail.com';

-- Show current RLS status
SELECT 
    'Current RLS Status:' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('members', 'user_roles', 'profiles')
ORDER BY tablename;

SELECT '🚨 IMPORTANT: RLS is now DISABLED for emergency access!' as warning;
SELECT '🔧 After you regain access, run the re-enable-rls.sql script!' as next_step;
SELECT '✅ Try signing in now - authentication should work!' as final_message;