-- Complete Super Admin Management Fix
-- This script fixes all three critical issues with super admin management

-- Step 1: Check current table structures
SELECT 'Checking user_roles table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_roles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Ensure user_roles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Step 4: Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.add_super_admin_by_email(TEXT);
DROP FUNCTION IF EXISTS public.list_super_admins();
DROP FUNCTION IF EXISTS public.remove_super_admin(UUID);

-- Step 6: Create add_super_admin_by_email function (FIXED)
CREATE OR REPLACE FUNCTION public.add_super_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    existing_role_count INTEGER;
BEGIN
    -- Normalize email
    admin_email := LOWER(TRIM(admin_email));
    
    -- Check if the user exists in auth.users
    SELECT au.id INTO target_user_id 
    FROM auth.users au 
    WHERE au.email = admin_email;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User with email ' || admin_email || ' not found. User must sign up first.',
            'status', 'NOT_FOUND'
        );
    END IF;
    
    -- Check if user is already a super admin
    SELECT COUNT(*) INTO existing_role_count
    FROM public.user_roles ur
    WHERE ur.user_id = target_user_id AND ur.role = 'superuser';
    
    IF existing_role_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User ' || admin_email || ' is already a super admin',
            'status', 'ALREADY_SUPERUSER'
        );
    END IF;
    
    -- Add superuser role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (target_user_id, 'superuser', NOW());
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully added ' || admin_email || ' as super admin',
        'status', 'SUCCESS',
        'user_id', target_user_id
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

-- Step 7: Create list_super_admins function (FIXED)
CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Build JSON array with explicit table aliases to avoid ambiguity
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', au.id,
                    'email', au.email,
                    'full_name', COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', au.email),
                    'created_at', ur.created_at
                )
                ORDER BY ur.created_at DESC
            ),
            '[]'::jsonb
        ) INTO result
    FROM public.user_roles ur
    JOIN auth.users au ON ur.user_id = au.id
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE ur.role = 'superuser';
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in list_super_admins: %', SQLERRM;
        RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create remove_super_admin function (FIXED)
CREATE OR REPLACE FUNCTION public.remove_super_admin(admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    admin_email TEXT;
    role_count INTEGER;
BEGIN
    -- Get admin email for response
    SELECT au.email INTO admin_email 
    FROM auth.users au 
    WHERE au.id = admin_id;
    
    -- Check if the user exists and is a super admin
    SELECT COUNT(*) INTO role_count
    FROM public.user_roles ur
    WHERE ur.user_id = admin_id AND ur.role = 'superuser';
    
    IF role_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is not a super admin',
            'status', 'NOT_SUPERUSER'
        );
    END IF;
    
    -- Remove superuser role
    DELETE FROM public.user_roles ur
    WHERE ur.user_id = admin_id AND ur.role = 'superuser';
    
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

-- Step 9: Create update_super_admin function for edit functionality
CREATE OR REPLACE FUNCTION public.update_super_admin(admin_id UUID, new_email TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    current_email TEXT;
    role_count INTEGER;
BEGIN
    -- Check if the user is a super admin
    SELECT COUNT(*) INTO role_count
    FROM public.user_roles ur
    WHERE ur.user_id = admin_id AND ur.role = 'superuser';
    
    IF role_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is not a super admin',
            'status', 'NOT_SUPERUSER'
        );
    END IF;
    
    -- Get current email
    SELECT au.email INTO current_email 
    FROM auth.users au 
    WHERE au.id = admin_id;
    
    -- For now, we'll just return success since email changes require auth.admin
    -- The frontend can handle profile updates separately
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Super admin information retrieved successfully',
        'status', 'SUCCESS',
        'user_id', admin_id,
        'email', current_email
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

-- Step 10: Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.add_super_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_super_admin(UUID, TEXT) TO authenticated;

-- Step 11: Ensure Lawrence is a super admin
DO $$
DECLARE
    lawrence_user_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get Lawrence's user ID
    SELECT au.id INTO lawrence_user_id 
    FROM auth.users au 
    WHERE au.email = 'ojidelawrence@gmail.com';
    
    IF lawrence_user_id IS NOT NULL THEN
        -- Check if he's already a super admin
        SELECT COUNT(*) INTO existing_count
        FROM public.user_roles ur
        WHERE ur.user_id = lawrence_user_id AND ur.role = 'superuser';
        
        IF existing_count = 0 THEN
            INSERT INTO public.user_roles (user_id, role, created_at)
            VALUES (lawrence_user_id, 'superuser', NOW());
            RAISE NOTICE 'Added ojidelawrence@gmail.com as super admin';
        ELSE
            RAISE NOTICE 'ojidelawrence@gmail.com is already a super admin';
        END IF;
    ELSE
        RAISE NOTICE 'ojidelawrence@gmail.com not found in auth.users';
    END IF;
END $$;

-- Step 12: Test all functions
SELECT 'Testing super admin functions:' as test_info;

-- Test list function
SELECT 'list_super_admins result:' as test_name, public.list_super_admins() as result;

-- Test add function with a non-existent email (should fail gracefully)
SELECT 'add_super_admin_by_email test:' as test_name, 
       public.add_super_admin_by_email('nonexistent@test.com') as result;

-- Step 13: Show current super admins
SELECT 
    'Current Super Admins:' as info,
    au.email,
    au.id as user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'superuser'
ORDER BY ur.created_at DESC;
