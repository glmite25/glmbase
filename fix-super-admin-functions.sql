-- Comprehensive Super Admin Functions Fix
-- This script creates all missing super admin functions and fixes the errors

-- Step 1: Ensure user_roles table exists with proper structure
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

-- Step 3: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Step 4: Create function to add super admin by email
CREATE OR REPLACE FUNCTION public.add_super_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
    user_id UUID;
    result JSONB;
    existing_role TEXT;
BEGIN
    -- Normalize email (convert to lowercase)
    admin_email := LOWER(TRIM(admin_email));
    
    -- Check if the user exists
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = admin_email;
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User with email ' || admin_email || ' not found. User must sign up first.',
            'status', 'NOT_FOUND'
        );
    END IF;
    
    -- Check if user is already a super admin
    SELECT role INTO existing_role
    FROM public.user_roles
    WHERE user_id = user_id AND role = 'superuser';
    
    IF existing_role IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User ' || admin_email || ' is already a super admin',
            'status', 'ALREADY_SUPERUSER'
        );
    END IF;
    
    -- Add superuser role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (user_id, 'superuser', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Return success
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

-- Step 5: Create function to list super admins
CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Build a JSON array of super admins
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
    FROM 
        public.user_roles r
    JOIN 
        auth.users u ON r.user_id = u.id
    LEFT JOIN 
        public.profiles p ON u.id = p.id
    WHERE 
        r.role = 'superuser';
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in list_super_admins: %', SQLERRM;
        RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to remove super admin
CREATE OR REPLACE FUNCTION public.remove_super_admin(admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    admin_email TEXT;
BEGIN
    -- Get admin email for the response
    SELECT email INTO admin_email
    FROM auth.users
    WHERE id = admin_id;
    
    -- Check if the user exists and is a super admin
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = admin_id
        AND role = 'superuser'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is not a super admin',
            'status', 'NOT_SUPERUSER'
        );
    END IF;
    
    -- Remove superuser role
    DELETE FROM public.user_roles
    WHERE user_id = admin_id
    AND role = 'superuser';
    
    -- Return success
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

-- Step 7: Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.add_super_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_super_admin(UUID) TO authenticated;

-- Step 8: Ensure ojidelawrence@gmail.com is a super admin
DO $$
DECLARE
    lawrence_user_id UUID;
BEGIN
    -- Get Lawrence's user ID
    SELECT id INTO lawrence_user_id
    FROM auth.users
    WHERE email = 'ojidelawrence@gmail.com';
    
    -- Add him as super admin if he exists and isn't already one
    IF lawrence_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (lawrence_user_id, 'superuser', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Ensured ojidelawrence@gmail.com is a super admin';
    ELSE
        RAISE NOTICE 'ojidelawrence@gmail.com not found in auth.users';
    END IF;
END $$;

-- Step 9: Test the functions
SELECT 'Testing list_super_admins function:' as test;
SELECT public.list_super_admins() as super_admins_list;

-- Step 10: Show current super admins
SELECT 
    u.email,
    u.id as user_id,
    r.role,
    r.created_at
FROM public.user_roles r
JOIN auth.users u ON r.user_id = u.id
WHERE r.role = 'superuser'
ORDER BY r.created_at DESC;
