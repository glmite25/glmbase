-- Aggressive Cleanup Script
-- This script removes all potentially conflicting triggers and functions

-- Log the cleanup start
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'AGGRESSIVE_CLEANUP_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting aggressive cleanup of conflicting database objects',
        'timestamp', NOW()
    )
);

-- Drop all triggers that might be causing conflicts
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Drop triggers on members_enhanced table
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_table = 'members_enhanced'
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.' || trigger_record.event_object_table || ' CASCADE';
        RAISE NOTICE 'Dropped trigger: % on %', trigger_record.trigger_name, trigger_record.event_object_table;
    END LOOP;
    
    -- Drop triggers on profiles table
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE event_object_table IN ('profiles', 'profiles_new')
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.' || trigger_record.event_object_table || ' CASCADE';
        RAISE NOTICE 'Dropped trigger: % on %', trigger_record.trigger_name, trigger_record.event_object_table;
    END LOOP;
END $$;

-- Drop all potentially conflicting functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_name LIKE '%sync%'
        OR routine_name LIKE '%admin%'
        OR routine_name LIKE '%enforce%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_schema || '.' || func_record.routine_name || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.routine_name;
    END LOOP;
END $$;

-- Specifically drop known problematic functions
DROP FUNCTION IF EXISTS public.is_admin_or_superuser() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_superuser(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.enforce_member_field_restrictions() CASCADE;
DROP FUNCTION IF EXISTS public.sync_new_user_to_members() CASCADE;
DROP FUNCTION IF EXISTS public.sync_member_to_profile() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_member() CASCADE;
DROP FUNCTION IF EXISTS public.sync_member_to_profile_enhanced() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_member_enhanced() CASCADE;

-- Create a single, clean version of the admin check function
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has admin or superuser role
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = COALESCE($1, auth.uid())
        AND ur.role IN ('admin', 'superuser')
    );
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, return false for safety
        RETURN FALSE;
END;
$$;

-- Log the cleanup completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'AGGRESSIVE_CLEANUP_COMPLETE',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Aggressive cleanup completed successfully',
        'timestamp', NOW()
    )
);

SELECT 'Aggressive cleanup completed successfully!' as status,
       'All conflicting triggers and functions have been removed' as result,
       'You can now proceed with data consolidation' as next_step;