-- CORRECTED Super Admin Management Fix for Members Table
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Ensure user_roles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Step 3: Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 4: Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.add_super_admin_by_email(TEXT);
DROP FUNCTION IF EXISTS public.list_super_admins();
DROP FUNCTION IF EXISTS public.remove_super_admin(UUID);

-- Step 5: Create CORRECTED add_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.add_super_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    existing_role_count INTEGER;
    member_record RECORD;
BEGIN
    -- Normalize email
    admin_email := LOWER(TRIM(admin_email));
    
    -- Check if the user exists in members table (your actual user storage)
    SELECT m.user_id, m.fullname, m.email INTO member_record
    FROM public.members m 
    WHERE LOWER(m.email) = admin_email AND m.isactive = true;
    
    IF member_record.user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User with email ' || admin_email || ' not found in members table or is inactive. User must be a registered member first.',
            'status', 'NOT_FOUND'
        );
    END IF;
    
    target_user_id := member_record.user_id;
    
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
        'message', 'Successfully added ' || admin_email || ' (' || member_record.fullname || ') as super admin',
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

-- Step 6: Create CORRECTED list_super_admins function
CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Build JSON array using members table (your actual user storage)
    SELECT 
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', m.user_id,
                    'email', m.email,
                    'full_name', m.fullname,
                    'category', m.category,
                    'created_at', ur.created_at
                )
                ORDER BY ur.created_at DESC
            ),
            '[]'::jsonb
        ) INTO result
    FROM public.user_roles ur
    JOIN public.members m ON ur.user_id = m.user_id
    WHERE ur.role = 'superuser' AND m.isactive = true;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in list_super_admins: %', SQLERRM;
        RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create CORRECTED remove_super_admin function
CREATE OR REPLACE FUNCTION public.remove_super_admin(admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    admin_email TEXT;
    admin_name TEXT;
    role_count INTEGER;
BEGIN
    -- Get admin info from members table
    SELECT m.email, m.fullname INTO admin_email, admin_name
    FROM public.members m 
    WHERE m.user_id = admin_id AND m.isactive = true;
    
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
        'message', 'Super admin role has been removed from ' || COALESCE(admin_name || ' (' || admin_email || ')', 'user'),
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

-- Step 8: Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.add_super_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_super_admin(UUID) TO authenticated;

-- Step 9: Ensure Lawrence is a super admin
DO $$
DECLARE
    lawrence_user_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get Lawrence's user ID from members table
    SELECT m.user_id INTO lawrence_user_id 
    FROM public.members m 
    WHERE LOWER(m.email) = 'ojidelawrence@gmail.com' AND m.isactive = true;
    
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
        RAISE NOTICE 'ojidelawrence@gmail.com not found in members table';
    END IF;
END $$;

-- Step 10: Test the functions
SELECT 'Testing corrected super admin functions:' as test_info;

-- Test list function
SELECT 'list_super_admins result:' as test_name, public.list_super_admins() as result;

-- Test add function with popsabey1@gmail.com (should work now)
SELECT 'add_super_admin_by_email test with popsabey1@gmail.com:' as test_name, 
       public.add_super_admin_by_email('popsabey1@gmail.com') as result;

-- Show current super admins from members table
SELECT 
    'Current Super Admins from Members Table:' as info,
    m.email,
    m.fullname,
    m.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN public.members m ON ur.user_id = m.user_id
WHERE ur.role = 'superuser' AND m.isactive = true
ORDER BY ur.created_at DESC;
