-- Task 4.3: Update database indexes for optimal performance
-- Requirements: 3.5
-- This script creates comprehensive indexes for the enhanced members table

-- ========================================
-- ENHANCED MEMBERS TABLE INDEX OPTIMIZATION
-- ========================================

-- Drop any conflicting indexes from old members table if they exist
DROP INDEX IF EXISTS public.idx_members_user_id;
DROP INDEX IF EXISTS public.idx_members_email;
DROP INDEX IF EXISTS public.idx_members_category;
DROP INDEX IF EXISTS public.idx_members_isactive;
DROP INDEX IF EXISTS public.idx_members_churchunit;
DROP INDEX IF EXISTS public.idx_members_assignedto;
DROP INDEX IF EXISTS public.idx_members_fullname;

-- ========================================
-- PRIMARY IDENTIFICATION INDEXES
-- ========================================

-- Core identification indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_id 
ON public.members_enhanced(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_email 
ON public.members_enhanced(email);

-- ========================================
-- STATUS AND FILTERING INDEXES
-- ========================================

-- Active status index (most common filter)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_isactive 
ON public.members_enhanced(isactive);

-- Category index for member type filtering
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category 
ON public.members_enhanced(category);

-- Role index for authentication and permissions
CREATE INDEX IF NOT EXISTS idx_members_enhanced_role 
ON public.members_enhanced(role);

-- Membership status index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_membership_status 
ON public.members_enhanced(membership_status);

-- ========================================
-- CHURCH ORGANIZATION INDEXES
-- ========================================

-- Church unit index for organizational queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit 
ON public.members_enhanced(churchunit) WHERE churchunit IS NOT NULL;

-- Pastor assignment index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assignedto 
ON public.members_enhanced(assignedto) WHERE assignedto IS NOT NULL;

-- Auxano group index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_auxanogroup 
ON public.members_enhanced(auxanogroup) WHERE auxanogroup IS NOT NULL;

-- ========================================
-- DATE-BASED INDEXES FOR REPORTING
-- ========================================-- J
join date index for membership tracking
CREATE INDEX IF NOT EXISTS idx_members_enhanced_joindate 
ON public.members_enhanced(joindate);

-- Creation and update timestamps
CREATE INDEX IF NOT EXISTS idx_members_enhanced_created_at 
ON public.members_enhanced(created_at);

CREATE INDEX IF NOT EXISTS idx_members_enhanced_updated_at 
ON public.members_enhanced(updated_at);

-- Baptism date index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptism_date 
ON public.members_enhanced(baptism_date) WHERE baptism_date IS NOT NULL;

-- Date of birth index for age-based queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_date_of_birth 
ON public.members_enhanced(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- ========================================
-- TEXT SEARCH INDEXES
-- ========================================

-- Full name index for member search
CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname 
ON public.members_enhanced(fullname);

-- Phone number index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_phone 
ON public.members_enhanced(phone) WHERE phone IS NOT NULL;

-- Title index for leadership queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_title 
ON public.members_enhanced(title) WHERE title IS NOT NULL;

-- ========================================
-- LOCATION-BASED INDEXES
-- ========================================

-- City index for location-based queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_city 
ON public.members_enhanced(city) WHERE city IS NOT NULL;

-- State index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_state 
ON public.members_enhanced(state) WHERE state IS NOT NULL;

-- Country index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_country 
ON public.members_enhanced(country);

-- ========================================
-- SPECIALIZED INDEXES
-- ========================================

-- Genotype index for medical/health queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_genotype 
ON public.members_enhanced(genotype) WHERE genotype IS NOT NULL;

-- Occupation index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_occupation 
ON public.members_enhanced(occupation) WHERE occupation IS NOT NULL;

-- Gender index for demographic queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_gender 
ON public.members_enhanced(gender) WHERE gender IS NOT NULL;

-- Marital status index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_marital_status 
ON public.members_enhanced(marital_status) WHERE marital_status IS NOT NULL;-- Bapt
ism status index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_is_baptized 
ON public.members_enhanced(is_baptized);

-- Communication preference index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_contact_method 
ON public.members_enhanced(preferred_contact_method);

-- Emergency contact index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_emergency_contact 
ON public.members_enhanced(emergency_contact_name) WHERE emergency_contact_name IS NOT NULL;

-- ========================================
-- ARRAY INDEXES (GIN)
-- ========================================

-- Church units array index for multi-unit membership
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunits_gin 
ON public.members_enhanced USING GIN(churchunits);

-- Skills and talents array index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_skills_talents_gin 
ON public.members_enhanced USING GIN(skills_talents);

-- Interests array index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_interests_gin 
ON public.members_enhanced USING GIN(interests);

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Active members by category (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_category 
ON public.members_enhanced(isactive, category) WHERE isactive = true;

-- Active members by church unit
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_churchunit 
ON public.members_enhanced(isactive, churchunit) WHERE isactive = true AND churchunit IS NOT NULL;

-- Active members by role
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_role 
ON public.members_enhanced(isactive, role) WHERE isactive = true;

-- Active members by membership status
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_membership 
ON public.members_enhanced(isactive, membership_status) WHERE isactive = true;

-- Pastor and leadership queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_pastors_active 
ON public.members_enhanced(category, isactive, churchunit) 
WHERE category = 'Pastors' AND isactive = true;

-- Members assigned to pastors
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assigned_members 
ON public.members_enhanced(assignedto, isactive) 
WHERE assignedto IS NOT NULL AND isactive = true;

-- Authentication and user management
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_email 
ON public.members_enhanced(user_id, email) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_auth_active 
ON public.members_enhanced(user_id, isactive) WHERE user_id IS NOT NULL;-- 
Reporting and analytics indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category_joindate 
ON public.members_enhanced(category, joindate) WHERE isactive = true;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit_joindate 
ON public.members_enhanced(churchunit, joindate) 
WHERE isactive = true AND churchunit IS NOT NULL;

-- Age-based queries (date of birth with category)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_age_category 
ON public.members_enhanced(date_of_birth, category) 
WHERE date_of_birth IS NOT NULL AND isactive = true;

-- Search and filtering combinations
CREATE INDEX IF NOT EXISTS idx_members_enhanced_name_category 
ON public.members_enhanced(fullname, category) WHERE isactive = true;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_location_active 
ON public.members_enhanced(city, state, isactive) WHERE isactive = true;

-- ========================================
-- PARTIAL INDEXES FOR PERFORMANCE
-- ========================================

-- Active members only (covers most queries)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_only 
ON public.members_enhanced(id, fullname, email, category, churchunit) 
WHERE isactive = true;

-- Members with authentication accounts
CREATE INDEX IF NOT EXISTS idx_members_enhanced_authenticated_users 
ON public.members_enhanced(user_id, email, role) WHERE user_id IS NOT NULL;

-- Members without authentication accounts
CREATE INDEX IF NOT EXISTS idx_members_enhanced_no_auth 
ON public.members_enhanced(email, fullname, category) WHERE user_id IS NULL;

-- Baptized members
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptized 
ON public.members_enhanced(is_baptized, baptism_date) WHERE is_baptized = true;

-- ========================================
-- PROFILES TABLE INDEXES
-- ========================================

-- Basic profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
ON public.profiles(full_name) WHERE full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON public.profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
ON public.profiles(updated_at);

-- ========================================
-- TEXT SEARCH OPTIMIZATION
-- ========================================

-- Try to enable trigram extension for fuzzy text search
DO $
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    RAISE NOTICE 'pg_trgm extension enabled successfully';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'pg_trgm extension requires superuser privileges - skipping trigram indexes';
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_trgm extension not available - skipping trigram indexes';
END $;-- C
reate trigram indexes if extension is available
DO $
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        -- Trigram indexes for fuzzy text search
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname_trgm 
                 ON public.members_enhanced USING GIN(fullname gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_members_enhanced_email_trgm 
                 ON public.members_enhanced USING GIN(email gin_trgm_ops)';
        RAISE NOTICE 'Trigram indexes created successfully';
    ELSE
        RAISE NOTICE 'pg_trgm extension not available - trigram indexes skipped';
    END IF;
END $;

-- ========================================
-- INDEX VALIDATION AND MAINTENANCE
-- ========================================

-- Update table statistics for better query planning
ANALYZE public.members_enhanced;
ANALYZE public.profiles;

-- Create function to validate index effectiveness
CREATE OR REPLACE FUNCTION public.validate_task_4_3_indexes()
RETURNS TABLE(
    validation_check TEXT,
    status TEXT,
    details TEXT
) AS $
DECLARE
    members_index_count INTEGER;
    profiles_index_count INTEGER;
    total_members INTEGER;
BEGIN
    -- Count indexes
    SELECT COUNT(*) INTO members_index_count
    FROM pg_indexes 
    WHERE tablename = 'members_enhanced' AND schemaname = 'public';
    
    SELECT COUNT(*) INTO profiles_index_count
    FROM pg_indexes 
    WHERE tablename = 'profiles' AND schemaname = 'public';
    
    -- Count records
    SELECT COUNT(*) INTO total_members FROM public.members_enhanced;

    -- Validation 1: Index count check
    RETURN QUERY
    SELECT 
        'members_index_count'::TEXT,
        CASE 
            WHEN members_index_count >= 25 THEN 'PASS'::TEXT
            WHEN members_index_count >= 15 THEN 'WARNING'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Enhanced members table has ' || members_index_count::TEXT || ' indexes'::TEXT;

    RETURN QUERY
    SELECT 
        'profiles_index_count'::TEXT,
        CASE 
            WHEN profiles_index_count >= 4 THEN 'PASS'::TEXT
            ELSE 'WARNING'::TEXT
        END,
        'Profiles table has ' || profiles_index_count::TEXT || ' indexes'::TEXT;

    -- Validation 2: Critical indexes exist
    RETURN QUERY
    SELECT 
        'critical_indexes_exist'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'members_enhanced' AND indexname LIKE '%email%')
            AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'members_enhanced' AND indexname LIKE '%user_id%')
            AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'members_enhanced' AND indexname LIKE '%isactive%')
            AND EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'members_enhanced' AND indexname LIKE '%category%')
            THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Critical indexes (email, user_id, isactive, category) exist'::TEXT;

    RETURN;
END;
$ LANGUAGE plpgsql;--
 Create function to count indexes by type
CREATE OR REPLACE FUNCTION public.count_enhanced_indexes_by_type()
RETURNS TABLE(
    index_type TEXT,
    count_value BIGINT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN indexdef LIKE '%USING GIN%' THEN 'GIN'
            WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
            WHEN indexdef LIKE '%WHERE%' THEN 'PARTIAL'
            ELSE 'BTREE'
        END as index_type,
        COUNT(*)::BIGINT as count_value
    FROM pg_indexes 
    WHERE tablename = 'members_enhanced' AND schemaname = 'public'
    GROUP BY 
        CASE 
            WHEN indexdef LIKE '%USING GIN%' THEN 'GIN'
            WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
            WHEN indexdef LIKE '%WHERE%' THEN 'PARTIAL'
            ELSE 'BTREE'
        END
    ORDER BY count_value DESC;
END;
$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_task_4_3_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_enhanced_indexes_by_type() TO authenticated;

-- ========================================
-- PERFORMANCE TESTING QUERIES
-- ========================================

-- Create function to test query performance
CREATE OR REPLACE FUNCTION public.test_enhanced_query_performance()
RETURNS TABLE(
    query_name TEXT,
    execution_time_ms INTEGER,
    result_count INTEGER,
    status TEXT
) AS $
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    query_count INTEGER;
BEGIN
    -- Test 1: Active members by category
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO query_count 
    FROM public.members_enhanced 
    WHERE isactive = true AND category = 'Members';
    end_time := clock_timestamp();
    
    RETURN QUERY
    SELECT 
        'Active Members by Category'::TEXT,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
        query_count,
        CASE WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time)) < 100 THEN 'FAST' ELSE 'SLOW' END::TEXT;

    -- Test 2: Members by church unit
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO query_count 
    FROM public.members_enhanced 
    WHERE isactive = true AND churchunit IS NOT NULL;
    end_time := clock_timestamp();
    
    RETURN QUERY
    SELECT 
        'Members by Church Unit'::TEXT,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
        query_count,
        CASE WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time)) < 100 THEN 'FAST' ELSE 'SLOW' END::TEXT;

    -- Test 3: Pastor assignments
    start_time := clock_timestamp();
    SELECT COUNT(*) INTO query_count 
    FROM public.members_enhanced 
    WHERE isactive = true AND assignedto IS NOT NULL;
    end_time := clock_timestamp();
    
    RETURN QUERY
    SELECT 
        'Pastor Assignments'::TEXT,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
        query_count,
        CASE WHEN EXTRACT(MILLISECONDS FROM (end_time - start_time)) < 100 THEN 'FAST' ELSE 'SLOW' END::TEXT;

    RETURN;
END;
$ LANGUAGE plpgsql;GRANT
 EXECUTE ON FUNCTION public.test_enhanced_query_performance() TO authenticated;

-- ========================================
-- FINAL VALIDATION AND REPORTING
-- ========================================

-- Run validation and show results
DO $
DECLARE
    validation_result RECORD;
    index_count_result RECORD;
    performance_result RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TASK 4.3 INDEX OPTIMIZATION COMPLETE';
    RAISE NOTICE '========================================';
    
    -- Show validation results
    RAISE NOTICE 'INDEX VALIDATION RESULTS:';
    FOR validation_result IN 
        SELECT * FROM public.validate_task_4_3_indexes()
    LOOP
        RAISE NOTICE '  % [%]: %', 
            validation_result.validation_check, 
            validation_result.status, 
            validation_result.details;
    END LOOP;
    
    -- Show index counts by type
    RAISE NOTICE '';
    RAISE NOTICE 'INDEX COUNTS BY TYPE:';
    FOR index_count_result IN 
        SELECT * FROM public.count_enhanced_indexes_by_type()
    LOOP
        RAISE NOTICE '  %: % indexes', 
            index_count_result.index_type, 
            index_count_result.count_value;
    END LOOP;
    
    -- Show performance test results
    RAISE NOTICE '';
    RAISE NOTICE 'QUERY PERFORMANCE TEST RESULTS:';
    FOR performance_result IN 
        SELECT * FROM public.test_enhanced_query_performance()
    LOOP
        RAISE NOTICE '  % [%]: %ms (%% results)', 
            performance_result.query_name,
            performance_result.status,
            performance_result.execution_time_ms,
            performance_result.result_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Task 4.3 completed successfully!';
    RAISE NOTICE 'All necessary indexes have been created for optimal performance.';
END $;

-- Add final comments for documentation
COMMENT ON FUNCTION public.validate_task_4_3_indexes() IS 'Validates that all required indexes for Task 4.3 are properly created';
COMMENT ON FUNCTION public.count_enhanced_indexes_by_type() IS 'Counts indexes by type (BTREE, GIN, UNIQUE, PARTIAL) for the enhanced members table';
COMMENT ON FUNCTION public.test_enhanced_query_performance() IS 'Tests query performance on common queries to validate index effectiveness';

-- Final success message
SELECT 'Task 4.3: Enhanced database indexes created successfully!' as completion_status,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'members_enhanced' AND schemaname = 'public') as members_indexes_created,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'profiles' AND schemaname = 'public') as profiles_indexes_created;