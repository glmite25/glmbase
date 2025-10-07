-- COMPREHENSIVE FIX: Recursion, Categories, and Church Units
-- Run this ENTIRE script in Supabase SQL Editor

-- ========================================
-- PART 1: COMPLETELY ELIMINATE RECURSION
-- ========================================

-- Step 1: Drop ALL triggers that could cause recursion (COMPREHENSIVE LIST)
DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.user_roles;
DROP TRIGGER IF EXISTS trigger_sync_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS sync_user_role_to_profile ON public.user_roles;
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_roles_one_way ON public.user_roles;
DROP TRIGGER IF EXISTS trigger_handle_role_deletion ON public.user_roles;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_safe ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CRITICAL: Drop the missing trigger that was causing the dependency error
DROP TRIGGER IF EXISTS sync_roles_safely_trigger ON public.user_roles;
-- Additional triggers that might exist
DROP TRIGGER IF EXISTS trigger_sync_roles_safely ON public.user_roles;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS sync_member_to_profile ON public.members;
DROP TRIGGER IF EXISTS update_profile_trigger ON public.profiles;

-- Step 2: Drop ALL problematic functions (WITH CASCADE for safety)
DROP FUNCTION IF EXISTS public.sync_user_roles_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_role_to_user_roles() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_role_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.sync_roles_one_way() CASCADE;
DROP FUNCTION IF EXISTS public.sync_roles_safely() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_role_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member_safe() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- Additional functions that might exist
DROP FUNCTION IF EXISTS public.sync_member_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.update_profile_from_auth() CASCADE;

-- ========================================
-- PART 2: UPDATE MEMBER CATEGORIES ENUM
-- ========================================

-- Step 3: Check current member_category enum values
SELECT 'Current member_category enum values:' as info;
SELECT enumlabel as current_values
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'member_category')
ORDER BY enumsortorder;

-- Step 4: Update member_category enum to correct values
-- First, add the new values if they don't exist
DO $$
BEGIN
    -- Add MINT if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'MINT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'member_category')
    ) THEN
        ALTER TYPE public.member_category ADD VALUE 'MINT';
    END IF;
    
    -- Ensure Members and Pastors exist (they should already)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Members' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'member_category')
    ) THEN
        ALTER TYPE public.member_category ADD VALUE 'Members';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Pastors' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'member_category')
    ) THEN
        ALTER TYPE public.member_category ADD VALUE 'Pastors';
    END IF;
END $$;

-- Step 5: Update existing member categories to correct values (FIXED - removed invalid categories)
UPDATE public.members
SET
    category = CASE
        WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
        WHEN category IN ('Workers', 'Visitors', 'Partners') THEN 'Members'::public.member_category
        ELSE category -- Keep existing if already correct (Members, Pastors, MINT)
    END,
    updated_at = NOW()
WHERE category IS NOT NULL;

-- ========================================
-- PART 3: CREATE SAFE, NON-RECURSIVE FUNCTIONS
-- ========================================

-- Step 6: Create safe user-to-member sync function (NO PROFILE INTERACTION)
CREATE OR REPLACE FUNCTION sync_user_to_member_final()
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

-- Step 7: Create ONLY the essential trigger (auth.users -> members only)
CREATE TRIGGER trigger_sync_user_to_member_final
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_member_final();

-- ========================================
-- PART 4: RECREATE SUPER ADMIN FUNCTIONS (NO RECURSION)
-- ========================================

-- Step 8: Drop and recreate super admin functions
DROP FUNCTION IF EXISTS public.add_super_admin_by_email(TEXT);
DROP FUNCTION IF EXISTS public.list_super_admins();
DROP FUNCTION IF EXISTS public.remove_super_admin(UUID);

-- Step 9: Create SAFE add_super_admin_by_email function
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
    
    -- Add superuser role (NO TRIGGERS will fire because we removed them all)
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

-- Step 10: Create SAFE list_super_admins function
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

-- Step 11: Create SAFE remove_super_admin function
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

-- Step 12: Grant permissions
GRANT EXECUTE ON FUNCTION public.add_super_admin_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_super_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_super_admin(UUID) TO authenticated;

-- ========================================
-- PART 5: CHURCH UNITS MIGRATION (SAFE)
-- ========================================

-- Step 13: Update church units validation function
CREATE OR REPLACE FUNCTION validate_churchunits()
RETURNS TRIGGER AS $$
DECLARE
    valid_units TEXT[] := ARRAY['3hmedia', '3hmusic', '3hmovies', '3hsecurity', 'discipleship', 'praisefeet', 'cloventongues'];
    unit TEXT;
BEGIN
    IF NEW.churchunits IS NULL THEN
        RETURN NEW;
    END IF;

    FOREACH unit IN ARRAY NEW.churchunits
    LOOP
        IF NOT (unit = ANY(valid_units)) THEN
            RAISE EXCEPTION 'Invalid church unit: %. Valid units are: %', unit, array_to_string(valid_units, ', ');
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Create church unit migration function
CREATE OR REPLACE FUNCTION migrate_church_unit_name(old_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE
        WHEN LOWER(old_name) IN ('3h media', '3hmedia') THEN '3HMedia'
        WHEN LOWER(old_name) IN ('3h music', '3hmusic') THEN '3HMusic'
        WHEN LOWER(old_name) IN ('3h movies', '3hmovies') THEN '3HMovies'
        WHEN LOWER(old_name) IN ('3h security', '3hsecurity') THEN '3HSecurity'
        WHEN LOWER(old_name) IN ('discipleship') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('praise feet', 'praisefeet') THEN 'Praise Feet'
        WHEN LOWER(old_name) IN ('cloven tongues', 'cloventongues') THEN 'Cloven Tongues'
        WHEN LOWER(old_name) IN ('auxano group', 'auxano') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('tof') THEN 'Cloven Tongues'
        ELSE old_name
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Migrate church units
UPDATE public.members
SET
    churchunit = migrate_church_unit_name(churchunit),
    updated_at = NOW()
WHERE churchunit IS NOT NULL;

-- Step 16: Update church units array
UPDATE public.members
SET
    churchunits = ARRAY(
        SELECT migrate_church_unit_name(unnest_unit)
        FROM unnest(churchunits) as unnest_unit
    ),
    updated_at = NOW()
WHERE churchunits IS NOT NULL AND array_length(churchunits, 1) > 0;

-- ========================================
-- PART 6: VERIFICATION AND CLEANUP
-- ========================================

-- Step 17: Show final status
SELECT 'FINAL STATUS REPORT:' as report_section;

SELECT 'Member Categories:' as category_info;
SELECT
    category,
    COUNT(*) as member_count
FROM public.members
WHERE isactive = true
GROUP BY category
ORDER BY member_count DESC;

SELECT 'Pastor Assignments:' as pastor_info;
SELECT
    email,
    fullname,
    category
FROM public.members
WHERE category = 'Pastors' AND isactive = true;

SELECT 'Church Units:' as church_unit_info;
SELECT
    churchunit,
    COUNT(*) as member_count
FROM public.members
WHERE churchunit IS NOT NULL AND isactive = true
GROUP BY churchunit
ORDER BY member_count DESC;

SELECT 'Active Triggers (should be minimal):' as trigger_info;
SELECT
    n.nspname as schemaname,
    c.relname as tablename,
    t.tgname as triggername
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
  AND c.relname IN ('users', 'profiles', 'members', 'user_roles')
  AND NOT t.tgisinternal;

-- Step 18: Clean up migration functions
DROP FUNCTION IF EXISTS migrate_church_unit_name(TEXT);

SELECT 'COMPREHENSIVE FIX COMPLETED SUCCESSFULLY!' as final_status;
