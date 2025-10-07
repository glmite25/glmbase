-- Setup Superadmin User
-- Run this after the RLS fix to ensure superadmin has proper access

-- First, let's check if the user exists and get their ID
-- Replace 'ojidelawrence@gmail.com' with your actual superadmin email if different
DO $$
DECLARE
    superadmin_id UUID;
    superadmin_email TEXT := 'ojidelawrence@gmail.com';
BEGIN
    -- Try to find the user in auth.users (this requires service role access)
    -- If running as service role, we can check auth.users directly
    -- Otherwise, we'll need to insert the role manually with a known user ID
    
    -- For now, let's just ensure the role exists for any user with this email
    -- You'll need to replace this UUID with the actual user ID from Supabase Auth
    
    RAISE NOTICE 'Setting up superadmin user...';
    
    -- If you know the user ID, replace the UUID below
    -- You can get this from Supabase Dashboard > Authentication > Users
    -- superadmin_id := 'YOUR_USER_ID_HERE';
    
    -- For now, let's create a function to help with this
END $$;

-- Create a function to assign superuser role (run this with service role)
CREATE OR REPLACE FUNCTION public.assign_superuser_role(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    result_text TEXT;
BEGIN
    -- This function needs to be called with the actual user ID
    -- Since we can't directly access auth.users from here,
    -- we'll create a manual assignment function
    
    result_text := 'Function created. Use assign_superuser_role_by_id() with actual user ID.';
    RETURN result_text;
END;
$$;

-- Create function to assign role by user ID
CREATE OR REPLACE FUNCTION public.assign_superuser_role_by_id(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_text TEXT;
BEGIN
    -- Check if user already has superuser role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'superuser') THEN
        result_text := 'User already has superuser role';
    ELSE
        -- Insert superuser role
        INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
        VALUES (user_uuid, 'superuser', NOW(), 'system');
        
        result_text := 'Superuser role assigned successfully';
    END IF;
    
    RETURN result_text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.assign_superuser_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_superuser_role_by_id(UUID) TO authenticated;

-- Instructions for manual setup:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find the user 'ojidelawrence@gmail.com' and copy their User ID
-- 3. Run this query with the actual user ID:
--    SELECT public.assign_superuser_role_by_id('PASTE_USER_ID_HERE');

-- Alternative: If you want to manually insert the role, use this template:
-- INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
-- VALUES ('PASTE_USER_ID_HERE', 'superuser', NOW(), 'manual_setup')
-- ON CONFLICT (user_id, role) DO NOTHING;

SELECT 'Superadmin setup functions created. Check instructions above.' as status;