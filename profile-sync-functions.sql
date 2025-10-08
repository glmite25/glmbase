-- Profile Synchronization Functions
-- These functions ensure ongoing sync between profiles and members tables

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
            'Others',
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

-- Function to sync all profiles
CREATE OR REPLACE FUNCTION sync_all_profiles()
RETURNS JSONB AS $$
DECLARE
    sync_count INTEGER := 0;
    error_count INTEGER := 0;
    user_email TEXT;
    sync_result JSONB;
    final_result JSONB;
BEGIN
    -- Sync all users from profiles table
    FOR user_email IN SELECT email FROM profiles LOOP
        BEGIN
            SELECT sync_user_profile(user_email) INTO sync_result;
            IF (sync_result->>'success')::boolean THEN
                sync_count := sync_count + 1;
            ELSE
                error_count := error_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;
    
    -- Sync all users from members table who might not be in profiles
    FOR user_email IN 
        SELECT DISTINCT m.email 
        FROM members m 
        LEFT JOIN profiles p ON m.email = p.email 
        WHERE p.id IS NULL 
    LOOP
        BEGIN
            SELECT sync_user_profile(user_email) INTO sync_result;
            IF (sync_result->>'success')::boolean THEN
                sync_count := sync_count + 1;
            ELSE
                error_count := error_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;
    
    final_result := jsonb_build_object(
        'success', true,
        'synced_count', sync_count,
        'error_count', error_count,
        'total_profiles', (SELECT COUNT(*) FROM profiles),
        'total_members', (SELECT COUNT(*) FROM members),
        'synced_members', (SELECT COUNT(*) FROM members WHERE userid IS NOT NULL)
    );
    
    RETURN final_result;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_user_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION check_profile_sync_status() TO authenticated;

-- Also grant to service_role for admin operations
GRANT EXECUTE ON FUNCTION sync_user_profile(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION sync_all_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION check_profile_sync_status() TO service_role;

SELECT 'Profile sync functions created successfully!' as status;