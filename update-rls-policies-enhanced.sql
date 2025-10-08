-- Task 4.2: Update RLS policies for consolidated tables
-- Requirements: 3.4, 4.5
-- This script updates RLS policies to work with the enhanced members table structure

-- First, drop all existing policies on the enhanced members table
DROP POLICY IF EXISTS "authenticated_users_can_view_active_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "users_can_view_own_record" ON public.members_enhanced;
DROP POLICY IF EXISTS "admins_can_view_all_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "superusers_full_access" ON public.members_enhanced;
DROP POLICY IF EXISTS "admins_can_insert_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "admins_can_update_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "admins_can_update_all_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "users_can_update_own_basic_info" ON public.members_enhanced;
DROP POLICY IF EXISTS "pastors_can_view_assigned_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "pastors_can_update_assigned_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "admins_can_soft_delete_members" ON public.members_enhanced;
DROP POLICY IF EXISTS "admins_can_delete_members" ON public.members_enhanced;

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "superusers_can_manage_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_profile_creation_on_signup" ON public.profiles;

-- Ensure RLS is enabled on the enhanced members table
ALTER TABLE public.members_enhanced ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can view active members
-- This allows general users to see active members for church directory purposes
CREATE POLICY "authenticated_users_can_view_active_members" ON public.members_enhanced
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND isactive = true
        AND membership_status = 'active'
    );

-- Policy 2: Users can view their own record (even if inactive)
-- This allows users to see their own profile regardless of status
CREATE POLICY "users_can_view_own_record" ON public.members_enhanced
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Policy 3: Superusers have full access to all records
-- This provides emergency access for designated superuser emails
CREATE POLICY "superusers_full_access" ON public.members_enhanced
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'superuser'
        )
        OR 
        -- Hardcoded superuser emails for emergency access
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy 4: Admins can view all members
-- This allows admins to see all member records for management purposes
CREATE POLICY "admins_can_view_all_members" ON public.members_enhanced
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR
        -- Include hardcoded admin emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy 5: Admins can insert new members
-- This allows admins to create new member records
CREATE POLICY "admins_can_insert_members" ON public.members_enhanced
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR
        -- Include hardcoded admin emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy 6: Admins can update all members
-- This allows admins to modify member records
CREATE POLICY "admins_can_update_all_members" ON public.members_enhanced
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR
        -- Include hardcoded admin emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy 7: Users can update their own basic information (restricted)
-- This allows users to update limited fields in their own record
-- Note: Field-level restrictions are handled by application logic and triggers
CREATE POLICY "users_can_update_own_basic_info" ON public.members_enhanced
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- Policy 8: Pastors can view members in their assigned units
-- This allows pastors to see members they are responsible for
CREATE POLICY "pastors_can_view_assigned_members" ON public.members_enhanced
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members_enhanced pastor
            WHERE pastor.user_id = auth.uid()
            AND pastor.category = 'Pastors'
            AND pastor.isactive = true
            AND (
                members_enhanced.assignedto = pastor.id
                OR members_enhanced.churchunit = pastor.churchunit
                OR members_enhanced.churchunit = ANY(pastor.churchunits)
            )
        )
    );

-- Policy 9: Pastors can update basic info for assigned members
-- This allows pastors to update certain fields for members under their care
-- Note: Field-level restrictions are handled by application logic and triggers
CREATE POLICY "pastors_can_update_assigned_members" ON public.members_enhanced
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.members_enhanced pastor
            WHERE pastor.user_id = auth.uid()
            AND pastor.category = 'Pastors'
            AND pastor.isactive = true
            AND (
                members_enhanced.assignedto = pastor.id
                OR members_enhanced.churchunit = pastor.churchunit
                OR members_enhanced.churchunit = ANY(pastor.churchunits)
            )
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members_enhanced pastor
            WHERE pastor.user_id = auth.uid()
            AND pastor.category = 'Pastors'
            AND pastor.isactive = true
            AND (
                members_enhanced.assignedto = pastor.id
                OR members_enhanced.churchunit = pastor.churchunit
                OR members_enhanced.churchunit = ANY(pastor.churchunits)
            )
        )
    );

-- Policy 10: Soft delete policy for admins
-- This allows admins to "delete" members by setting isactive to false
-- Note: Soft delete logic is handled by application logic and triggers
CREATE POLICY "admins_can_soft_delete_members" ON public.members_enhanced
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR
        -- Include hardcoded admin emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR
        -- Include hardcoded admin emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Update RLS policies for the lightweight profiles table
-- Drop existing policies
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_manage_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "superusers_can_manage_all_profiles" ON public.profiles;

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
    );

-- Policy 2: Users can update their own profile (basic info only)
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    ) WITH CHECK (
        auth.uid() = id
    );

-- Policy 3: Admins can view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
        OR
        -- Include hardcoded admin emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy 4: Superusers can manage all profiles
CREATE POLICY "superusers_can_manage_all_profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'superuser'
        )
        OR
        -- Include hardcoded superuser emails
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy 5: Allow profile creation during user registration
CREATE POLICY "allow_profile_creation_on_signup" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- Create helper function to check if user is admin or superuser
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'superuser')
    ) OR auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is superuser
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'superuser'
    ) OR auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is pastor
CREATE OR REPLACE FUNCTION public.is_pastor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members_enhanced 
        WHERE user_id = auth.uid() 
        AND category = 'Pastors'
        AND isactive = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to enforce field-level restrictions
CREATE OR REPLACE FUNCTION public.enforce_member_field_restrictions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is updating their own record
    IF OLD.user_id = auth.uid() THEN
        -- Users can only update certain fields
        IF OLD.email != NEW.email THEN
            RAISE EXCEPTION 'Users cannot change their email address';
        END IF;
        
        IF OLD.role != NEW.role THEN
            RAISE EXCEPTION 'Users cannot change their role';
        END IF;
        
        IF OLD.category != NEW.category THEN
            RAISE EXCEPTION 'Users cannot change their category';
        END IF;
        
        IF OLD.assignedto != NEW.assignedto OR (OLD.assignedto IS NULL AND NEW.assignedto IS NOT NULL) OR (OLD.assignedto IS NOT NULL AND NEW.assignedto IS NULL) THEN
            RAISE EXCEPTION 'Users cannot change their assigned pastor';
        END IF;
        
        IF OLD.user_id != NEW.user_id THEN
            RAISE EXCEPTION 'Users cannot change their user_id';
        END IF;
    END IF;
    
    -- Check if pastor is updating assigned member
    IF EXISTS (
        SELECT 1 FROM public.members_enhanced pastor
        WHERE pastor.user_id = auth.uid()
        AND pastor.category = 'Pastors'
        AND pastor.isactive = true
        AND (
            OLD.assignedto = pastor.id
            OR OLD.churchunit = pastor.churchunit
            OR OLD.churchunit = ANY(pastor.churchunits)
        )
    ) AND NOT public.is_admin_or_superuser() THEN
        -- Pastors have similar restrictions
        IF OLD.email != NEW.email THEN
            RAISE EXCEPTION 'Pastors cannot change member email addresses';
        END IF;
        
        IF OLD.role != NEW.role THEN
            RAISE EXCEPTION 'Pastors cannot change member roles';
        END IF;
        
        IF OLD.user_id != NEW.user_id THEN
            RAISE EXCEPTION 'Pastors cannot change member user_id';
        END IF;
        
        IF OLD.category != NEW.category THEN
            RAISE EXCEPTION 'Pastors cannot change member categories';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for field restrictions
DROP TRIGGER IF EXISTS enforce_member_field_restrictions_trigger ON public.members_enhanced;
CREATE TRIGGER enforce_member_field_restrictions_trigger
    BEFORE UPDATE ON public.members_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_member_field_restrictions();

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_admin_or_superuser() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superuser() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pastor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_member_field_restrictions() TO authenticated;

-- Create function to validate RLS policy effectiveness
CREATE OR REPLACE FUNCTION public.test_enhanced_rls_policies(
    test_user_email TEXT DEFAULT NULL
)
RETURNS TABLE(
    policy_test TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    test_member_id UUID;
    test_user_id UUID;
    admin_count INTEGER;
    superuser_count INTEGER;
BEGIN
    -- Get test user info if provided
    IF test_user_email IS NOT NULL THEN
        SELECT id INTO test_user_id FROM auth.users WHERE email = test_user_email;
        SELECT id INTO test_member_id FROM public.members_enhanced WHERE email = test_user_email;
    END IF;

    -- Test 1: Check if RLS is enabled
    RETURN QUERY
    SELECT 
        'rls_enabled_members'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE tablename = 'members_enhanced' 
                AND schemaname = 'public' 
                AND rowsecurity = true
            ) THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'RLS enabled on members_enhanced table'::TEXT;

    RETURN QUERY
    SELECT 
        'rls_enabled_profiles'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE tablename = 'profiles' 
                AND schemaname = 'public' 
                AND rowsecurity = true
            ) THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'RLS enabled on profiles table'::TEXT;

    -- Test 2: Count policies on enhanced members table
    RETURN QUERY
    SELECT 
        'members_policy_count'::TEXT,
        CASE 
            WHEN COUNT(*) >= 8 THEN 'PASS'::TEXT
            ELSE 'WARNING'::TEXT
        END,
        'Found ' || COUNT(*)::TEXT || ' policies on members_enhanced table'::TEXT
    FROM pg_policies 
    WHERE tablename = 'members_enhanced' AND schemaname = 'public';

    -- Test 3: Count policies on profiles table
    RETURN QUERY
    SELECT 
        'profiles_policy_count'::TEXT,
        CASE 
            WHEN COUNT(*) >= 4 THEN 'PASS'::TEXT
            ELSE 'WARNING'::TEXT
        END,
        'Found ' || COUNT(*)::TEXT || ' policies on profiles table'::TEXT
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';

    -- Test 4: Check admin/superuser counts
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role IN ('admin', 'superuser');

    RETURN QUERY
    SELECT 
        'admin_superuser_count'::TEXT,
        CASE 
            WHEN admin_count > 0 THEN 'PASS'::TEXT
            ELSE 'WARNING'::TEXT
        END,
        'Found ' || admin_count::TEXT || ' admin/superuser roles'::TEXT;

    -- Test 5: Check helper functions exist
    RETURN QUERY
    SELECT 
        'helper_functions_exist'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.routines 
                WHERE routine_name IN ('is_admin_or_superuser', 'is_superuser', 'is_pastor')
                AND routine_schema = 'public'
            ) THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Helper functions for RLS policies exist'::TEXT;

    -- Test 6: Validate superuser email access
    RETURN QUERY
    SELECT 
        'superuser_email_access'::TEXT,
        'INFO'::TEXT,
        'Hardcoded superuser emails: ojidelawrence@gmail.com, popsabey1@gmail.com'::TEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION public.test_enhanced_rls_policies(TEXT) TO authenticated;

-- Create function to migrate existing RLS policies from old members table
CREATE OR REPLACE FUNCTION public.migrate_existing_rls_policies()
RETURNS TEXT AS $$
DECLARE
    policy_record RECORD;
    migration_log TEXT := '';
BEGIN
    -- Log start of migration
    migration_log := migration_log || 'Starting RLS policy migration...' || E'\n';

    -- Check if old members table exists and has policies
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'members' AND schemaname = 'public'
    LOOP
        migration_log := migration_log || 'Found old policy: ' || policy_record.policyname || E'\n';
    END LOOP;

    -- Drop old policies if old members table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members' AND table_schema = 'public') THEN
        migration_log := migration_log || 'Dropping old members table policies...' || E'\n';
        
        EXECUTE 'DROP POLICY IF EXISTS "Users can view active members" ON public.members';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own member record" ON public.members';
        EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all members" ON public.members';
        EXECUTE 'DROP POLICY IF EXISTS "Superusers can manage all members" ON public.members';
        EXECUTE 'DROP POLICY IF EXISTS "Pastors can view their unit members" ON public.members';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own basic info" ON public.members';
        
        migration_log := migration_log || 'Old policies dropped successfully' || E'\n';
    END IF;

    migration_log := migration_log || 'RLS policy migration completed' || E'\n';
    
    RETURN migration_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on migration function
GRANT EXECUTE ON FUNCTION public.migrate_existing_rls_policies() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_admin_or_superuser() IS 'Helper function to check if current user is admin or superuser';
COMMENT ON FUNCTION public.is_superuser() IS 'Helper function to check if current user is superuser';
COMMENT ON FUNCTION public.is_pastor() IS 'Helper function to check if current user is a pastor';
COMMENT ON FUNCTION public.test_enhanced_rls_policies(TEXT) IS 'Tests the effectiveness of enhanced RLS policies';
COMMENT ON FUNCTION public.migrate_existing_rls_policies() IS 'Migrates RLS policies from old members table to enhanced structure';

-- Final validation: Ensure all policies are properly created
DO $$
DECLARE
    members_policy_count INTEGER;
    profiles_policy_count INTEGER;
BEGIN
    -- Count policies on enhanced members table
    SELECT COUNT(*) INTO members_policy_count
    FROM pg_policies 
    WHERE tablename = 'members_enhanced' AND schemaname = 'public';
    
    -- Count policies on profiles table
    SELECT COUNT(*) INTO profiles_policy_count
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    -- Log results
    RAISE NOTICE 'Enhanced members table has % policies', members_policy_count;
    RAISE NOTICE 'Profiles table has % policies', profiles_policy_count;
    
    -- Validate minimum policy counts
    IF members_policy_count < 8 THEN
        RAISE WARNING 'Enhanced members table has fewer policies than expected (found %, expected >= 8)', members_policy_count;
    END IF;
    
    IF profiles_policy_count < 4 THEN
        RAISE WARNING 'Profiles table has fewer policies than expected (found %, expected >= 4)', profiles_policy_count;
    END IF;
END $$;