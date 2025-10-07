-- Comprehensive Admin Dashboard Fix
-- This script fixes all admin dashboard issues in one go

-- PART 1: Fix Super Admin Functions (from fix-super-admin-functions.sql)
-- =====================================================================

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Create add_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.add_super_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
    user_id UUID;
BEGIN
    admin_email := LOWER(TRIM(admin_email));
    
    SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User with email ' || admin_email || ' not found. User must sign up first.',
            'status', 'NOT_FOUND'
        );
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_id AND role = 'superuser') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User ' || admin_email || ' is already a super admin',
            'status', 'ALREADY_SUPERUSER'
        );
    END IF;
    
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (user_id, 'superuser', NOW());
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully added ' || admin_email || ' as super admin',
        'status', 'SUCCESS',
        'user_id', user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM,
            'status', 'ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create list_super_admins function
CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', u.id,
                    'email', u.email,
                    'full_name', COALESCE(p.full_name, u.raw_user_meta_data->>'full_name'),
                    'created_at', r.created_at
                )
                ORDER BY r.created_at DESC
            ),
            '[]'::jsonb
        ) INTO result
    FROM public.user_roles r
    JOIN auth.users u ON r.user_id = u.id
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE r.role = 'superuser';
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create remove_super_admin function
CREATE OR REPLACE FUNCTION public.remove_super_admin(admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    admin_email TEXT;
BEGIN
    SELECT email INTO admin_email FROM auth.users WHERE id = admin_id;
    
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = admin_id AND role = 'superuser') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is not a super admin',
            'status', 'NOT_SUPERUSER'
        );
    END IF;
    
    DELETE FROM public.user_roles WHERE user_id = admin_id AND role = 'superuser';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Super admin role has been removed from ' || COALESCE(admin_email, 'user'),
        'status', 'SUCCESS',
        'user_id', admin_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM,
            'status', 'ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_super_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_super_admin(UUID) TO authenticated;

-- PART 2: Clean Up Mock Data and Set Up Real Admin
-- ================================================

-- Remove all mock/test member data (keep only real users)
DELETE FROM public.members 
WHERE email IN (
    'pastor.john@glm.org',
    'mary.johnson@glm.org', 
    'david.wilson@glm.org',
    'sarah.brown@glm.org',
    'pastor.michael@glm.org',
    'grace.thompson@glm.org',
    'james.anderson@glm.org'
) OR fullname IN (
    'Pastor John Smith',
    'Sister Mary Johnson',
    'Brother David Wilson', 
    'Elder Sarah Brown',
    'Pastor Michael Davis',
    'Sister Grace Thompson',
    'Brother James Anderson'
);

-- Remove mock super admin accounts (keep only ojidelawrence@gmail.com)
DELETE FROM public.user_roles 
WHERE role = 'superuser' 
AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'ojidelawrence@gmail.com'
);

-- Ensure ojidelawrence@gmail.com is the sole super admin
DO $$
DECLARE
    lawrence_user_id UUID;
BEGIN
    SELECT id INTO lawrence_user_id FROM auth.users WHERE email = 'ojidelawrence@gmail.com';
    
    IF lawrence_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (lawrence_user_id, 'superuser', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- PART 3: Verification Queries
-- ============================

-- Show current state after cleanup
SELECT 'VERIFICATION RESULTS:' as status;

SELECT 'Super Admins:' as category, COUNT(*) as count
FROM public.user_roles WHERE role = 'superuser'
UNION ALL
SELECT 'Total Members:' as category, COUNT(*) as count  
FROM public.members
UNION ALL
SELECT 'Members with user_id:' as category, COUNT(*) as count
FROM public.members WHERE user_id IS NOT NULL
UNION ALL
SELECT 'Profiles:' as category, COUNT(*) as count
FROM public.profiles;

-- Show remaining members (should only be real users)
SELECT 
    'Remaining Members:' as info,
    m.fullname,
    m.email,
    CASE WHEN m.user_id IS NOT NULL THEN 'Linked' ELSE 'Not Linked' END as auth_status
FROM public.members m
ORDER BY m.fullname;

-- Show super admins
SELECT 
    'Super Admins:' as info,
    u.email,
    u.id as user_id
FROM public.user_roles r
JOIN auth.users u ON r.user_id = u.id
WHERE r.role = 'superuser'
ORDER BY r.created_at DESC;
