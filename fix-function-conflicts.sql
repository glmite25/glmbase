-- Fix Function Conflicts
-- This script resolves conflicts with duplicate function definitions

-- Drop all versions of the conflicting function (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.is_admin_or_superuser() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_superuser(UUID) CASCADE;

-- Create a single, consistent version of the function
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has admin or superuser role
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = $1
        AND ur.role IN ('admin', 'superuser')
    );
END;
$$;

-- Also create a version without parameters for backward compatibility
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser_current()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if current user has admin or superuser role
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superuser')
    );
END;
$$;

-- Drop any conflicting triggers that might be causing issues
DROP TRIGGER IF EXISTS enforce_member_field_restrictions_trigger ON public.members_enhanced;
DROP TRIGGER IF EXISTS sync_new_user_to_members_trigger ON public.profiles;
DROP TRIGGER IF EXISTS sync_member_to_profile_trigger ON public.members_enhanced;
DROP TRIGGER IF EXISTS sync_profile_to_member_trigger ON public.profiles_new;
DROP TRIGGER IF EXISTS trigger_sync_member_to_profile_enhanced ON public.members_enhanced;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_member_enhanced ON public.profiles;

-- Drop the problematic functions that are causing conflicts (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.enforce_member_field_restrictions() CASCADE;
DROP FUNCTION IF EXISTS public.sync_new_user_to_members() CASCADE;
DROP FUNCTION IF EXISTS public.sync_member_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_member() CASCADE;
DROP FUNCTION IF EXISTS public.sync_member_to_profile_enhanced() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_member_enhanced() CASCADE;

-- Log the fix
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'FUNCTION_CONFLICTS_FIXED',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Fixed function conflicts and removed problematic triggers',
        'timestamp', NOW()
    )
);

SELECT 'Function conflicts resolved successfully!' as status,
       'You can now proceed with data consolidation' as next_step;