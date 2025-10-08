-- Task 4.2: Update RLS policies for consolidated tables (Clean Version)
-- Requirements: 3.4, 4.5
-- This script updates RLS policies to work with the enhanced members table structure

-- Log the start of RLS policy updates
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'RLS_POLICIES_UPDATE_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting RLS policies update for enhanced tables',
        'timestamp', NOW()
    )
);

-- ========================================
-- CLEANUP EXISTING POLICIES
-- ========================================

-- Drop all existing policies on the enhanced members table
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

-- ========================================
-- ENABLE RLS ON TABLES
-- ========================================

-- Ensure RLS is enabled on the enhanced members table
ALTER TABLE public.members_enhanced ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ENHANCED MEMBERS TABLE POLICIES
-- ========================================

-- Policy 1: Authenticated users can view active members
CREATE POLICY "authenticated_users_can_view_active_members" ON public.members_enhanced
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND isactive = true
        AND membership_status = 'active'
    );

-- Policy 2: Users can view their own record
CREATE POLICY "users_can_view_own_record" ON public.members_enhanced
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Policy 3: Superusers have full access to all records
CREATE POLICY "superusers_full_access" ON public.members_enhanced
    FOR ALL USING (
        public.is_admin_or_superuser(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'superuser'
        )
    );

-- Policy 4: Admins can view all members
CREATE POLICY "admins_can_view_all_members" ON public.members_enhanced
    FOR SELECT USING (
        public.is_admin_or_superuser(auth.uid())
    );

-- Policy 5: Admins can insert new members
CREATE POLICY "admins_can_insert_members" ON public.members_enhanced
    FOR INSERT WITH CHECK (
        public.is_admin_or_superuser(auth.uid())
    );

-- Policy 6: Admins can update all members
CREATE POLICY "admins_can_update_all_members" ON public.members_enhanced
    FOR UPDATE USING (
        public.is_admin_or_superuser(auth.uid())
    );

-- Policy 7: Users can update their own basic info
CREATE POLICY "users_can_update_own_basic_info" ON public.members_enhanced
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- ========================================
-- PROFILES TABLE POLICIES
-- ========================================

-- Policy 1: Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
    );

-- Policy 2: Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    );

-- Policy 3: Admins can view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (
        public.is_admin_or_superuser(auth.uid())
    );

-- Policy 4: Superusers can manage all profiles
CREATE POLICY "superusers_can_manage_all_profiles" ON public.profiles
    FOR ALL USING (
        public.is_admin_or_superuser(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'superuser'
        )
    );

-- Policy 5: Allow profile creation during user registration
CREATE POLICY "allow_profile_creation_on_signup" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant necessary permissions
GRANT SELECT ON public.members_enhanced TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Log the completion of RLS policy updates
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'RLS_POLICIES_UPDATE_COMPLETE',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'RLS policies updated successfully for enhanced tables',
        'members_policies_created', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced'),
        'profiles_policies_created', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'),
        'timestamp', NOW()
    )
);

-- Final success message
SELECT 'RLS policies updated successfully!' as completion_status,
       (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced') as members_policies_created,
       (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles') as profiles_policies_created;