-- EMERGENCY: Stop ALL Recursion Immediately
-- Run this FIRST to stop the infinite recursion

-- STEP 1: DROP ALL POTENTIALLY PROBLEMATIC TRIGGERS
-- Drop triggers on user_roles table
DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.user_roles;
DROP TRIGGER IF EXISTS sync_user_role_to_profile ON public.user_roles;
DROP TRIGGER IF EXISTS trigger_sync_roles_one_way ON public.user_roles;
DROP TRIGGER IF EXISTS trigger_handle_role_deletion ON public.user_roles;

-- Drop triggers on profiles table  
DROP TRIGGER IF EXISTS trigger_sync_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;

-- Drop triggers on auth.users table (temporarily)
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: DROP ALL PROBLEMATIC FUNCTIONS
DROP FUNCTION IF EXISTS public.sync_user_roles_to_profile();
DROP FUNCTION IF EXISTS public.sync_profile_role_to_user_roles();
DROP FUNCTION IF EXISTS public.sync_user_role_to_profile();
DROP FUNCTION IF EXISTS public.sync_roles_one_way();
DROP FUNCTION IF EXISTS public.handle_user_role_deletion();

-- STEP 3: RECREATE ONLY ESSENTIAL, SAFE FUNCTIONS

-- Safe function to sync user to member (no profile interaction)
CREATE OR REPLACE FUNCTION sync_user_to_member_safe()
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

  -- Handle UPDATE (user profile changes) - NO PROFILE TABLE INTERACTION
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

-- STEP 4: CREATE ONLY THE ESSENTIAL TRIGGER (auth.users -> members only)
CREATE TRIGGER trigger_sync_user_to_member_safe
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_member_safe();

-- STEP 5: FIX EXISTING CATEGORIES (without any trigger interactions)
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

-- STEP 6: RECREATE SUPER ADMIN FUNCTIONS (NO PROFILE INTERACTION)
DROP FUNCTION IF EXISTS public.add_super_admin_by_email(TEXT);
DROP FUNCTION IF EXISTS public.list_super_admins();
DROP FUNCTION IF EXISTS public.remove_super_admin(UUID);

-- Safe add_super_admin_by_email function (no profile updates)
CREATE OR REPLACE FUNCTION public.add_super_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    existing_role_count INTEGER;
    member_record RECORD;
BEGIN
    admin_email := LOWER(TRIM(admin_email));
    
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
    
    -- Add superuser role (NO TRIGGERS will fire because we removed them)
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

-- Safe list_super_admins function
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

-- Safe remove_super_admin function
CREATE OR REPLACE FUNCTION public.remove_super_admin(admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    admin_email TEXT;
    admin_name TEXT;
    role_count INTEGER;
BEGIN
    SELECT m.email, m.fullname INTO admin_email, admin_name
    FROM public.members m 
    WHERE m.user_id = admin_id AND m.isactive = true;
    
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
    
    -- Remove superuser role (NO TRIGGERS will fire)
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

-- STEP 7: VERIFY THE EMERGENCY FIX
SELECT 'Emergency recursion fix complete. All problematic triggers removed.' as status;

-- Test the functions
SELECT 'Testing super admin functions:' as test;
SELECT public.list_super_admins() as current_super_admins;

-- Show member categories
SELECT 
    'Member categories after emergency fix:' as info,
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
    email
LIMIT 10;
