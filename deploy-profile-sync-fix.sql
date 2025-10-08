-- Comprehensive Profile Sync Fix Deployment Script
-- This script will fix all profile synchronization issues

-- Step 1: Run the comprehensive profile sync
\echo 'Step 1: Running comprehensive profile synchronization...'
\i sync-all-profiles.sql

-- Step 2: Deploy the profile sync functions
\echo 'Step 2: Deploying profile sync functions...'
\i profile-sync-functions.sql

-- Step 3: Ensure the get_member_profile function exists and works correctly
\echo 'Step 3: Verifying get_member_profile function...'

-- Check if the function exists
SELECT 
    'get_member_profile function status:' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' AND p.proname = 'get_member_profile'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as status;

-- If the function doesn't exist, create a simplified version
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_member_profile'
    ) THEN
        -- Create a simplified get_member_profile function
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.get_member_profile(target_user_id UUID DEFAULT NULL)
        RETURNS JSONB AS $func$
        DECLARE
            user_id_to_use UUID;
            member_data RECORD;
            result JSONB;
        BEGIN
            -- Use provided user_id or get from auth context
            user_id_to_use := COALESCE(target_user_id, auth.uid());
            
            IF user_id_to_use IS NULL THEN
                RETURN jsonb_build_object(
                    ''success'', false,
                    ''message'', ''No user ID provided and no authenticated user found''
                );
            END IF;
            
            -- Get member data
            SELECT 
                m.*,
                p.full_name as profile_name,
                pastor.fullname as assigned_pastor_name
            INTO member_data
            FROM members m
            LEFT JOIN profiles p ON m.userid = p.id
            LEFT JOIN members pastor ON m.assignedto = pastor.id
            WHERE m.userid = user_id_to_use
            LIMIT 1;
            
            IF NOT FOUND THEN
                RETURN jsonb_build_object(
                    ''success'', false,
                    ''message'', ''Member profile not found''
                );
            END IF;
            
            -- Build result
            result := jsonb_build_object(
                ''success'', true,
                ''data'', row_to_json(member_data)
            );
            
            RETURN result;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        ';
        
        -- Grant permissions
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO authenticated;';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO service_role;';
        
        RAISE NOTICE 'Created simplified get_member_profile function';
    END IF;
END $$;

-- Step 4: Fix specific known users (like Sam)
\echo 'Step 4: Fixing specific known users...'

-- Fix Sam Adeyemi specifically
SELECT sync_user_profile('dev.samadeyemi@gmail.com') as sam_sync_result;

-- Fix other known admin users
SELECT sync_user_profile('ojidelawrence@gmail.com') as ojidel_sync_result;
SELECT sync_user_profile('admin@gospellabourministry.com') as admin_sync_result;

-- Step 5: Final verification
\echo 'Step 5: Final verification...'

-- Check overall sync status
SELECT check_profile_sync_status() as final_sync_status;

-- Test the get_member_profile function with Sam's account
DO $$
DECLARE
    sam_user_id UUID;
    profile_test JSONB;
BEGIN
    -- Get Sam's user ID
    SELECT id INTO sam_user_id FROM profiles WHERE email = 'dev.samadeyemi@gmail.com';
    
    IF sam_user_id IS NOT NULL THEN
        -- Test the function
        SELECT public.get_member_profile(sam_user_id) INTO profile_test;
        RAISE NOTICE 'Sam profile test result: %', profile_test;
    ELSE
        RAISE NOTICE 'Sam not found in profiles table';
    END IF;
END $$;

-- Show final status
SELECT 
    'DEPLOYMENT COMPLETE' as status,
    'Profile sync fix has been deployed successfully' as message,
    NOW() as completed_at;