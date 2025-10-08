-- Supabase-Compatible Profile Sync Fix
-- This script fixes all profile synchronization issues in Supabase SQL Editor

-- Step 1: Comprehensive Profile Synchronization
BEGIN;

-- Create missing member records for users who exist in profiles but not in members
INSERT INTO members (
    fullname,
    email,
    category,
    churchunit,
    isactive,
    joindate,
    userid,
    created_at,
    updated_at
)
SELECT 
    COALESCE(p.full_name, 
        -- Extract name from email if full_name is null
        INITCAP(REPLACE(SPLIT_PART(p.email, '@', 1), '.', ' '))
    ) as fullname,
    p.email,
    'Members' as category,  -- Default category for new members
    NULL as churchunit,
    true as isactive,
    CURRENT_DATE as joindate,
    p.id as userid,
    COALESCE(p.created_at, NOW()) as created_at,
    COALESCE(p.updated_at, NOW()) as updated_at
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM members m WHERE m.email = p.email
);

-- Update existing member records that are missing userid links
UPDATE members 
SET 
    userid = p.id,
    fullname = COALESCE(members.fullname, p.full_name, 
        INITCAP(REPLACE(SPLIT_PART(members.email, '@', 1), '.', ' '))
    ),
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid IS NULL;

-- Create missing profile records for members who don't have profiles
INSERT INTO profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
)
SELECT 
    COALESCE(m.userid, gen_random_uuid()) as id,
    m.email,
    COALESCE(m.fullname, 
        INITCAP(REPLACE(SPLIT_PART(m.email, '@', 1), '.', ' '))
    ) as full_name,
    COALESCE(m.created_at, NOW()) as created_at,
    COALESCE(m.updated_at, NOW()) as updated_at
FROM members m
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.email = m.email
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

-- Update member records with the new profile IDs if they were created
UPDATE members 
SET 
    userid = p.id,
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid IS NULL;

-- Fix any mismatched userid references
UPDATE members 
SET 
    userid = p.id,
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid != p.id;

-- Ensure all active members have proper names
UPDATE members 
SET 
    fullname = COALESCE(
        NULLIF(TRIM(fullname), ''),
        p.full_name,
        INITCAP(REPLACE(SPLIT_PART(members.email, '@', 1), '.', ' '))
    ),
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND (members.fullname IS NULL OR TRIM(members.fullname) = '');

-- Ensure all profiles have proper names
UPDATE profiles 
SET 
    full_name = COALESCE(
        NULLIF(TRIM(full_name), ''),
        m.fullname,
        INITCAP(REPLACE(SPLIT_PART(profiles.email, '@', 1), '.', ' '))
    ),
    updated_at = NOW()
FROM members m
WHERE profiles.email = m.email 
AND (profiles.full_name IS NULL OR TRIM(profiles.full_name) = '');

COMMIT;

-- Step 2: Create Profile Sync Functions
-- Function to sync a single user's profile
CREATE OR REPLACE FUNCTION sync_user_profile(user_email TEXT)
RETURNS JSONB AS $$
DECLARE
    profile_record profiles%ROWTYPE;
    member_record members%ROWTYPE;
    result JSONB;
BEGIN
    -- Get profile record
    SELECT * INTO profile_record FROM profiles WHERE email = user_email;
    
    -- Get member record
    SELECT * INTO member_record FROM members WHERE email = user_email;
    
    -- Case 1: Profile exists but member doesn't
    IF profile_record.id IS NOT NULL AND member_record.id IS NULL THEN
        INSERT INTO members (
            fullname,
            email,
            category,
            isactive,
            joindate,
            userid,
            created_at,
            updated_at
        ) VALUES (
            COALESCE(profile_record.full_name, 
                INITCAP(REPLACE(SPLIT_PART(user_email, '@', 1), '.', ' '))
            ),
            user_email,
            'Members',
            true,
            CURRENT_DATE,
            profile_record.id,
            NOW(),
            NOW()
        );
        
        result := jsonb_build_object(
            'success', true,
            'action', 'created_member_record',
            'email', user_email
        );
        
    -- Case 2: Member exists but profile doesn't
    ELSIF member_record.id IS NOT NULL AND profile_record.id IS NULL THEN
        -- Generate new UUID if member doesn't have userid
        IF member_record.userid IS NULL THEN
            member_record.userid := gen_random_uuid();
            UPDATE members SET userid = member_record.userid WHERE id = member_record.id;
        END IF;
        
        INSERT INTO profiles (
            id,
            email,
            full_name,
            created_at,
            updated_at
        ) VALUES (
            member_record.userid,
            user_email,
            COALESCE(member_record.fullname,
                INITCAP(REPLACE(SPLIT_PART(user_email, '@', 1), '.', ' '))
            ),
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
            updated_at = NOW();
            
        result := jsonb_build_object(
            'success', true,
            'action', 'created_profile_record',
            'email', user_email
        );
        
    -- Case 3: Both exist but userid is missing or mismatched
    ELSIF profile_record.id IS NOT NULL AND member_record.id IS NOT NULL THEN
        IF member_record.userid IS NULL OR member_record.userid != profile_record.id THEN
            UPDATE members 
            SET 
                userid = profile_record.id,
                updated_at = NOW()
            WHERE id = member_record.id;
            
            result := jsonb_build_object(
                'success', true,
                'action', 'fixed_userid_link',
                'email', user_email
            );
        ELSE
            result := jsonb_build_object(
                'success', true,
                'action', 'already_synced',
                'email', user_email
            );
        END IF;
        
    -- Case 4: Neither exists (shouldn't happen in normal flow)
    ELSE
        result := jsonb_build_object(
            'success', false,
            'action', 'user_not_found',
            'email', user_email,
            'message', 'User does not exist in either table'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check sync status
CREATE OR REPLACE FUNCTION check_profile_sync_status()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    issues JSONB;
BEGIN
    -- Count various sync issues
    WITH sync_issues AS (
        SELECT 
            COUNT(*) FILTER (WHERE p.id IS NULL) as profiles_missing,
            COUNT(*) FILTER (WHERE m.id IS NULL) as members_missing,
            COUNT(*) FILTER (WHERE m.userid IS NULL) as userid_missing,
            COUNT(*) FILTER (WHERE m.userid IS NOT NULL AND p.id IS NOT NULL AND m.userid != p.id) as userid_mismatch
        FROM profiles p
        FULL OUTER JOIN members m ON p.email = m.email
    )
    SELECT jsonb_build_object(
        'profiles_missing', profiles_missing,
        'members_missing', members_missing,
        'userid_missing', userid_missing,
        'userid_mismatch', userid_mismatch,
        'total_issues', profiles_missing + members_missing + userid_missing + userid_mismatch
    ) INTO issues
    FROM sync_issues;
    
    result := jsonb_build_object(
        'total_profiles', (SELECT COUNT(*) FROM profiles),
        'total_members', (SELECT COUNT(*) FROM members),
        'synced_members', (SELECT COUNT(*) FROM members WHERE userid IS NOT NULL),
        'active_members', (SELECT COUNT(*) FROM members WHERE isactive = true),
        'issues', issues,
        'is_fully_synced', (issues->>'total_issues')::integer = 0
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create or update get_member_profile function
CREATE OR REPLACE FUNCTION public.get_member_profile(target_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    user_id_to_use UUID;
    member_data RECORD;
    result JSONB;
BEGIN
    -- Use provided user_id or get from auth context
    user_id_to_use := COALESCE(target_user_id, auth.uid());
    
    IF user_id_to_use IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No user ID provided and no authenticated user found'
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
            'success', false,
            'message', 'Member profile not found'
        );
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'success', true,
        'data', row_to_json(member_data)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_user_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_profile_sync_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_profile(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_profile_sync_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO service_role;

-- Step 4: Fix specific known users
-- Fix Sam Adeyemi specifically
SELECT sync_user_profile('dev.samadeyemi@gmail.com') as sam_sync_result;

-- Fix other known admin users
SELECT sync_user_profile('ojidelawrence@gmail.com') as ojidel_sync_result;
SELECT sync_user_profile('admin@gospellabourministry.com') as admin_sync_result;

-- Step 5: Final verification and results
SELECT 'SYNC VERIFICATION REPORT' as report_section;

-- Count totals
SELECT 
    'Total Counts:' as metric,
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM members) as members_count,
    (SELECT COUNT(*) FROM members WHERE userid IS NOT NULL) as members_with_userid;

-- Check overall sync status
SELECT check_profile_sync_status() as final_sync_status;

-- Show specific users with issues (if any)
SELECT 
    'Users with remaining sync issues:' as section,
    COALESCE(p.email, m.email) as email,
    CASE 
        WHEN p.id IS NULL THEN 'Missing profile'
        WHEN m.id IS NULL THEN 'Missing member record'
        WHEN m.userid IS NULL THEN 'Missing userid link'
        WHEN m.userid != p.id THEN 'Userid mismatch'
        ELSE 'OK'
    END as issue_type,
    p.id as profile_id,
    m.id as member_id,
    m.userid as member_userid
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email
WHERE p.id IS NULL 
   OR m.id IS NULL 
   OR m.userid IS NULL 
   OR (m.userid IS NOT NULL AND p.id IS NOT NULL AND m.userid != p.id)
ORDER BY email
LIMIT 10;

-- Test Sam's profile specifically
SELECT 
    'Sam Adeyemi Profile Test:' as test_section,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_name,
    m.id as member_id,
    m.email as member_email,
    m.fullname as member_name,
    m.userid as member_userid,
    m.category,
    m.isactive,
    CASE 
        WHEN p.id IS NOT NULL AND m.id IS NOT NULL AND m.userid = p.id THEN 'SYNCED'
        ELSE 'NOT SYNCED'
    END as sync_status
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email
WHERE p.email = 'dev.samadeyemi@gmail.com' OR m.email = 'dev.samadeyemi@gmail.com';

SELECT 
    'DEPLOYMENT COMPLETE' as status,
    'Profile sync fix has been deployed successfully' as message,
    NOW() as completed_at;