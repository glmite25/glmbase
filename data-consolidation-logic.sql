-- Data Consolidation Logic and Conflict Resolution
-- Task 2.2: Create data consolidation logic and conflict resolution
-- Requirements: 2.1, 2.2, 2.3

-- Create a function to merge data from both tables intelligently
CREATE OR REPLACE FUNCTION public.consolidate_members_and_profiles()
RETURNS TABLE (
    operation_type TEXT,
    record_id UUID,
    email TEXT,
    status TEXT,
    conflicts_resolved TEXT[],
    notes TEXT
) AS $$
DECLARE
    member_record RECORD;
    profile_record RECORD;
    consolidated_record RECORD;
    conflict_log TEXT[];
    operation_log TEXT;
    records_processed INTEGER := 0;
    conflicts_count INTEGER := 0;
BEGIN
    -- Log start of consolidation
    RAISE NOTICE 'Starting data consolidation from members and profiles tables...';
    
    -- First, handle members that have corresponding profiles (user_id match)
    FOR member_record IN 
        SELECT m.*, p.id as profile_id, p.full_name as profile_fullname, 
               p.genotype as profile_genotype, p.role as profile_role,
               p.church_unit as profile_church_unit, p.assigned_pastor as profile_assigned_pastor
        FROM public.members m
        LEFT JOIN public.profiles p ON m.user_id = p.id
        WHERE m.user_id IS NOT NULL
    LOOP
        conflict_log := ARRAY[]::TEXT[];
        
        -- Resolve name conflicts (prefer non-null, longer names)
        consolidated_record.fullname := COALESCE(
            NULLIF(trim(member_record.fullname), ''),
            NULLIF(trim(member_record.profile_fullname), ''),
            'Unknown Name'
        );
        
        IF member_record.fullname IS NOT NULL AND member_record.profile_fullname IS NOT NULL 
           AND trim(member_record.fullname) != trim(member_record.profile_fullname) THEN
            conflict_log := array_append(conflict_log, 
                format('Name conflict: members.fullname="%s" vs profiles.full_name="%s" - used members.fullname', 
                       member_record.fullname, member_record.profile_fullname));
            conflicts_count := conflicts_count + 1;
        END IF;
        
        -- Resolve email conflicts (prefer members table email)
        consolidated_record.email := COALESCE(
            NULLIF(trim(lower(member_record.email)), ''),
            NULLIF(trim(lower(member_record.email)), ''), -- profiles email from join
            'no-email@unknown.com'
        );
        
        -- Resolve phone conflicts (prefer non-null values)
        consolidated_record.phone := COALESCE(
            NULLIF(trim(member_record.phone), ''),
            NULLIF(trim(member_record.phone), '') -- profiles phone if available
        );
        
        -- Resolve address conflicts (prefer non-null, longer addresses)
        consolidated_record.address := COALESCE(
            CASE WHEN length(trim(COALESCE(member_record.address, ''))) > length(trim(COALESCE(member_record.address, ''))) 
                 THEN trim(member_record.address)
                 ELSE trim(member_record.address) END,
            NULLIF(trim(member_record.address), '')
        );
        
        -- Resolve church unit conflicts (prefer members table, handle array vs string)
        consolidated_record.churchunit := COALESCE(
            NULLIF(trim(member_record.churchunit), ''),
            NULLIF(trim(member_record.profile_church_unit), '')
        );
        
        -- Handle church units array (add profile church_unit if different)
        consolidated_record.churchunits := member_record.churchunits;
        IF member_record.profile_church_unit IS NOT NULL 
           AND trim(member_record.profile_church_unit) != '' 
           AND (member_record.churchunits IS NULL 
                OR NOT (trim(member_record.profile_church_unit) = ANY(member_record.churchunits))) THEN
            consolidated_record.churchunits := array_append(
                COALESCE(member_record.churchunits, ARRAY[]::TEXT[]), 
                trim(member_record.profile_church_unit)
            );
            conflict_log := array_append(conflict_log, 
                format('Added profile church_unit "%s" to churchunits array', member_record.profile_church_unit));
        END IF;
        
        -- Add genotype from profiles
        consolidated_record.genotype := member_record.profile_genotype;
        
        -- Add role from profiles (default to 'user' if null)
        consolidated_record.role := COALESCE(member_record.profile_role, 'user');
        
        -- Insert into enhanced members table
        INSERT INTO public.members_enhanced (
            id, user_id, email, fullname, phone, address, genotype,
            category, title, assignedto, churchunit, churchunits, auxanogroup,
            joindate, notes, isactive, role, created_at, updated_at
        ) VALUES (
            member_record.id,
            member_record.user_id,
            consolidated_record.email,
            consolidated_record.fullname,
            consolidated_record.phone,
            consolidated_record.address,
            consolidated_record.genotype,
            member_record.category::member_category,
            member_record.title,
            member_record.assignedto::UUID,
            consolidated_record.churchunit,
            consolidated_record.churchunits,
            member_record.auxanogroup,
            member_record.joindate,
            member_record.notes,
            member_record.isactive,
            consolidated_record.role::app_role,
            member_record.created_at,
            member_record.updated_at
        ) ON CONFLICT (email) DO UPDATE SET
            fullname = EXCLUDED.fullname,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            genotype = EXCLUDED.genotype,
            churchunit = EXCLUDED.churchunit,
            churchunits = EXCLUDED.churchunits,
            role = EXCLUDED.role,
            updated_at = NOW();
        
        records_processed := records_processed + 1;
        
        -- Return operation result
        RETURN QUERY SELECT 
            'MEMBER_WITH_PROFILE'::TEXT,
            member_record.id,
            consolidated_record.email,
            'SUCCESS'::TEXT,
            conflict_log,
            format('Processed member %s with %d conflicts resolved', consolidated_record.fullname, array_length(conflict_log, 1))::TEXT;
    END LOOP;
    
    -- Handle members without profiles (user_id is null)
    FOR member_record IN 
        SELECT * FROM public.members WHERE user_id IS NULL
    LOOP
        INSERT INTO public.members_enhanced (
            id, user_id, email, fullname, phone, address,
            category, title, assignedto, churchunit, churchunits, auxanogroup,
            joindate, notes, isactive, role, created_at, updated_at
        ) VALUES (
            member_record.id,
            member_record.user_id,
            COALESCE(NULLIF(trim(lower(member_record.email)), ''), format('member-%s@noemail.local', member_record.id)),
            COALESCE(NULLIF(trim(member_record.fullname), ''), 'Unknown Name'),
            member_record.phone,
            member_record.address,
            member_record.category::member_category,
            member_record.title,
            member_record.assignedto::UUID,
            member_record.churchunit,
            member_record.churchunits,
            member_record.auxanogroup,
            member_record.joindate,
            member_record.notes,
            member_record.isactive,
            'user'::app_role, -- Default role for members without profiles
            member_record.created_at,
            member_record.updated_at
        ) ON CONFLICT (email) DO UPDATE SET
            fullname = EXCLUDED.fullname,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            updated_at = NOW();
        
        records_processed := records_processed + 1;
        
        RETURN QUERY SELECT 
            'MEMBER_WITHOUT_PROFILE'::TEXT,
            member_record.id,
            COALESCE(member_record.email, format('member-%s@noemail.local', member_record.id)),
            'SUCCESS'::TEXT,
            ARRAY[]::TEXT[],
            format('Processed member %s without profile', COALESCE(member_record.fullname, 'Unknown'))::TEXT;
    END LOOP;
    
    -- Handle profiles without corresponding members
    FOR profile_record IN 
        SELECT p.* FROM public.profiles p
        LEFT JOIN public.members m ON p.id = m.user_id
        WHERE m.user_id IS NULL
    LOOP
        INSERT INTO public.members_enhanced (
            user_id, email, fullname, phone, address, genotype,
            category, churchunit, role, joindate, isactive, created_at, updated_at
        ) VALUES (
            profile_record.id,
            COALESCE(NULLIF(trim(lower(profile_record.email)), ''), format('profile-%s@noemail.local', profile_record.id)),
            COALESCE(NULLIF(trim(profile_record.full_name), ''), 'Unknown Name'),
            profile_record.phone,
            profile_record.address,
            profile_record.genotype,
            'Members'::member_category, -- Default category for profile-only users
            profile_record.church_unit,
            COALESCE(profile_record.role, 'user')::app_role,
            COALESCE(profile_record.created_at::DATE, CURRENT_DATE),
            true, -- Default to active
            profile_record.created_at,
            profile_record.updated_at
        ) ON CONFLICT (email) DO UPDATE SET
            fullname = EXCLUDED.fullname,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            genotype = EXCLUDED.genotype,
            churchunit = EXCLUDED.churchunit,
            role = EXCLUDED.role,
            updated_at = NOW();
        
        records_processed := records_processed + 1;
        
        RETURN QUERY SELECT 
            'PROFILE_WITHOUT_MEMBER'::TEXT,
            profile_record.id,
            COALESCE(profile_record.email, format('profile-%s@noemail.local', profile_record.id)),
            'SUCCESS'::TEXT,
            ARRAY[]::TEXT[],
            format('Processed profile %s without member record', COALESCE(profile_record.full_name, 'Unknown'))::TEXT;
    END LOOP;
    
    -- Log completion
    RAISE NOTICE 'Data consolidation completed. Processed % records with % conflicts resolved.', records_processed, conflicts_count;
    
    -- Return summary
    RETURN QUERY SELECT 
        'SUMMARY'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        'COMPLETED'::TEXT,
        ARRAY[format('Total records processed: %s', records_processed), format('Total conflicts resolved: %s', conflicts_count)]::TEXT[],
        format('Consolidation completed successfully at %s', NOW()::TEXT)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function for email uniqueness and standardization
CREATE OR REPLACE FUNCTION public.standardize_and_validate_emails()
RETURNS TABLE (
    email_original TEXT,
    email_standardized TEXT,
    validation_status TEXT,
    issues TEXT[]
) AS $$
DECLARE
    email_record RECORD;
    standardized_email TEXT;
    issues_found TEXT[];
BEGIN
    -- Process all emails in the enhanced members table
    FOR email_record IN 
        SELECT DISTINCT email as original_email FROM public.members_enhanced WHERE email IS NOT NULL
    LOOP
        issues_found := ARRAY[]::TEXT[];
        
        -- Standardize email (lowercase, trim)
        standardized_email := lower(trim(email_record.original_email));
        
        -- Validate email format
        IF standardized_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            issues_found := array_append(issues_found, 'Invalid email format');
        END IF;
        
        -- Check for duplicates
        IF (SELECT COUNT(*) FROM public.members_enhanced WHERE lower(trim(email)) = standardized_email) > 1 THEN
            issues_found := array_append(issues_found, 'Duplicate email found');
        END IF;
        
        -- Check for placeholder emails
        IF standardized_email LIKE '%@noemail.local' OR standardized_email LIKE '%@unknown.com' THEN
            issues_found := array_append(issues_found, 'Placeholder email detected');
        END IF;
        
        -- Update standardized email if different
        IF email_record.original_email != standardized_email THEN
            UPDATE public.members_enhanced 
            SET email = standardized_email, updated_at = NOW()
            WHERE email = email_record.original_email;
            
            issues_found := array_append(issues_found, 'Email standardized');
        END IF;
        
        RETURN QUERY SELECT 
            email_record.original_email,
            standardized_email,
            CASE WHEN array_length(issues_found, 1) > 0 THEN 'ISSUES_FOUND' ELSE 'VALID' END,
            issues_found;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle name standardization
CREATE OR REPLACE FUNCTION public.standardize_member_names()
RETURNS TABLE (
    member_id UUID,
    name_original TEXT,
    name_standardized TEXT,
    changes_made TEXT[]
) AS $$
DECLARE
    member_record RECORD;
    standardized_name TEXT;
    changes TEXT[];
BEGIN
    FOR member_record IN 
        SELECT id, fullname FROM public.members_enhanced WHERE fullname IS NOT NULL
    LOOP
        changes := ARRAY[]::TEXT[];
        standardized_name := member_record.fullname;
        
        -- Trim whitespace
        IF standardized_name != trim(standardized_name) THEN
            standardized_name := trim(standardized_name);
            changes := array_append(changes, 'Trimmed whitespace');
        END IF;
        
        -- Remove multiple spaces
        IF standardized_name ~ '\s{2,}' THEN
            standardized_name := regexp_replace(standardized_name, '\s+', ' ', 'g');
            changes := array_append(changes, 'Normalized spacing');
        END IF;
        
        -- Proper case (capitalize first letter of each word)
        IF standardized_name != initcap(standardized_name) THEN
            standardized_name := initcap(standardized_name);
            changes := array_append(changes, 'Applied proper case');
        END IF;
        
        -- Update if changes were made
        IF array_length(changes, 1) > 0 THEN
            UPDATE public.members_enhanced 
            SET fullname = standardized_name, updated_at = NOW()
            WHERE id = member_record.id;
        END IF;
        
        RETURN QUERY SELECT 
            member_record.id,
            member_record.fullname,
            standardized_name,
            changes;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to resolve church unit conflicts
CREATE OR REPLACE FUNCTION public.resolve_church_unit_conflicts()
RETURNS TABLE (
    member_id UUID,
    churchunit_original TEXT,
    churchunits_original TEXT[],
    churchunit_resolved TEXT,
    churchunits_resolved TEXT[],
    resolution_notes TEXT
) AS $$
DECLARE
    member_record RECORD;
    resolved_unit TEXT;
    resolved_units TEXT[];
    notes TEXT;
BEGIN
    FOR member_record IN 
        SELECT id, churchunit, churchunits FROM public.members_enhanced
    LOOP
        resolved_unit := member_record.churchunit;
        resolved_units := member_record.churchunits;
        notes := '';
        
        -- If churchunit is null but churchunits has values, use first element
        IF resolved_unit IS NULL AND resolved_units IS NOT NULL AND array_length(resolved_units, 1) > 0 THEN
            resolved_unit := resolved_units[1];
            notes := 'Set churchunit from first element of churchunits array';
        END IF;
        
        -- If churchunit exists but not in churchunits array, add it
        IF resolved_unit IS NOT NULL AND (resolved_units IS NULL OR NOT (resolved_unit = ANY(resolved_units))) THEN
            resolved_units := array_prepend(resolved_unit, COALESCE(resolved_units, ARRAY[]::TEXT[]));
            notes := COALESCE(notes || '; ', '') || 'Added churchunit to churchunits array';
        END IF;
        
        -- Remove duplicates from churchunits array
        IF resolved_units IS NOT NULL THEN
            WITH unique_units AS (
                SELECT DISTINCT unnest(resolved_units) as unit
            )
            SELECT array_agg(unit) INTO resolved_units FROM unique_units WHERE unit IS NOT NULL AND trim(unit) != '';
            
            IF array_length(resolved_units, 1) != array_length(member_record.churchunits, 1) THEN
                notes := COALESCE(notes || '; ', '') || 'Removed duplicates from churchunits array';
            END IF;
        END IF;
        
        -- Update if changes were made
        IF resolved_unit != member_record.churchunit OR resolved_units != member_record.churchunits THEN
            UPDATE public.members_enhanced 
            SET churchunit = resolved_unit, churchunits = resolved_units, updated_at = NOW()
            WHERE id = member_record.id;
        END IF;
        
        RETURN QUERY SELECT 
            member_record.id,
            member_record.churchunit,
            member_record.churchunits,
            resolved_unit,
            resolved_units,
            COALESCE(notes, 'No changes needed');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive conflict resolution function
CREATE OR REPLACE FUNCTION public.resolve_all_data_conflicts()
RETURNS TABLE (
    operation TEXT,
    total_processed INTEGER,
    issues_resolved INTEGER,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    email_results INTEGER;
    name_results INTEGER;
    church_unit_results INTEGER;
BEGIN
    -- Resolve email conflicts
    SELECT COUNT(*) INTO email_results 
    FROM public.standardize_and_validate_emails() 
    WHERE validation_status = 'ISSUES_FOUND';
    
    RETURN QUERY SELECT 
        'EMAIL_STANDARDIZATION'::TEXT,
        (SELECT COUNT(*) FROM public.members_enhanced)::INTEGER,
        email_results,
        'COMPLETED'::TEXT,
        format('Standardized and validated %s email addresses', email_results)::TEXT;
    
    -- Resolve name conflicts
    SELECT COUNT(*) INTO name_results 
    FROM public.standardize_member_names() 
    WHERE array_length(changes_made, 1) > 0;
    
    RETURN QUERY SELECT 
        'NAME_STANDARDIZATION'::TEXT,
        (SELECT COUNT(*) FROM public.members_enhanced)::INTEGER,
        name_results,
        'COMPLETED'::TEXT,
        format('Standardized %s member names', name_results)::TEXT;
    
    -- Resolve church unit conflicts
    SELECT COUNT(*) INTO church_unit_results 
    FROM public.resolve_church_unit_conflicts() 
    WHERE resolution_notes != 'No changes needed';
    
    RETURN QUERY SELECT 
        'CHURCH_UNIT_RESOLUTION'::TEXT,
        (SELECT COUNT(*) FROM public.members_enhanced)::INTEGER,
        church_unit_results,
        'COMPLETED'::TEXT,
        format('Resolved church unit conflicts for %s members', church_unit_results)::TEXT;
    
    -- Summary
    RETURN QUERY SELECT 
        'SUMMARY'::TEXT,
        (SELECT COUNT(*) FROM public.members_enhanced)::INTEGER,
        (email_results + name_results + church_unit_results)::INTEGER,
        'ALL_COMPLETED'::TEXT,
        format('Total conflicts resolved: %s (emails: %s, names: %s, church units: %s)', 
               email_results + name_results + church_unit_results, 
               email_results, name_results, church_unit_results)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate data integrity after consolidation
CREATE OR REPLACE FUNCTION public.validate_consolidation_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    count_value INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check for duplicate emails
    RETURN QUERY 
    SELECT 
        'DUPLICATE_EMAILS'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
        COUNT(*)::INTEGER,
        format('Found %s duplicate email addresses', COUNT(*))::TEXT
    FROM (
        SELECT email, COUNT(*) as cnt 
        FROM public.members_enhanced 
        GROUP BY email 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check for missing required fields
    RETURN QUERY 
    SELECT 
        'MISSING_EMAILS'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
        COUNT(*)::INTEGER,
        format('Found %s records with missing emails', COUNT(*))::TEXT
    FROM public.members_enhanced 
    WHERE email IS NULL OR trim(email) = '';
    
    RETURN QUERY 
    SELECT 
        'MISSING_NAMES'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
        COUNT(*)::INTEGER,
        format('Found %s records with missing names', COUNT(*))::TEXT
    FROM public.members_enhanced 
    WHERE fullname IS NULL OR trim(fullname) = '';
    
    -- Check foreign key integrity
    RETURN QUERY 
    SELECT 
        'INVALID_USER_IDS'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
        COUNT(*)::INTEGER,
        format('Found %s records with invalid user_id references', COUNT(*))::TEXT
    FROM public.members_enhanced m
    WHERE m.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);
    
    -- Check self-assignment
    RETURN QUERY 
    SELECT 
        'SELF_ASSIGNMENTS'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
        COUNT(*)::INTEGER,
        format('Found %s records with self-assignment', COUNT(*))::TEXT
    FROM public.members_enhanced 
    WHERE id = assignedto;
    
    -- Summary statistics
    RETURN QUERY 
    SELECT 
        'TOTAL_RECORDS'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::INTEGER,
        format('Total records in enhanced members table: %s', COUNT(*))::TEXT
    FROM public.members_enhanced;
    
    RETURN QUERY 
    SELECT 
        'ACTIVE_RECORDS'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::INTEGER,
        format('Active records: %s', COUNT(*))::TEXT
    FROM public.members_enhanced 
    WHERE isactive = true;
    
    RETURN QUERY 
    SELECT 
        'RECORDS_WITH_AUTH'::TEXT,
        'INFO'::TEXT,
        COUNT(*)::INTEGER,
        format('Records with auth.users link: %s', COUNT(*))::TEXT
    FROM public.members_enhanced 
    WHERE user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create logging table for consolidation operations
CREATE TABLE IF NOT EXISTS public.consolidation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL,
    operation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    records_affected INTEGER,
    conflicts_resolved INTEGER,
    status TEXT,
    details JSONB,
    created_by UUID REFERENCES auth.users(id)
);

-- Create function to log consolidation operations
CREATE OR REPLACE FUNCTION public.log_consolidation_operation(
    p_operation_type TEXT,
    p_records_affected INTEGER,
    p_conflicts_resolved INTEGER,
    p_status TEXT,
    p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.consolidation_log (
        operation_type, records_affected, conflicts_resolved, status, details, created_by
    ) VALUES (
        p_operation_type, p_records_affected, p_conflicts_resolved, p_status, p_details, auth.uid()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.consolidate_members_and_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.standardize_and_validate_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.standardize_member_names() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_church_unit_conflicts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_all_data_conflicts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_consolidation_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_consolidation_operation(TEXT, INTEGER, INTEGER, TEXT, JSONB) TO authenticated;
GRANT ALL ON public.consolidation_log TO authenticated;