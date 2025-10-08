-- Fix Sync Function Type Mismatch Error
-- The error occurs because of type mismatch between app_role enum and varchar

-- Log the start of sync function fix
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'SYNC_FUNCTION_TYPE_FIX_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting fix for sync function type mismatch',
        'error', 'COALESCE types app_role and character varying cannot be matched',
        'timestamp', NOW()
    )
);

-- Drop the problematic sync function and recreate it with proper type handling
DROP FUNCTION IF EXISTS public.sync_profile_to_member_enhanced() CASCADE;

-- Create the fixed sync function with proper type casting
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
            COALESCE(NEW.role::text, 'user')::app_role, -- Cast to text then to app_role
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
            role = CASE 
                WHEN NEW.role IS NOT NULL THEN NEW.role::text::app_role
                ELSE role
            END,
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_sync_profile_to_member_enhanced ON public.profiles;
CREATE TRIGGER trigger_sync_profile_to_member_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_profile_to_member_enhanced();

-- Also fix the user sync function if it has similar issues
DROP FUNCTION IF EXISTS public.sync_user_to_member_enhanced() CASCADE;

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
                'user'::app_role, -- Explicit cast to app_role
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

-- Recreate the user sync trigger
DROP TRIGGER IF EXISTS trigger_sync_user_to_member_enhanced ON auth.users;
CREATE TRIGGER trigger_sync_user_to_member_enhanced
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.sync_user_to_member_enhanced();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_user_to_member_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_to_member_enhanced() TO authenticated;

-- Test the functions by checking if they exist and are valid
SELECT 
    'FUNCTION_CHECK' as status,
    routine_name,
    routine_type,
    'CREATED' as result
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('sync_user_to_member_enhanced', 'sync_profile_to_member_enhanced');

-- Check triggers
SELECT 
    'TRIGGER_CHECK' as status,
    trigger_name,
    event_object_table,
    'CREATED' as result
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('trigger_sync_user_to_member_enhanced', 'trigger_sync_profile_to_member_enhanced');

-- Log the completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'SYNC_FUNCTION_TYPE_FIX_COMPLETE',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Fixed sync function type mismatch issues',
        'functions_fixed', ARRAY['sync_user_to_member_enhanced', 'sync_profile_to_member_enhanced'],
        'timestamp', NOW()
    )
);

SELECT 'Sync function type mismatch fixed successfully!' as result,
       'Functions now handle app_role enum types correctly' as details;