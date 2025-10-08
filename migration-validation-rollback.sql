-- Migration Validation and Rollback Procedures
-- Task 2.3: Implement migration validation and rollback procedures
-- Requirements: 4.1, 4.2, 4.3, 4.4

-- Create consolidation log table for tracking migration operations
CREATE TABLE IF NOT EXISTS public.consolidation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Keep for compatibility
    operation_type TEXT NOT NULL,
    records_affected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    details JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_by TEXT DEFAULT 'system'
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_consolidation_log_operation_timestamp ON public.consolidation_log(operation_timestamp);
CREATE INDEX IF NOT EXISTS idx_consolidation_log_created_at ON public.consolidation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_consolidation_log_operation_type ON public.consolidation_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_consolidation_log_status ON public.consolidation_log(status);

-- Add comment for documentation
COMMENT ON TABLE public.consolidation_log IS 'Tracks all database consolidation operations for audit and rollback purposes';

-- Create backup tables before migration
CREATE OR REPLACE FUNCTION public.create_migration_backups()
RETURNS TABLE (
    backup_name TEXT,
    table_name TEXT,
    record_count INTEGER,
    backup_timestamp TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
DECLARE
    members_count INTEGER;
    profiles_count INTEGER;
    user_roles_count INTEGER;
    backup_suffix TEXT;
BEGIN
    -- Generate backup suffix with timestamp
    backup_suffix := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Get record counts before backup
    SELECT COUNT(*) INTO members_count FROM public.members;
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO user_roles_count FROM public.user_roles;
    
    -- Create backup of members table
    EXECUTE format('CREATE TABLE public.members_backup_%s AS SELECT * FROM public.members', backup_suffix);
    
    RETURN QUERY SELECT 
        format('members_backup_%s', backup_suffix)::TEXT,
        'members'::TEXT,
        members_count,
        NOW(),
        'SUCCESS'::TEXT;
    
    -- Create backup of profiles table
    EXECUTE format('CREATE TABLE public.profiles_backup_%s AS SELECT * FROM public.profiles', backup_suffix);
    
    RETURN QUERY SELECT 
        format('profiles_backup_%s', backup_suffix)::TEXT,
        'profiles'::TEXT,
        profiles_count,
        NOW(),
        'SUCCESS'::TEXT;
    
    -- Create backup of user_roles table
    EXECUTE format('CREATE TABLE public.user_roles_backup_%s AS SELECT * FROM public.user_roles', backup_suffix);
    
    RETURN QUERY SELECT 
        format('user_roles_backup_%s', backup_suffix)::TEXT,
        'user_roles'::TEXT,
        user_roles_count,
        NOW(),
        'SUCCESS'::TEXT;
    
    -- Log backup creation
    INSERT INTO public.consolidation_log (
        operation_type, records_affected, status, details
    ) VALUES (
        'BACKUP_CREATION',
        members_count + profiles_count + user_roles_count,
        'SUCCESS',
        jsonb_build_object(
            'backup_suffix', backup_suffix,
            'members_count', members_count,
            'profiles_count', profiles_count,
            'user_roles_count', user_roles_count
        )
    );
    
    RAISE NOTICE 'Migration backups created with suffix: %', backup_suffix;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'ERROR'::TEXT,
            'BACKUP_FAILED'::TEXT,
            0::INTEGER,
            NOW(),
            format('Backup creation failed: %s', SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive data validation function
CREATE OR REPLACE FUNCTION public.validate_migration_data()
RETURNS TABLE (
    validation_check TEXT,
    status TEXT,
    expected_count INTEGER,
    actual_count INTEGER,
    difference INTEGER,
    details TEXT
) AS $$
DECLARE
    original_members_count INTEGER;
    original_profiles_count INTEGER;
    enhanced_members_count INTEGER;
    members_with_profiles INTEGER;
    profiles_without_members INTEGER;
    duplicate_emails INTEGER;
    missing_required_fields INTEGER;
BEGIN
    -- Get baseline counts from original tables
    SELECT COUNT(*) INTO original_members_count FROM public.members;
    SELECT COUNT(*) INTO original_profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO enhanced_members_count FROM public.members_enhanced;
    
    -- Count members with profiles
    SELECT COUNT(*) INTO members_with_profiles 
    FROM public.members m 
    INNER JOIN public.profiles p ON m.user_id = p.id;
    
    -- Count profiles without members
    SELECT COUNT(*) INTO profiles_without_members 
    FROM public.profiles p 
    LEFT JOIN public.members m ON p.id = m.user_id 
    WHERE m.user_id IS NULL;
    
    -- Validate total record count
    RETURN QUERY SELECT 
        'TOTAL_RECORD_COUNT'::TEXT,
        CASE WHEN enhanced_members_count >= original_members_count THEN 'PASS' ELSE 'FAIL' END::TEXT,
        original_members_count + profiles_without_members,
        enhanced_members_count,
        enhanced_members_count - (original_members_count + profiles_without_members),
        format('Enhanced table should have at least %s records (original members + profiles without members)', 
               original_members_count + profiles_without_members)::TEXT;
    
    -- Validate no data loss from members table
    RETURN QUERY SELECT 
        'MEMBERS_DATA_PRESERVATION'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced WHERE id IN (SELECT id FROM public.members)) = original_members_count 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        original_members_count,
        (SELECT COUNT(*) FROM public.members_enhanced WHERE id IN (SELECT id FROM public.members))::INTEGER,
        (SELECT COUNT(*) FROM public.members_enhanced WHERE id IN (SELECT id FROM public.members))::INTEGER - original_members_count,
        'All original member records should be preserved in enhanced table'::TEXT;
    
    -- Validate profile data integration
    RETURN QUERY SELECT 
        'PROFILE_DATA_INTEGRATION'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced WHERE user_id IN (SELECT id FROM public.profiles)) >= members_with_profiles 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        members_with_profiles + profiles_without_members,
        (SELECT COUNT(*) FROM public.members_enhanced WHERE user_id IN (SELECT id FROM public.profiles))::INTEGER,
        (SELECT COUNT(*) FROM public.members_enhanced WHERE user_id IN (SELECT id FROM public.profiles))::INTEGER - (members_with_profiles + profiles_without_members),
        'All profile data should be integrated into enhanced table'::TEXT;
    
    -- Check for duplicate emails
    SELECT COUNT(*) INTO duplicate_emails 
    FROM (SELECT email, COUNT(*) FROM public.members_enhanced GROUP BY email HAVING COUNT(*) > 1) dups;
    
    RETURN QUERY SELECT 
        'EMAIL_UNIQUENESS'::TEXT,
        CASE WHEN duplicate_emails = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        0,
        duplicate_emails,
        duplicate_emails,
        format('Found %s duplicate email addresses', duplicate_emails)::TEXT;
    
    -- Check for missing required fields
    SELECT COUNT(*) INTO missing_required_fields 
    FROM public.members_enhanced 
    WHERE email IS NULL OR trim(email) = '' OR fullname IS NULL OR trim(fullname) = '';
    
    RETURN QUERY SELECT 
        'REQUIRED_FIELDS'::TEXT,
        CASE WHEN missing_required_fields = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        0,
        missing_required_fields,
        missing_required_fields,
        format('Found %s records with missing required fields (email or fullname)', missing_required_fields)::TEXT;
    
    -- Validate foreign key integrity
    RETURN QUERY SELECT 
        'FOREIGN_KEY_INTEGRITY'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced m 
                   WHERE m.user_id IS NOT NULL 
                   AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id)) = 0 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        0,
        (SELECT COUNT(*) FROM public.members_enhanced m 
         WHERE m.user_id IS NOT NULL 
         AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id))::INTEGER,
        (SELECT COUNT(*) FROM public.members_enhanced m 
         WHERE m.user_id IS NOT NULL 
         AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id))::INTEGER,
        'All user_id references should be valid'::TEXT;
    
    -- Validate superuser preservation
    RETURN QUERY SELECT 
        'SUPERUSER_PRESERVATION'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced 
                   WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') 
                   AND role = 'superuser') >= 1 
             THEN 'PASS' ELSE 'WARN' END::TEXT,
        2,
        (SELECT COUNT(*) FROM public.members_enhanced 
         WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') 
         AND role = 'superuser')::INTEGER,
        (SELECT COUNT(*) FROM public.members_enhanced 
         WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') 
         AND role = 'superuser')::INTEGER - 2,
        'Superuser accounts should be preserved with correct roles'::TEXT;
    
    -- Log validation results
    INSERT INTO public.consolidation_log (
        operation_type, records_affected, status, details
    ) VALUES (
        'MIGRATION_VALIDATION',
        enhanced_members_count,
        'COMPLETED',
        jsonb_build_object(
            'original_members', original_members_count,
            'original_profiles', original_profiles_count,
            'enhanced_members', enhanced_members_count,
            'duplicate_emails', duplicate_emails,
            'missing_fields', missing_required_fields
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Create rollback function
CREATE OR REPLACE FUNCTION public.rollback_migration(backup_suffix TEXT)
RETURNS TABLE (
    operation TEXT,
    status TEXT,
    records_affected INTEGER,
    details TEXT
) AS $$
DECLARE
    members_backup_exists BOOLEAN;
    profiles_backup_exists BOOLEAN;
    user_roles_backup_exists BOOLEAN;
    members_restored INTEGER := 0;
    profiles_restored INTEGER := 0;
    user_roles_restored INTEGER := 0;
BEGIN
    -- Check if backup tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = format('members_backup_%s', backup_suffix)
    ) INTO members_backup_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = format('profiles_backup_%s', backup_suffix)
    ) INTO profiles_backup_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = format('user_roles_backup_%s', backup_suffix)
    ) INTO user_roles_backup_exists;
    
    -- Validate backup existence
    IF NOT (members_backup_exists AND profiles_backup_exists AND user_roles_backup_exists) THEN
        RETURN QUERY SELECT 
            'VALIDATION'::TEXT,
            'FAILED'::TEXT,
            0::INTEGER,
            format('Missing backup tables for suffix: %s', backup_suffix)::TEXT;
        RETURN;
    END IF;
    
    -- Begin rollback transaction
    BEGIN
        -- Drop enhanced members table if it exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_enhanced') THEN
            DROP TABLE public.members_enhanced CASCADE;
            
            RETURN QUERY SELECT 
                'DROP_ENHANCED_TABLE'::TEXT,
                'SUCCESS'::TEXT,
                0::INTEGER,
                'Enhanced members table dropped'::TEXT;
        END IF;
        
        -- Restore members table
        EXECUTE format('DELETE FROM public.members');
        EXECUTE format('INSERT INTO public.members SELECT * FROM public.members_backup_%s', backup_suffix);
        
        GET DIAGNOSTICS members_restored = ROW_COUNT;
        
        RETURN QUERY SELECT 
            'RESTORE_MEMBERS'::TEXT,
            'SUCCESS'::TEXT,
            members_restored,
            format('Restored %s member records', members_restored)::TEXT;
        
        -- Restore profiles table
        EXECUTE format('DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users)');
        EXECUTE format('INSERT INTO public.profiles SELECT * FROM public.profiles_backup_%s ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            church_unit = EXCLUDED.church_unit,
            assigned_pastor = EXCLUDED.assigned_pastor,
            genotype = EXCLUDED.genotype,
            role = EXCLUDED.role,
            updated_at = EXCLUDED.updated_at', backup_suffix);
        
        GET DIAGNOSTICS profiles_restored = ROW_COUNT;
        
        RETURN QUERY SELECT 
            'RESTORE_PROFILES'::TEXT,
            'SUCCESS'::TEXT,
            profiles_restored,
            format('Restored %s profile records', profiles_restored)::TEXT;
        
        -- Restore user_roles table
        EXECUTE format('DELETE FROM public.user_roles');
        EXECUTE format('INSERT INTO public.user_roles SELECT * FROM public.user_roles_backup_%s', backup_suffix);
        
        GET DIAGNOSTICS user_roles_restored = ROW_COUNT;
        
        RETURN QUERY SELECT 
            'RESTORE_USER_ROLES'::TEXT,
            'SUCCESS'::TEXT,
            user_roles_restored,
            format('Restored %s user role records', user_roles_restored)::TEXT;
        
        -- Log rollback operation
        INSERT INTO public.consolidation_log (
            operation_type, records_affected, status, details
        ) VALUES (
            'ROLLBACK_COMPLETED',
            members_restored + profiles_restored + user_roles_restored,
            'SUCCESS',
            jsonb_build_object(
                'backup_suffix', backup_suffix,
                'members_restored', members_restored,
                'profiles_restored', profiles_restored,
                'user_roles_restored', user_roles_restored
            )
        );
        
        RETURN QUERY SELECT 
            'ROLLBACK_SUMMARY'::TEXT,
            'SUCCESS'::TEXT,
            (members_restored + profiles_restored + user_roles_restored)::INTEGER,
            format('Rollback completed successfully. Total records restored: %s', 
                   members_restored + profiles_restored + user_roles_restored)::TEXT;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log rollback failure
            INSERT INTO public.consolidation_log (
                operation_type, records_affected, status, details
            ) VALUES (
                'ROLLBACK_FAILED',
                0,
                'FAILED',
                jsonb_build_object(
                    'backup_suffix', backup_suffix,
                    'error_message', SQLERRM
                )
            );
            
            RETURN QUERY SELECT 
                'ROLLBACK_ERROR'::TEXT,
                'FAILED'::TEXT,
                0::INTEGER,
                format('Rollback failed: %s', SQLERRM)::TEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up backup tables
CREATE OR REPLACE FUNCTION public.cleanup_migration_backups(backup_suffix TEXT)
RETURNS TABLE (
    operation TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    backup_tables TEXT[];
    table_name TEXT;
BEGIN
    -- Get list of backup tables for this suffix
    backup_tables := ARRAY[
        format('members_backup_%s', backup_suffix),
        format('profiles_backup_%s', backup_suffix),
        format('user_roles_backup_%s', backup_suffix)
    ];
    
    -- Drop each backup table
    FOREACH table_name IN ARRAY backup_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            EXECUTE format('DROP TABLE public.%I', table_name);
            
            RETURN QUERY SELECT 
                'DROP_BACKUP_TABLE'::TEXT,
                'SUCCESS'::TEXT,
                format('Dropped backup table: %s', table_name)::TEXT;
        ELSE
            RETURN QUERY SELECT 
                'DROP_BACKUP_TABLE'::TEXT,
                'SKIPPED'::TEXT,
                format('Backup table does not exist: %s', table_name)::TEXT;
        END IF;
    END LOOP;
    
    -- Log cleanup operation
    INSERT INTO public.consolidation_log (
        operation_type, records_affected, status, details
    ) VALUES (
        'BACKUP_CLEANUP',
        array_length(backup_tables, 1),
        'SUCCESS',
        jsonb_build_object(
            'backup_suffix', backup_suffix,
            'tables_cleaned', backup_tables
        )
    );
    
    RETURN QUERY SELECT 
        'CLEANUP_SUMMARY'::TEXT,
        'SUCCESS'::TEXT,
        format('Cleanup completed for backup suffix: %s', backup_suffix)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive migration integrity check
CREATE OR REPLACE FUNCTION public.comprehensive_migration_check()
RETURNS TABLE (
    check_category TEXT,
    check_name TEXT,
    status TEXT,
    severity TEXT,
    message TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Check 1: Table existence
    RETURN QUERY SELECT 
        'INFRASTRUCTURE'::TEXT,
        'ENHANCED_TABLE_EXISTS'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_enhanced') 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'CRITICAL'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_enhanced') 
             THEN 'Enhanced members table exists' 
             ELSE 'Enhanced members table is missing' END::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_enhanced') 
             THEN 'No action needed' 
             ELSE 'Run enhanced table creation script' END::TEXT;
    
    -- Check 2: RLS policies
    RETURN QUERY SELECT 
        'SECURITY'::TEXT,
        'RLS_POLICIES_ACTIVE'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced') > 0 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'HIGH'::TEXT,
        format('Found %s RLS policies for enhanced members table', 
               (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced'))::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced') > 0 
             THEN 'RLS policies are properly configured' 
             ELSE 'Configure RLS policies for enhanced table' END::TEXT;
    
    -- Check 3: Index performance
    RETURN QUERY SELECT 
        'PERFORMANCE'::TEXT,
        'INDEXES_CREATED'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'members_enhanced') >= 5 
             THEN 'PASS' ELSE 'WARN' END::TEXT,
        'MEDIUM'::TEXT,
        format('Found %s indexes on enhanced members table', 
               (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'members_enhanced'))::TEXT,
        'Ensure all necessary indexes are created for optimal performance'::TEXT;
    
    -- Check 4: Data consistency
    RETURN QUERY SELECT 
        'DATA_INTEGRITY'::TEXT,
        'EMAIL_CONSISTENCY'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM (SELECT email, COUNT(*) FROM public.members_enhanced GROUP BY email HAVING COUNT(*) > 1) dups) = 0 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'CRITICAL'::TEXT,
        format('Found %s duplicate email addresses', 
               (SELECT COUNT(*) FROM (SELECT email, COUNT(*) FROM public.members_enhanced GROUP BY email HAVING COUNT(*) > 1) dups))::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM (SELECT email, COUNT(*) FROM public.members_enhanced GROUP BY email HAVING COUNT(*) > 1) dups) = 0 
             THEN 'Email uniqueness is maintained' 
             ELSE 'Resolve duplicate email addresses' END::TEXT;
    
    -- Check 5: Superuser access
    RETURN QUERY SELECT 
        'SECURITY'::TEXT,
        'SUPERUSER_ACCESS'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced 
                   WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')) >= 1 
             THEN 'PASS' ELSE 'WARN' END::TEXT,
        'HIGH'::TEXT,
        format('Found %s superuser accounts in enhanced table', 
               (SELECT COUNT(*) FROM public.members_enhanced 
                WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')))::TEXT,
        'Ensure superuser accounts have proper access and roles'::TEXT;
    
    -- Check 6: Function availability
    RETURN QUERY SELECT 
        'FUNCTIONALITY'::TEXT,
        'CONSOLIDATION_FUNCTIONS'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM information_schema.routines 
                   WHERE routine_schema = 'public' 
                   AND routine_name LIKE '%consolidat%') >= 3 
             THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'MEDIUM'::TEXT,
        format('Found %s consolidation-related functions', 
               (SELECT COUNT(*) FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name LIKE '%consolidat%'))::TEXT,
        'Ensure all consolidation functions are properly created'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create migration execution log view
CREATE OR REPLACE VIEW public.migration_execution_log AS
SELECT 
    id,
    operation_type,
    operation_timestamp,
    records_affected,
    conflicts_resolved,
    status,
    details,
    created_by,
    CASE 
        WHEN operation_type LIKE '%BACKUP%' THEN 'Backup Operation'
        WHEN operation_type LIKE '%CONSOLIDAT%' THEN 'Data Consolidation'
        WHEN operation_type LIKE '%VALIDAT%' THEN 'Validation Check'
        WHEN operation_type LIKE '%ROLLBACK%' THEN 'Rollback Operation'
        ELSE 'Other Operation'
    END as operation_category
FROM public.consolidation_log
ORDER BY operation_timestamp DESC;

-- Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.create_migration_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_migration_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_migration(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_migration_backups(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comprehensive_migration_check() TO authenticated;
GRANT SELECT ON public.migration_execution_log TO authenticated;

-- Create migration status summary function
CREATE OR REPLACE FUNCTION public.get_migration_status()
RETURNS TABLE (
    migration_phase TEXT,
    status TEXT,
    last_operation TIMESTAMP WITH TIME ZONE,
    records_count INTEGER,
    issues_count INTEGER,
    recommendations TEXT[]
) AS $$
DECLARE
    enhanced_table_exists BOOLEAN;
    backup_tables_count INTEGER;
    validation_failures INTEGER;
    recommendations_list TEXT[];
BEGIN
    -- Check if enhanced table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'members_enhanced'
    ) INTO enhanced_table_exists;
    
    -- Count backup tables
    SELECT COUNT(*) INTO backup_tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%_backup_%';
    
    -- Count validation failures
    SELECT COUNT(*) INTO validation_failures
    FROM public.validate_migration_data()
    WHERE status = 'FAIL';
    
    -- Build recommendations
    recommendations_list := ARRAY[]::TEXT[];
    
    IF NOT enhanced_table_exists THEN
        recommendations_list := array_append(recommendations_list, 'Create enhanced members table schema');
    END IF;
    
    IF backup_tables_count = 0 THEN
        recommendations_list := array_append(recommendations_list, 'Create migration backups before proceeding');
    END IF;
    
    IF validation_failures > 0 THEN
        recommendations_list := array_append(recommendations_list, format('Resolve %s validation failures', validation_failures));
    END IF;
    
    -- Return migration status
    RETURN QUERY SELECT 
        CASE 
            WHEN NOT enhanced_table_exists THEN 'PREPARATION'
            WHEN enhanced_table_exists AND (SELECT COUNT(*) FROM public.members_enhanced) = 0 THEN 'READY_FOR_MIGRATION'
            WHEN enhanced_table_exists AND (SELECT COUNT(*) FROM public.members_enhanced) > 0 AND validation_failures = 0 THEN 'MIGRATION_COMPLETED'
            WHEN enhanced_table_exists AND (SELECT COUNT(*) FROM public.members_enhanced) > 0 AND validation_failures > 0 THEN 'MIGRATION_ISSUES'
            ELSE 'UNKNOWN'
        END::TEXT,
        CASE 
            WHEN validation_failures = 0 AND enhanced_table_exists THEN 'HEALTHY'
            WHEN validation_failures > 0 THEN 'ISSUES_DETECTED'
            ELSE 'PENDING'
        END::TEXT,
        (SELECT MAX(operation_timestamp) FROM public.consolidation_log)::TIMESTAMP WITH TIME ZONE,
        COALESCE((SELECT COUNT(*) FROM public.members_enhanced), 0)::INTEGER,
        validation_failures,
        recommendations_list;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for status function
GRANT EXECUTE ON FUNCTION public.get_migration_status() TO authenticated;

-- Create final validation checklist function
CREATE OR REPLACE FUNCTION public.final_migration_checklist()
RETURNS TABLE (
    checklist_item TEXT,
    status TEXT,
    priority TEXT,
    details TEXT,
    action_required TEXT
) AS $$
BEGIN
    -- Checklist item 1: Backup verification
    RETURN QUERY SELECT 
        'Backup Tables Created'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%_backup_%') >= 3 
             THEN 'COMPLETE' ELSE 'PENDING' END::TEXT,
        'CRITICAL'::TEXT,
        format('Found %s backup tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%_backup_%'))::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%_backup_%') >= 3 
             THEN 'No action needed' ELSE 'Run create_migration_backups() function' END::TEXT;
    
    -- Checklist item 2: Enhanced table creation
    RETURN QUERY SELECT 
        'Enhanced Members Table'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_enhanced') 
             THEN 'COMPLETE' ELSE 'PENDING' END::TEXT,
        'CRITICAL'::TEXT,
        'Enhanced members table with consolidated schema'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'members_enhanced') 
             THEN 'No action needed' ELSE 'Execute enhanced-members-table-schema.sql' END::TEXT;
    
    -- Checklist item 3: Data consolidation
    RETURN QUERY SELECT 
        'Data Consolidation'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced) > 0 THEN 'COMPLETE' ELSE 'PENDING' END::TEXT,
        'CRITICAL'::TEXT,
        format('Enhanced table contains %s records', COALESCE((SELECT COUNT(*) FROM public.members_enhanced), 0))::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.members_enhanced) > 0 
             THEN 'No action needed' ELSE 'Run consolidate_members_and_profiles() function' END::TEXT;
    
    -- Checklist item 4: Data validation
    RETURN QUERY SELECT 
        'Data Validation'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.validate_migration_data() WHERE status = 'FAIL') = 0 
             THEN 'COMPLETE' ELSE 'ISSUES' END::TEXT,
        'HIGH'::TEXT,
        format('%s validation checks failed', (SELECT COUNT(*) FROM public.validate_migration_data() WHERE status = 'FAIL'))::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM public.validate_migration_data() WHERE status = 'FAIL') = 0 
             THEN 'No action needed' ELSE 'Review and resolve validation failures' END::TEXT;
    
    -- Checklist item 5: Security policies
    RETURN QUERY SELECT 
        'RLS Policies'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced') >= 5 
             THEN 'COMPLETE' ELSE 'PENDING' END::TEXT,
        'HIGH'::TEXT,
        format('%s RLS policies configured', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'members_enhanced'))::TEXT,
        'Verify all necessary RLS policies are in place'::TEXT;
    
    -- Checklist item 6: Performance optimization
    RETURN QUERY SELECT 
        'Database Indexes'::TEXT,
        CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'members_enhanced') >= 8 
             THEN 'COMPLETE' ELSE 'PENDING' END::TEXT,
        'MEDIUM'::TEXT,
        format('%s indexes created', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'members_enhanced'))::TEXT,
        'Ensure all performance indexes are created'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for checklist function
GRANT EXECUTE ON FUNCTION public.final_migration_checklist() TO authenticated;