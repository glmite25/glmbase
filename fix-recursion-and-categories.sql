-- CRITICAL FIX: Stop Infinite Recursion and Fix Category Assignment
-- Run this IMMEDIATELY in Supabase SQL Editor to fix stack depth limit exceeded error

-- STEP 1: STOP THE INFINITE RECURSION
-- Drop all circular triggers that cause the stack depth error
DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.user_roles;
DROP TRIGGER IF EXISTS trigger_sync_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS sync_user_role_to_profile ON public.user_roles;
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles ON public.profiles;

-- Drop the problematic recursive functions
DROP FUNCTION IF EXISTS public.sync_user_roles_to_profile();
DROP FUNCTION IF EXISTS public.sync_profile_role_to_user_roles();
DROP FUNCTION IF EXISTS public.sync_user_role_to_profile();

-- STEP 2: CREATE SAFE, NON-RECURSIVE ROLE SYNC FUNCTION
CREATE OR REPLACE FUNCTION public.sync_roles_one_way()
RETURNS TRIGGER AS $$
DECLARE
    highest_role TEXT;
BEGIN
    -- Only sync FROM user_roles TO profiles (one direction only to prevent recursion)
    IF TG_TABLE_NAME = 'user_roles' THEN
        -- Get the highest role for this user
        SELECT CASE 
            WHEN 'superuser' = ANY(array_agg(ur.role)) THEN 'superuser'
            WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'
            ELSE 'user'
        END INTO highest_role
        FROM public.user_roles ur 
        WHERE ur.user_id = COALESCE(NEW.user_id, OLD.user_id);
        
        -- Update profile role (if profiles table exists)
        UPDATE public.profiles 
        SET role = highest_role::public.app_role,
            updated_at = NOW()
        WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create ONE-WAY trigger (user_roles -> profiles only)
CREATE TRIGGER trigger_sync_roles_one_way
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_roles_one_way();

-- STEP 3: FIX CATEGORY ASSIGNMENT IN SYNC FUNCTIONS
-- Update the sync function to only assign "Pastors" to the two specified emails
CREATE OR REPLACE FUNCTION sync_user_to_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new user registration)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO members (
      user_id,
      email,
      fullname,
      category,
      isactive,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      CASE
        WHEN LOWER(NEW.email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
        ELSE 'Members'::public.member_category
      END,
      true,
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      fullname = COALESCE(EXCLUDED.fullname, members.fullname),
      category = CASE
        WHEN LOWER(EXCLUDED.email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
        ELSE 'Members'::public.member_category
      END,
      updated_at = NOW();
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE (user profile changes)
  IF TG_OP = 'UPDATE' THEN
    UPDATE members SET
      email = NEW.email,
      fullname = COALESCE(NEW.raw_user_meta_data->>'full_name', fullname),
      category = CASE
        WHEN LOWER(NEW.email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
        ELSE 'Members'::public.member_category
      END,
      updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
  END IF;

  -- Handle DELETE (user deletion)
  IF TG_OP = 'DELETE' THEN
    UPDATE members SET
      isactive = false,
      updated_at = NOW()
    WHERE user_id = OLD.id;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the auth.users sync trigger (safe, no recursion)
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
CREATE TRIGGER trigger_sync_user_to_member
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_member();

-- STEP 4: FIX EXISTING INCORRECT CATEGORIES
-- Update all existing members to have correct categories
UPDATE public.members
SET
  category = CASE
    WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
    ELSE 'Members'::public.member_category
  END,
  updated_at = NOW()
WHERE category != CASE
  WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
  ELSE 'Members'::public.member_category
END;

-- STEP 5: RECREATE SUPER ADMIN FUNCTIONS (WITHOUT RECURSION TRIGGERS)
-- Drop and recreate the super admin functions to ensure they work properly
DROP FUNCTION IF EXISTS public.add_super_admin_by_email(TEXT);
DROP FUNCTION IF EXISTS public.list_super_admins();
DROP FUNCTION IF EXISTS public.remove_super_admin(UUID);

-- Create SAFE add_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.add_super_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    existing_role_count INTEGER;
    member_record RECORD;
BEGIN
    -- Normalize email
    admin_email := LOWER(TRIM(admin_email));
    
    -- Check if the user exists in members table
    SELECT m.user_id, m.fullname, m.email INTO member_record
    FROM public.members m 
    WHERE LOWER(m.email) = admin_email AND m.isactive = true;
    
    IF member_record.user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User with email ' || admin_email || ' not found in members table or is inactive.',
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
    
    -- Add superuser role (this will trigger the one-way sync to profiles)
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

-- Create SAFE list_super_admins function
CREATE OR REPLACE FUNCTION public.list_super_admins()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
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
        RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SAFE remove_super_admin function
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
    
    -- Remove superuser role (this will trigger the one-way sync to profiles)
    DELETE FROM public.user_roles ur
    WHERE ur.user_id = admin_id AND ur.role = 'superuser';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Super admin role removed from ' || COALESCE(admin_name || ' (' || admin_email || ')', 'user'),
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.add_super_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_super_admin(UUID) TO authenticated;

-- STEP 6: VERIFY THE FIXES
SELECT 'Recursion fix complete. Testing functions:' as status;

-- Test the functions
SELECT 'Current super admins:' as test, public.list_super_admins() as result;

-- Show corrected member categories
SELECT 
    'Member categories after fix:' as info,
    email,
    fullname,
    category,
    isactive
FROM public.members 
WHERE isactive = true
ORDER BY 
    CASE category 
        WHEN 'Pastors' THEN 1 
        ELSE 2 
    END,
    email;
