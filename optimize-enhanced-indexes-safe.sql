-- Task 4.3: Update database indexes for optimal performance (SAFE VERSION)
-- Requirements: 3.5
-- This script creates only essential indexes without any function calls in predicates

-- ========================================
-- ENHANCED MEMBERS TABLE - ESSENTIAL INDEXES
-- ========================================

-- Drop any conflicting indexes from old members table if it exists
DROP INDEX IF EXISTS public.idx_members_user_id;
DROP INDEX IF EXISTS public.idx_members_email;
DROP INDEX IF EXISTS public.idx_members_category;
DROP INDEX IF EXISTS public.idx_members_isactive;
DROP INDEX IF EXISTS public.idx_members_churchunit;
DROP INDEX IF EXISTS public.idx_members_assignedto;
DROP INDEX IF EXISTS public.idx_members_fullname;
DROP INDEX IF EXISTS public.idx_members_churchunits;

-- Primary identification indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_id ON public.members_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_email ON public.members_enhanced(email);

-- Status and filtering indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_isactive ON public.members_enhanced(isactive);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_membership_status ON public.members_enhanced(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category ON public.members_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_role ON public.members_enhanced(role);

-- Church organization indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit ON public.members_enhanced(churchunit);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assignedto ON public.members_enhanced(assignedto);

-- Date-based indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_created_at ON public.members_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_updated_at ON public.members_enhanced(updated_at);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_joindate ON public.members_enhanced(joindate);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptism_date ON public.members_enhanced(baptism_date);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_date_of_birth ON public.members_enhanced(date_of_birth);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname ON public.members_enhanced(fullname);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_phone ON public.members_enhanced(phone);

-- Location-based indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_city ON public.members_enhanced(city);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_state ON public.members_enhanced(state);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_country ON public.members_enhanced(country);

-- Specialized indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_auxanogroup ON public.members_enhanced(auxanogroup);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_title ON public.members_enhanced(title);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_genotype ON public.members_enhanced(genotype);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_occupation ON public.members_enhanced(occupation);

-- Array indexes (GIN)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunits_gin ON public.members_enhanced USING GIN(churchunits);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_skills_talents_gin ON public.members_enhanced USING GIN(skills_talents);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_interests_gin ON public.members_enhanced USING GIN(interests);

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Active members filtering
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_category ON public.members_enhanced(isactive, category);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_churchunit ON public.members_enhanced(isactive, churchunit);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_role ON public.members_enhanced(isactive, role);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_membership ON public.members_enhanced(isactive, membership_status);

-- Pastor and leadership queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_pastors_active ON public.members_enhanced(category, isactive, churchunit);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assigned_members ON public.members_enhanced(assignedto, isactive);

-- Authentication and user management
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_email ON public.members_enhanced(user_id, email);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_auth_active ON public.members_enhanced(user_id, isactive);

-- Reporting and analytics indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category_joindate ON public.members_enhanced(category, joindate);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit_joindate ON public.members_enhanced(churchunit, joindate);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_age_category ON public.members_enhanced(date_of_birth, category);

-- Search and filtering combinations
CREATE INDEX IF NOT EXISTS idx_members_enhanced_name_category ON public.members_enhanced(fullname, category);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_location_active ON public.members_enhanced(city, state, isactive);

-- Communication preferences
CREATE INDEX IF NOT EXISTS idx_members_enhanced_contact_method ON public.members_enhanced(preferred_contact_method, isactive);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_emergency_contact ON public.members_enhanced(emergency_contact_name);

-- ========================================
-- PROFILES TABLE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

-- ========================================
-- PARTIAL INDEXES (WITHOUT FUNCTION CALLS)
-- ========================================

-- Active members only
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_only ON public.members_enhanced(id, fullname, email, category, churchunit) WHERE isactive = true;

-- Members with authentication accounts
CREATE INDEX IF NOT EXISTS idx_members_enhanced_authenticated_users ON public.members_enhanced(user_id, email, role) WHERE user_id IS NOT NULL;

-- Members without authentication accounts
CREATE INDEX IF NOT EXISTS idx_members_enhanced_no_auth ON public.members_enhanced(email, fullname, category) WHERE user_id IS NULL;

-- Baptized members
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptized ON public.members_enhanced(is_baptized, baptism_date) WHERE is_baptized = true;

-- Members with church units
CREATE INDEX IF NOT EXISTS idx_members_enhanced_with_churchunit ON public.members_enhanced(churchunit, category) WHERE churchunit IS NOT NULL;

-- Members with assigned pastors
CREATE INDEX IF NOT EXISTS idx_members_enhanced_with_pastor ON public.members_enhanced(assignedto, churchunit) WHERE assignedto IS NOT NULL;

-- ========================================
-- TEXT SEARCH SETUP (OPTIONAL)
-- ========================================

-- Try to enable trigram extension (may fail if no permissions)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    
    -- Create trigram indexes if extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname_trgm ON public.members_enhanced USING GIN(fullname gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_members_enhanced_email_trgm ON public.members_enhanced USING GIN(email gin_trgm_ops)';
        RAISE NOTICE 'Trigram indexes created successfully';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Trigram extension not available - text search indexes skipped';
END $$;

-- ========================================
-- MAINTENANCE FUNCTIONS
-- ========================================

-- Simple function to update table statistics
CREATE OR REPLACE FUNCTION public.update_enhanced_table_stats()
RETURNS TEXT AS $$
BEGIN
    ANALYZE public.members_enhanced;
    ANALYZE public.profiles;
    RETURN 'Table statistics updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Simple function to count indexes
CREATE OR REPLACE FUNCTION public.count_enhanced_indexes()
RETURNS TABLE(
    table_name TEXT,
    index_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'members_enhanced'::TEXT,
        COUNT(*)::BIGINT
    FROM pg_indexes 
    WHERE tablename = 'members_enhanced' AND schemaname = 'public'
    
    UNION ALL
    
    SELECT 
        'profiles'::TEXT,
        COUNT(*)::BIGINT
    FROM pg_indexes 
    WHERE tablename = 'profiles' AND schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_enhanced_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_enhanced_indexes() TO authenticated;

-- Update statistics
SELECT public.update_enhanced_table_stats();

-- Show index counts
SELECT * FROM public.count_enhanced_indexes();

-- Final message
SELECT 'Enhanced database indexes created successfully!' as status;