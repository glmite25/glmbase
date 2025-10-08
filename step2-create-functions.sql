-- STEP 2: Create Profile Management Functions
-- Run this second to create the sync and management functions

-- Function to sync a single user's profile
CREATE OR REPLACE FUNCTION sync_user_profile(user_email TEXT)
RETURNS JSONB AS $$
DECLARE
    profile_record profiles%ROWTYPE;
    member_record members%ROWTYPE;
    default_category TEXT;
    result JSONB;
BEGIN
    -- Get profile record
    SELECT * INTO profile_record FROM profiles WHERE email = user_email;
    
    -- Get member record
    SELECT * INTO member_record FROM members WHERE email = user_email;
    
    -- Get default category
    SELECT category INTO default_category 
    FROM members 
    WHERE category IS NOT NULL 
    GROUP BY category 
    ORDER BY COUNT(*) DESC 
    LIMIT 1;
    
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
            default_category,
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

-- Create or update get_member_profile function
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

SELECT 'STEP 2 COMPLETE - Functions Created Successfully!' as status;