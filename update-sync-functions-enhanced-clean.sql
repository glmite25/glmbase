-- Task 4.1: Update user synchronization triggers for consolidated structure (Clean Version)
-- Requirements: 3.1, 3.2, 3.3
-- This script updates sync functions to work with the enhanced members table

-- Log the start of sync functions update
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'SYNC_FUNCTIONS_UPDATE_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting sync functions update for enhanced tables',
        'timestamp', NOW()
    )
);

-- ========================================
-- CLEANUP EXISTING TRIGGERS AND FUNCTIONS
-- ========================================

-- Drop all existing sync triggers
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_safe ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_final ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_enhanced ON auth.users;
DROP TRIGGER IF EXISTS trigger_sync_profile_to_member_enhanced ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_member_to_profile_enhanced ON public.members_enhanced;

-- Drop all existing sync functions
DROP FUNCTION IF EXISTS public.sync_user_to_member() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member_safe() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member_final() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_to_member_enhanced() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_to_member_enhanced() CASCADE;
DROP FUNCTION IF EXISTS public.sync_member_to_profile_enhanced() CASCADE;

-- ========================================
-- CREATE ENHANCED SYNC FUNCTIONS
-- ========================================

-- Function 1: Sync auth.users to members_enhanced
CREATE OR REPLACE FUNCTION public.sync_user_to_member_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    member_exists BOOLEAN := FALSE;
BEGIN
    -- Handle INSERT (new user registration)
    IF TG_OP = 'INSERT' THEN
        -- Check if member already exists with this email
        SELECT EXISTS(SELECT 1 FROM public.members_enhanced WHERE email = NEW.email) INTO member_exists;
        
        IF NOT member_exists THEN
            -- Create new member record from auth user
            INSERT INTO public.members_enhanced (
                user_id, email, fullname, category, isactive, role, created_at, updated_at
            ) VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
                'Members',
                true,
                'user',
                NOW(),
                NOW()
            );
        ELSE
            -- Update existing member with user_id
            UPDATE public.members_enhanced 
            SET user_id = NEW.id, updated_at = NOW()
            WHERE email = NEW.email AND user_id IS NULL;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (user profile changes)
    IF TG_OP = 'UPDATE' THEN
        -- Update member record if email changed
        IF OLD.email != NEW.email THEN
            UPDATE public.members_enhanced 
            SET email = NEW.email, updated_at = NOW()
            WHERE user_id = NEW.id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (user account deletion)
    IF TG_OP = 'DELETE' THEN
        -- Set user_id to NULL but keep member record
        UPDATE public.members_enhanced 
        SET user_id = NULL, updated_at = NOW()
        WHERE user_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Sync profiles to members_enhanced
CREATE OR REPLACE FUNCTION public.sync_profile_to_member_enhanced()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new profile created)
    IF TG_OP = 'INSERT' THEN
        -- Update existing member record or create new one
        INSERT INTO public.members_enhanced (
            user_id, email, fullname, phone, address, role, created_at, updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.full_name, 'Profile User'),
            NEW.phone,
            NEW.address,
            COALESCE(NEW.role, 'user'),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            fullname = COALESCE(EXCLUDED.fullname, members_enhanced.fullname),
            phone = COALESCE(EXCLUDED.phone, members_enhanced.phone),
            address = COALESCE(EXCLUDED.address, members_enhanced.address),
            role = EXCLUDED.role,
            updated_at = NOW();
            
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (profile changes)
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.members_enhanced SET
            email = NEW.email,
            fullname = COALESCE(NEW.full_name, fullname),
            phone = COALESCE(NEW.phone, phone),
            address = COALESCE(NEW.address, address),
            role = COALESCE(NEW.role, role),
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (profile deletion)
    IF TG_OP = 'DELETE' THEN
        -- Keep member record but clear profile-specific data
        UPDATE public.members_enhanced SET
            phone = NULL,
            address = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- CREATE TRIGGERS
-- ========================================

-- Trigger 1: Sync auth.users to members_enhanced
CREATE TRIGGER trigger_sync_user_to_member_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_user_to_member_enhanced();

-- Trigger 2: Sync profiles to members_enhanced
CREATE TRIGGER trigger_sync_profile_to_member_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_profile_to_member_enhanced();

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant execute permissions on sync functions
GRANT EXECUTE ON FUNCTION public.sync_user_to_member_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_to_member_enhanced() TO authenticated;

-- Log the completion of sync functions update
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'SYNC_FUNCTIONS_UPDATE_COMPLETE',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Sync functions updated successfully for enhanced tables',
        'functions_created', 2,
        'triggers_created', 2,
        'timestamp', NOW()
    )
);

-- Final success message
SELECT 'Sync functions updated successfully!' as completion_status,
       'Enhanced sync functions and triggers are now active' as result;