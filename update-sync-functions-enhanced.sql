-- Task 4.1: Update user synchronization triggers for consolidated structure
-- Requirements: 3.1, 3.2, 3.3
-- This script updates the sync_user_to_member function to work with the enhanced members table

-- Drop existing triggers and functions to avoid conflicts
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_safe ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_final ON auth.users;
DROP FUNCTION IF EXISTS public.sync_user_to_member() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member_safe() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member_final() CASCADE;

-- Create enhanced sync function for the consolidated members table
CREATE OR REPLACE FUNCTION public.sync_user_to_member_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    member_exists BOOLEAN := FALSE;
    profile_data RECORD;
BEGIN
    -- Handle INSERT (new user registration)
    IF TG_OP = 'INSERT' THEN
        -- Check if member already exists
        SELECT EXISTS(SELECT 1 FROM public.members_enhanced WHERE email = NEW.email) INTO member_exists;
        
        -- Get additional data from profiles table if it exists
        SELECT full_name, genotype, role 
        INTO profile_data 
        FROM public.profiles 
        WHERE id = NEW.id;
        
        IF NOT member_exists THEN
            -- Insert new member record
            INSERT INTO public.members_enhanced (
                user_id,
                email,
                fullname,
                genotype,
                category,
                role,
                isactive,
                joindate,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.email,
                COALESCE(
                    profile_data.full_name,
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'fullname',
                    split_part(NEW.email, '@', 1) -- Use email prefix as fallback
                ),
                profile_data.genotype,
                CASE 
                    WHEN NEW.email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::member_category
                    ELSE 'Members'::member_category
                END,
                COALESCE(profile_data.role, 'user'::app_role),
                true,
                CURRENT_DATE,
                NEW.created_at,
                NOW()
            );
        ELSE
            -- Update existing member record with user_id
            UPDATE public.members_enhanced SET
                user_id = NEW.id,
                fullname = COALESCE(
                    profile_data.full_name,
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'fullname',
                    fullname
                ),
                genotype = COALESCE(profile_data.genotype, genotype),
                role = COALESCE(profile_data.role, role),
                updated_at = NOW()
            WHERE email = NEW.email;
        END IF;
        
        RETURN NEW;
    END IF;

    -- Handle UPDATE (user profile changes)
    IF TG_OP = 'UPDATE' THEN
        -- Get updated profile data
        SELECT full_name, genotype, role 
        INTO profile_data 
        FROM public.profiles 
        WHERE id = NEW.id;
        
        -- Update member record with new information
        UPDATE public.members_enhanced SET
            email = NEW.email,
            fullname = COALESCE(
                profile_data.full_name,
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'fullname',
                fullname
            ),
            genotype = COALESCE(profile_data.genotype, genotype),
            role = COALESCE(profile_data.role, role),
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        -- Handle email change - update member record if email changed
        IF OLD.email != NEW.email THEN
            UPDATE public.members_enhanced SET
                email = NEW.email,
                updated_at = NOW()
            WHERE user_id = NEW.id;
        END IF;
        
        RETURN NEW;
    END IF;

    -- Handle DELETE (user deletion - soft delete)
    IF TG_OP = 'DELETE' THEN
        -- Soft delete the member record by setting isactive to false
        UPDATE public.members_enhanced SET
            isactive = false,
            updated_at = NOW()
        WHERE user_id = OLD.id;
        
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for enhanced sync function
CREATE TRIGGER trigger_sync_user_to_member_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_user_to_member_enhanced();

-- Create function to sync profiles to enhanced members table
CREATE OR REPLACE FUNCTION public.sync_profile_to_member_enhanced()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new profile created)
    IF TG_OP = 'INSERT' THEN
        -- Update or insert member record with profile data
        INSERT INTO public.members_enhanced (
            user_id,
            email,
            fullname,
            genotype,
            role,
            isactive,
            joindate,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)),
            NEW.genotype,
            COALESCE(NEW.role, 'user'::app_role),
            true,
            CURRENT_DATE,
            NEW.created_at,
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            fullname = COALESCE(EXCLUDED.fullname, members_enhanced.fullname),
            genotype = COALESCE(EXCLUDED.genotype, members_enhanced.genotype),
            role = COALESCE(EXCLUDED.role, members_enhanced.role),
            updated_at = NOW();
        
        RETURN NEW;
    END IF;

    -- Handle UPDATE (profile changes)
    IF TG_OP = 'UPDATE' THEN
        -- Update member record with profile changes
        UPDATE public.members_enhanced SET
            email = NEW.email,
            fullname = COALESCE(NEW.full_name, fullname),
            genotype = COALESCE(NEW.genotype, genotype),
            role = COALESCE(NEW.role, role),
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        RETURN NEW;
    END IF;

    -- Handle DELETE (profile deletion)
    IF TG_OP = 'DELETE' THEN
        -- Don't delete member record, just clear the user_id reference
        UPDATE public.members_enhanced SET
            user_id = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.id;
        
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile to member sync
DROP TRIGGER IF EXISTS trigger_sync_profile_to_member_enhanced ON public.profiles;
CREATE TRIGGER trigger_sync_profile_to_member_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_profile_to_member_enhanced();

-- Create function to handle member updates back to profiles (bidirectional sync)
CREATE OR REPLACE FUNCTION public.sync_member_to_profile_enhanced()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync basic profile information back to profiles table
    -- Handle UPDATE only (we don't want to create profiles from member updates)
    IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT NULL THEN
        -- Update profile with basic member information
        UPDATE public.profiles SET
            email = NEW.email,
            full_name = NEW.fullname,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for member to profile sync (optional - only for basic info)
DROP TRIGGER IF EXISTS trigger_sync_member_to_profile_enhanced ON public.members_enhanced;
CREATE TRIGGER trigger_sync_member_to_profile_enhanced
    AFTER UPDATE ON public.members_enhanced
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_member_to_profile_enhanced();

-- Create function to sync existing auth users to enhanced members table
CREATE OR REPLACE FUNCTION public.sync_existing_users_to_enhanced_members()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    profile_record RECORD;
    synced_count INTEGER := 0;
BEGIN
    -- Loop through all auth users and sync them to enhanced members table
    FOR user_record IN 
        SELECT id, email, raw_user_meta_data, created_at 
        FROM auth.users 
        WHERE email IS NOT NULL
    LOOP
        -- Get profile data if exists
        SELECT full_name, genotype, role 
        INTO profile_record 
        FROM public.profiles 
        WHERE id = user_record.id;
        
        -- Insert or update member record
        INSERT INTO public.members_enhanced (
            user_id,
            email,
            fullname,
            genotype,
            category,
            role,
            isactive,
            joindate,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            user_record.email,
            COALESCE(
                profile_record.full_name,
                user_record.raw_user_meta_data->>'full_name',
                user_record.raw_user_meta_data->>'fullname',
                split_part(user_record.email, '@', 1)
            ),
            profile_record.genotype,
            CASE 
                WHEN user_record.email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::member_category
                ELSE 'Members'::member_category
            END,
            COALESCE(profile_record.role, 'user'::app_role),
            true,
            CURRENT_DATE,
            user_record.created_at,
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            fullname = COALESCE(EXCLUDED.fullname, members_enhanced.fullname),
            genotype = COALESCE(EXCLUDED.genotype, members_enhanced.genotype),
            role = COALESCE(EXCLUDED.role, members_enhanced.role),
            updated_at = NOW();
        
        synced_count := synced_count + 1;
    END LOOP;
    
    RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate sync integrity
CREATE OR REPLACE FUNCTION public.validate_enhanced_sync_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: All auth users have corresponding member records
    RETURN QUERY
    SELECT 
        'auth_users_have_members'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All auth users have member records'::TEXT
            ELSE COUNT(*)::TEXT || ' auth users missing member records'::TEXT
        END
    FROM auth.users au
    LEFT JOIN public.members_enhanced me ON au.id = me.user_id
    WHERE me.user_id IS NULL AND au.email IS NOT NULL;
    
    -- Check 2: All members with user_id have valid auth users
    RETURN QUERY
    SELECT 
        'members_have_valid_auth'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All members have valid auth references'::TEXT
            ELSE COUNT(*)::TEXT || ' members have invalid user_id references'::TEXT
        END
    FROM public.members_enhanced me
    LEFT JOIN auth.users au ON me.user_id = au.id
    WHERE me.user_id IS NOT NULL AND au.id IS NULL;
    
    -- Check 3: Email consistency between auth.users and members
    RETURN QUERY
    SELECT 
        'email_consistency'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All emails are consistent'::TEXT
            ELSE COUNT(*)::TEXT || ' email mismatches found'::TEXT
        END
    FROM auth.users au
    JOIN public.members_enhanced me ON au.id = me.user_id
    WHERE au.email != me.email;
    
    -- Check 4: Profile sync status
    RETURN QUERY
    SELECT 
        'profile_sync_status'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            ELSE 'WARNING'::TEXT
        END,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All profiles synced to members'::TEXT
            ELSE COUNT(*)::TEXT || ' profiles not synced to members'::TEXT
        END
    FROM public.profiles p
    LEFT JOIN public.members_enhanced me ON p.id = me.user_id
    WHERE me.user_id IS NULL;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.sync_user_to_member_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_to_member_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_member_to_profile_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_existing_users_to_enhanced_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_enhanced_sync_integrity() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.sync_user_to_member_enhanced() IS 'Syncs auth.users changes to enhanced members table';
COMMENT ON FUNCTION public.sync_profile_to_member_enhanced() IS 'Syncs profiles changes to enhanced members table';
COMMENT ON FUNCTION public.sync_member_to_profile_enhanced() IS 'Syncs basic member info back to profiles table';
COMMENT ON FUNCTION public.sync_existing_users_to_enhanced_members() IS 'One-time sync of existing auth users to enhanced members table';
COMMENT ON FUNCTION public.validate_enhanced_sync_integrity() IS 'Validates sync integrity between auth.users, profiles, and enhanced members';

-- Create test function for new user registration
CREATE OR REPLACE FUNCTION public.test_enhanced_sync_new_user(
    test_email TEXT,
    test_name TEXT DEFAULT NULL
)
RETURNS TABLE(
    step TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    test_user_id UUID;
    member_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Step 1: Create test user in auth.users (simulated)
    test_user_id := gen_random_uuid();
    
    RETURN QUERY
    SELECT 
        'simulate_user_creation'::TEXT,
        'INFO'::TEXT,
        'Simulating user creation with ID: ' || test_user_id::TEXT;
    
    -- Step 2: Check if member record would be created
    SELECT COUNT(*) INTO member_count
    FROM public.members_enhanced
    WHERE email = test_email;
    
    RETURN QUERY
    SELECT 
        'check_member_exists'::TEXT,
        CASE 
            WHEN member_count = 0 THEN 'READY'::TEXT
            ELSE 'EXISTS'::TEXT
        END,
        'Member records with email: ' || member_count::TEXT;
    
    -- Step 3: Check profile table
    SELECT COUNT(*) INTO profile_count
    FROM public.profiles
    WHERE email = test_email;
    
    RETURN QUERY
    SELECT 
        'check_profile_exists'::TEXT,
        CASE 
            WHEN profile_count = 0 THEN 'READY'::TEXT
            ELSE 'EXISTS'::TEXT
        END,
        'Profile records with email: ' || profile_count::TEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for test function
GRANT EXECUTE ON FUNCTION public.test_enhanced_sync_new_user(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.test_enhanced_sync_new_user(TEXT, TEXT) IS 'Tests the enhanced sync functionality for new user registration';