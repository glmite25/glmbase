-- Task 4.3: Update database indexes for optimal performance
-- Requirements: 3.5
-- This script optimizes indexes for the enhanced members table and profiles table

-- ========================================
-- ENHANCED MEMBERS TABLE INDEX OPTIMIZATION
-- ========================================

-- Drop any conflicting indexes from old members table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members' AND table_schema = 'public') THEN
        -- Drop old indexes to avoid conflicts
        DROP INDEX IF EXISTS public.idx_members_user_id;
        DROP INDEX IF EXISTS public.idx_members_email;
        DROP INDEX IF EXISTS public.idx_members_category;
        DROP INDEX IF EXISTS public.idx_members_isactive;
        DROP INDEX IF EXISTS public.idx_members_churchunit;
        DROP INDEX IF EXISTS public.idx_members_assignedto;
        DROP INDEX IF EXISTS public.idx_members_fullname;
        DROP INDEX IF EXISTS public.idx_members_churchunits;
        
        RAISE NOTICE 'Dropped old members table indexes';
    END IF;
END $$;

-- Ensure all basic indexes exist on enhanced members table
-- These should already exist from the schema creation, but we'll ensure they're optimal

-- Primary identification indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_id ON public.members_enhanced(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_email ON public.members_enhanced(email);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_id ON public.members_enhanced(id); -- Primary key index (usually automatic)

-- Status and filtering indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_isactive ON public.members_enhanced(isactive);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_membership_status ON public.members_enhanced(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category ON public.members_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_role ON public.members_enhanced(role);

-- Church organization indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit ON public.members_enhanced(churchunit) WHERE churchunit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assignedto ON public.members_enhanced(assignedto) WHERE assignedto IS NOT NULL;

-- Date-based indexes for reporting and filtering
CREATE INDEX IF NOT EXISTS idx_members_enhanced_created_at ON public.members_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_updated_at ON public.members_enhanced(updated_at);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_joindate ON public.members_enhanced(joindate);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptism_date ON public.members_enhanced(baptism_date) WHERE baptism_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_date_of_birth ON public.members_enhanced(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- Text search indexes for names and contact info
CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname ON public.members_enhanced(fullname);
-- Note: LOWER() function indexes removed due to IMMUTABLE requirement
-- Use application-level case-insensitive search or trigram indexes instead
CREATE INDEX IF NOT EXISTS idx_members_enhanced_phone ON public.members_enhanced(phone) WHERE phone IS NOT NULL;

-- Location-based indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_city ON public.members_enhanced(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_state ON public.members_enhanced(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_country ON public.members_enhanced(country);

-- Specialized indexes for church operations
CREATE INDEX IF NOT EXISTS idx_members_enhanced_auxanogroup ON public.members_enhanced(auxanogroup) WHERE auxanogroup IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_title ON public.members_enhanced(title) WHERE title IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_genotype ON public.members_enhanced(genotype) WHERE genotype IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_occupation ON public.members_enhanced(occupation) WHERE occupation IS NOT NULL;

-- GIN indexes for array columns (should already exist)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunits_gin ON public.members_enhanced USING GIN(churchunits);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_skills_talents_gin ON public.members_enhanced USING GIN(skills_talents);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_interests_gin ON public.members_enhanced USING GIN(interests);

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Active members filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_category ON public.members_enhanced(isactive, category) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_churchunit ON public.members_enhanced(isactive, churchunit) WHERE isactive = true AND churchunit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_role ON public.members_enhanced(isactive, role) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_membership ON public.members_enhanced(isactive, membership_status) WHERE isactive = true;

-- Pastor and leadership queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_pastors_active ON public.members_enhanced(category, isactive, churchunit) WHERE category = 'Pastors' AND isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assigned_members ON public.members_enhanced(assignedto, isactive) WHERE assignedto IS NOT NULL AND isactive = true;

-- Authentication and user management
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_email ON public.members_enhanced(user_id, email) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_auth_active ON public.members_enhanced(user_id, isactive) WHERE user_id IS NOT NULL;

-- Reporting and analytics indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category_joindate ON public.members_enhanced(category, joindate) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit_joindate ON public.members_enhanced(churchunit, joindate) WHERE isactive = true AND churchunit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_age_category ON public.members_enhanced(date_of_birth, category) WHERE date_of_birth IS NOT NULL AND isactive = true;

-- Search and filtering combinations
-- Note: LOWER() function indexes removed due to IMMUTABLE requirement
CREATE INDEX IF NOT EXISTS idx_members_enhanced_name_category ON public.members_enhanced(fullname, category) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_location_active ON public.members_enhanced(city, state, isactive) WHERE isactive = true;

-- Emergency contact and communication
CREATE INDEX IF NOT EXISTS idx_members_enhanced_contact_method ON public.members_enhanced(preferred_contact_method, isactive) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_enhanced_emergency_contact ON public.members_enhanced(emergency_contact_name) WHERE emergency_contact_name IS NOT NULL;

-- ========================================
-- PROFILES TABLE INDEX OPTIMIZATION
-- ========================================

-- Ensure basic indexes exist on profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id); -- Primary key index
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name) WHERE full_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

-- Text search index for profile names
-- Note: LOWER() function indexes removed due to IMMUTABLE requirement
-- Use application-level case-insensitive search or trigram indexes instead

-- ========================================
-- PARTIAL INDEXES FOR PERFORMANCE
-- ========================================

-- Indexes specifically for active records (most queries filter by active status)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_only ON public.members_enhanced(id, fullname, email, category, churchunit) WHERE isactive = true;

-- Indexes for members with authentication accounts
CREATE INDEX IF NOT EXISTS idx_members_enhanced_authenticated_users ON public.members_enhanced(user_id, email, role) WHERE user_id IS NOT NULL;

-- Indexes for members without authentication accounts
CREATE INDEX IF NOT EXISTS idx_members_enhanced_no_auth ON public.members_enhanced(email, fullname, category) WHERE user_id IS NULL;

-- Baptized members index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptized ON public.members_enhanced(is_baptized, baptism_date) WHERE is_baptized = true;

-- Recent members index (joined in last year)
-- Note: CURRENT_DATE function removed from index predicate due to IMMUTABLE requirement
-- Use application-level filtering for date ranges instead
CREATE INDEX IF NOT EXISTS idx_members_enhanced_recent ON public.members_enhanced(joindate, category);

-- ========================================
-- FUNCTIONAL INDEXES FOR SEARCH
-- ========================================

-- Enable trigram extension for full-text search (if available)
-- Note: This may require superuser privileges
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    RAISE NOTICE 'pg_trgm extension enabled successfully';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'pg_trgm extension requires superuser privileges - skipping trigram indexes';
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_trgm extension not available - skipping trigram indexes';
END $$;

-- Full-text search preparation indexes (only if pg_trgm is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        -- Create trigram indexes for fuzzy text search
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname_trgm ON public.members_enhanced USING GIN(fullname gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_members_enhanced_email_trgm ON public.members_enhanced USING GIN(email gin_trgm_ops)';
        RAISE NOTICE 'Trigram indexes created successfully';
    ELSE
        RAISE NOTICE 'pg_trgm extension not available - trigram indexes skipped';
    END IF;
END $$;

-- ========================================
-- INDEX MAINTENANCE AND VALIDATION
-- ========================================

-- Create function to analyze index usage and performance
CREATE OR REPLACE FUNCTION public.analyze_enhanced_index_usage()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE ROUND((idx_tup_fetch::NUMERIC / idx_tup_read::NUMERIC) * 100, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' 
    AND tablename IN ('members_enhanced', 'profiles')
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to identify unused indexes
CREATE OR REPLACE FUNCTION public.find_unused_enhanced_indexes()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    definition TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || tablename as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_get_indexdef(indexrelid) as definition
    FROM pg_stat_user_indexes psi
    JOIN pg_indexes pi ON pi.indexname = psi.indexrelname
    WHERE psi.schemaname = 'public' 
    AND psi.tablename IN ('members_enhanced', 'profiles')
    AND psi.idx_scan = 0
    AND pi.indexname NOT LIKE '%_pkey' -- Exclude primary key indexes
    ORDER BY pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get index recommendations
CREATE OR REPLACE FUNCTION public.get_enhanced_index_recommendations()
RETURNS TABLE(
    recommendation_type TEXT,
    table_name TEXT,
    suggestion TEXT,
    reason TEXT
) AS $$
BEGIN
    -- Check for missing indexes on foreign keys
    RETURN QUERY
    SELECT 
        'MISSING_FK_INDEX'::TEXT,
        'members_enhanced'::TEXT,
        'Consider index on: ' || column_name::TEXT,
        'Foreign key without index detected'::TEXT
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_name = 'members_enhanced'
    AND kcu.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'members_enhanced' 
        AND indexdef LIKE '%' || kcu.column_name || '%'
    );

    -- Check for large tables without proper indexes
    RETURN QUERY
    SELECT 
        'PERFORMANCE_WARNING'::TEXT,
        tablename::TEXT,
        'Table has ' || n_tup_ins::TEXT || ' inserts but limited indexes',
        'Consider adding more selective indexes'::TEXT
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    AND tablename IN ('members_enhanced', 'profiles')
    AND n_tup_ins > 1000
    AND (
        SELECT COUNT(*) FROM pg_indexes 
        WHERE tablename = pg_stat_user_tables.tablename
    ) < 5;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate index effectiveness
CREATE OR REPLACE FUNCTION public.validate_enhanced_indexes()
RETURNS TABLE(
    validation_check TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    members_index_count INTEGER;
    profiles_index_count INTEGER;
    total_members INTEGER;
    total_profiles INTEGER;
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
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;

    -- Validation 1: Index count check
    RETURN QUERY
    SELECT 
        'members_index_count'::TEXT,
        CASE 
            WHEN members_index_count >= 15 THEN 'PASS'::TEXT
            WHEN members_index_count >= 10 THEN 'WARNING'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Members enhanced table has ' || members_index_count::TEXT || ' indexes'::TEXT;

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
            THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Critical indexes (email, user_id, isactive) exist'::TEXT;

    -- Validation 3: Performance ratio
    RETURN QUERY
    SELECT 
        'performance_ratio'::TEXT,
        CASE 
            WHEN total_members < 1000 THEN 'INFO'::TEXT
            WHEN members_index_count::NUMERIC / total_members::NUMERIC > 0.01 THEN 'PASS'::TEXT
            ELSE 'WARNING'::TEXT
        END,
        'Index to record ratio: ' || ROUND(members_index_count::NUMERIC / GREATEST(total_members, 1)::NUMERIC, 4)::TEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on analysis functions
GRANT EXECUTE ON FUNCTION public.analyze_enhanced_index_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_unused_enhanced_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_enhanced_index_recommendations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_enhanced_indexes() TO authenticated;

-- ========================================
-- STATISTICS AND MAINTENANCE
-- ========================================

-- Update table statistics for better query planning
ANALYZE public.members_enhanced;
ANALYZE public.profiles;

-- Create maintenance function to update statistics regularly
CREATE OR REPLACE FUNCTION public.maintain_enhanced_table_stats()
RETURNS TEXT AS $$
BEGIN
    -- Update statistics
    ANALYZE public.members_enhanced;
    ANALYZE public.profiles;
    
    -- Reindex if needed (only if fragmentation is high)
    -- This is commented out as it should be run manually during maintenance windows
    -- REINDEX TABLE public.members_enhanced;
    -- REINDEX TABLE public.profiles;
    
    RETURN 'Statistics updated for enhanced tables';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.maintain_enhanced_table_stats() TO authenticated;

-- Create helper function for case-insensitive search (alternative to LOWER indexes)
CREATE OR REPLACE FUNCTION public.search_members_by_name(search_term TEXT)
RETURNS TABLE(
    id UUID,
    fullname TEXT,
    email TEXT,
    category member_category,
    isactive BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.fullname,
        m.email,
        m.category,
        m.isactive
    FROM public.members_enhanced m
    WHERE m.isactive = true
    AND (
        m.fullname ILIKE '%' || search_term || '%'
        OR m.email ILIKE '%' || search_term || '%'
    )
    ORDER BY 
        CASE 
            WHEN m.fullname ILIKE search_term || '%' THEN 1
            WHEN m.fullname ILIKE '%' || search_term || '%' THEN 2
            ELSE 3
        END,
        m.fullname;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.search_members_by_name(TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.analyze_enhanced_index_usage() IS 'Analyzes index usage statistics for enhanced tables';
COMMENT ON FUNCTION public.find_unused_enhanced_indexes() IS 'Identifies unused indexes that may be candidates for removal';
COMMENT ON FUNCTION public.get_enhanced_index_recommendations() IS 'Provides recommendations for additional indexes';
COMMENT ON FUNCTION public.validate_enhanced_indexes() IS 'Validates that critical indexes exist and are effective';
COMMENT ON FUNCTION public.maintain_enhanced_table_stats() IS 'Updates table statistics for optimal query planning';
COMMENT ON FUNCTION public.search_members_by_name(TEXT) IS 'Case-insensitive search function for member names and emails';

-- Final validation
DO $$
DECLARE
    members_indexes INTEGER;
    profiles_indexes INTEGER;
BEGIN
    SELECT COUNT(*) INTO members_indexes FROM pg_indexes WHERE tablename = 'members_enhanced' AND schemaname = 'public';
    SELECT COUNT(*) INTO profiles_indexes FROM pg_indexes WHERE tablename = 'profiles' AND schemaname = 'public';
    
    RAISE NOTICE 'Enhanced members table has % indexes', members_indexes;
    RAISE NOTICE 'Profiles table has % indexes', profiles_indexes;
    
    IF members_indexes < 15 THEN
        RAISE WARNING 'Enhanced members table has fewer indexes than recommended (found %, recommended >= 15)', members_indexes;
    END IF;
    
    IF profiles_indexes < 4 THEN
        RAISE WARNING 'Profiles table has fewer indexes than recommended (found %, recommended >= 4)', profiles_indexes;
    END IF;
END $$;