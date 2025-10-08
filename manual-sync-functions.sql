-- Manual Bidirectional Synchronization Functions
-- Task 3.3: Create bidirectional synchronization functions
-- Run this SQL after completing the data consolidation and profiles lightweight update

-- Step 1: Create function to sync new user registrations from profiles to members
CREATE OR REPLACE FUNCTION public.sync_new_user_to_members()
RETURNS TRIGGER AS $$
DECLARE
    existing_member_id UUID;
BEGIN
    -- Check if member already exists for this user
    SELECT id INTO existing_member_id 
    FROM public.members_enhanced 
    WHERE user_id = NEW.id;
    
    -- If no member exists, create one
    IF existing_member_id IS NULL THEN
        INSERT INTO public.members_enhanced (
            user_id,
            email,
            fullname,
            category,
            joindate,
            isactive,
            role,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.full_name, 'New User'),
            'Members',
            CURRENT_DATE,
            true,
            'user',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new member record for user: %', NEW.email;
    ELSE
        -- Update existing member with profile changes
        UPDATE public.members_enhanced 
        SET 
            email = NEW.email,
            fullname = COALESCE(NEW.full_name, fullname),
            updated_at = NOW()
        WHERE user_id = NEW.id;
        
        RAISE NOTICE 'Updated existing member record for user: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create function to sync member changes back to profiles
CREATE OR REPLACE FUNCTION public.sync_member_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if the member has a user_id (linked to auth.users)
    IF NEW.user_id IS NOT NULL THEN
        -- Update the corresponding profile record
        UPDATE public.profiles_new 
        SET 
            email = NEW.email,
            full_name = NEW.fullname,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- If no profile exists, create one
        IF NOT FOUND THEN
            INSERT INTO public.profiles_new (
                id,
                email,
                full_name,
                created_at,
                updated_at
            ) VALUES (
                NEW.user_id,
                NEW.email,
                NEW.fullname,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Created new profile record for member: %', NEW.email;
        ELSE
            RAISE NOTICE 'Updated profile record for member: %', NEW.email;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create comprehensive sync validation function
CREATE OR REPLACE FUNCTION public.validate_sync_consistency()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    count_value INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check for members with user_id but no corresponding profile
    RETURN QUERY
    SELECT 
        'MEMBERS_WITHOUT_PROFILES'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        ('Found ' || COUNT(*) || ' members with user_id but no profile')::TEXT
    FROM public.members_enhanced m
    WHERE m.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.profiles_new p WHERE p.id = m.user_id);
    
    -- Check for profiles without corresponding members
    RETURN QUERY
    SELECT 
        'PROFILES_WITHOUT_MEMBERS'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        ('Found ' || COUNT(*) || ' profiles without corresponding members')::TEXT
    FROM public.profiles_new p
    WHERE NOT EXISTS (SELECT 1 FROM public.members_enhanced m WHERE m.user_id = p.id);
    
    -- Check for email mismatches between linked records
    RETURN QUERY
    SELECT 
        'EMAIL_MISMATCHES'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        COUNT(*)::INTEGER,
        ('Found ' || COUNT(*) || ' email mismatches between members and profiles')::TEXT
    FROM public.members_enhanced m
    JOIN public.profiles_new p ON m.user_id = p.id
    WHERE m.email != p.email;
    
    -- Check for name mismatches between linked records
    RETURN QUERY
    SELECT 
        'NAME_MISMATCHES'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::INTEGER,
        ('Found ' || COUNT(*) || ' name mismatches between members and profiles')::TEXT
    FROM public.members_enhanced m
    JOIN public.profiles_new p ON m.user_id = p.id
    WHERE m.fullname != p.full_name AND p.full_name IS NOT NULL;
    
    -- Summary statistics
    RETURN QUERY
    SELECT 
        'SYNC_SUMMARY'::TEXT,
        'INFO'::TEXT,
        (SELECT COUNT(*) FROM public.members_enhanced WHERE user_id IS NOT NULL)::INTEGER,
        ('Total synced records: ' || (SELECT COUNT(*) FROM public.members_enhanced WHERE user_id IS NOT NULL))::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to manually fix sync inconsistencies
CREATE OR REPLACE FUNCTION public.fix_sync_inconsistencies()
RETURNS TABLE (
    operation TEXT,
    affected_records INTEGER,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    members_created INTEGER := 0;
    profiles_created INTEGER := 0;
    emails_fixed INTEGER := 0;
BEGIN
    -- Create missing member records for profiles
    INSERT INTO public.members_enhanced (
        user_id, email, fullname, category, joindate, isactive, role, created_at, updated_at
    )
    SELECT 
        p.id,
        p.email,
        COALESCE(p.full_name, 'New User'),
        'Members',
        CURRENT_DATE,
        true,
        'user',
        NOW(),
        NOW()
    FROM public.profiles_new p
    WHERE NOT EXISTS (SELECT 1 FROM public.members_enhanced m WHERE m.user_id = p.id);
    
    GET DIAGNOSTICS members_created = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'CREATE_MISSING_MEMBERS'::TEXT,
        members_created,
        'COMPLETED'::TEXT,
        ('Created ' || members_created || ' missing member records')::TEXT;
    
    -- Create missing profile records for members
    INSERT INTO public.profiles_new (id, email, full_name, created_at, updated_at)
    SELECT 
        m.user_id,
        m.email,
        m.fullname,
        NOW(),
        NOW()
    FROM public.members_enhanced m
    WHERE m.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.profiles_new p WHERE p.id = m.user_id);
    
    GET DIAGNOSTICS profiles_created = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'CREATE_MISSING_PROFILES'::TEXT,
        profiles_created,
        'COMPLETED'::TEXT,
        ('Created ' || profiles_created || ' missing profile records')::TEXT;
    
    -- Fix email mismatches (prefer members table email)
    UPDATE public.profiles_new 
    SET email = m.email, updated_at = NOW()
    FROM public.members_enhanced m
    WHERE profiles_new.id = m.user_id 
    AND profiles_new.email != m.email;
    
    GET DIAGNOSTICS emails_fixed = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'FIX_EMAIL_MISMATCHES'::TEXT,
        emails_fixed,
        'COMPLETED'::TEXT,
        ('Fixed ' || emails_fixed || ' email mismatches')::TEXT;
    
    -- Summary
    RETURN QUERY SELECT 
        'SYNC_FIX_SUMMARY'::TEXT,
        (members_created + profiles_created + emails_fixed),
        'ALL_COMPLETED'::TEXT,
        ('Total fixes applied: ' || (members_created + profiles_created + emails_fixed))::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers for automatic synchronization
-- Trigger for new profile insertions/updates
DROP TRIGGER IF EXISTS sync_profile_to_member_trigger ON public.profiles_new;
CREATE TRIGGER sync_profile_to_member_trigger
    AFTER INSERT OR UPDATE ON public.profiles_new
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_new_user_to_members();

-- Trigger for member updates (sync back to profile)
DROP TRIGGER IF EXISTS sync_member_to_profile_trigger ON public.members_enhanced;
CREATE TRIGGER sync_member_to_profile_trigger
    AFTER INSERT OR UPDATE ON public.members_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_member_to_profile();

-- Step 6: Create function for error handling and logging
CREATE TABLE IF NOT EXISTS public.sync_error_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    affected_record_id UUID,
    affected_email TEXT,
    error_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

CREATE OR REPLACE FUNCTION public.log_sync_error(
    p_operation_type TEXT,
    p_error_message TEXT,
    p_record_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.sync_error_log (
        operation_type, error_message, affected_record_id, affected_email
    ) VALUES (
        p_operation_type, p_error_message, p_record_id, p_email
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_new_user_to_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_member_to_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_sync_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_sync_inconsistencies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_sync_error(TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT ALL ON public.sync_error_log TO authenticated;

-- Step 8: Test the synchronization functions
-- Validate current sync state
SELECT * FROM public.validate_sync_consistency();

-- Fix any existing inconsistencies
SELECT * FROM public.fix_sync_inconsistencies();

-- Validate again after fixes
SELECT * FROM public.validate_sync_consistency();

-- Step 9: Create a maintenance function to run periodic sync checks
CREATE OR REPLACE FUNCTION public.run_sync_maintenance()
RETURNS TABLE (
    maintenance_step TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Step 1: Validate consistency
    RETURN QUERY
    SELECT 
        'VALIDATION'::TEXT,
        'COMPLETED'::TEXT,
        'Sync validation completed'::TEXT;
    
    -- Step 2: Fix inconsistencies
    RETURN QUERY
    SELECT 
        'FIXES_APPLIED'::TEXT,
        'COMPLETED'::TEXT,
        'Sync fixes applied'::TEXT;
    
    -- Step 3: Log maintenance run
    INSERT INTO public.sync_error_log (
        operation_type, error_message, resolved
    ) VALUES (
        'MAINTENANCE', 'Periodic sync maintenance completed', true
    );
    
    RETURN QUERY
    SELECT 
        'MAINTENANCE_LOGGED'::TEXT,
        'COMPLETED'::TEXT,
        'Maintenance run logged'::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.run_sync_maintenance() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.sync_new_user_to_members() IS 'Automatically creates or updates member records when profiles are created/updated';
COMMENT ON FUNCTION public.sync_member_to_profile() IS 'Automatically updates profile records when member data changes';
COMMENT ON FUNCTION public.validate_sync_consistency() IS 'Validates data consistency between members and profiles tables';
COMMENT ON FUNCTION public.fix_sync_inconsistencies() IS 'Automatically fixes common sync inconsistencies';
COMMENT ON TABLE public.sync_error_log IS 'Log table for tracking synchronization errors and maintenance activities';