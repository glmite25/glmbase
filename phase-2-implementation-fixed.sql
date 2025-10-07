-- PHASE 2: SHORT-TERM IMPROVEMENTS (1-2 weeks)
-- Gospel Labour Ministry Database Enhancement

SELECT 'Phase 2: Implementing Performance Indexes...' as status;

-- Critical indexes for members table
CREATE INDEX IF NOT EXISTS idx_members_email_unique ON public.members(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_user_id_unique ON public.members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_category_active ON public.members(category) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_active_only ON public.members(isactive) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_church_unit_active ON public.members(churchunit) WHERE isactive = true AND churchunit IS NOT NULL;

-- Pastoral care indexes
CREATE INDEX IF NOT EXISTS idx_members_assigned_pastor ON public.members(assignedto) WHERE assignedto IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_pastor_lookup ON public.members(user_id, category) WHERE category = 'Pastors';

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_lookup ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_lookup ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_superuser ON public.user_roles(user_id) WHERE role = 'superuser';

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_unit_category ON public.members(churchunit, category) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_active_fullname ON public.members(isactive, fullname) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_unit_leaders ON public.members(churchunit, category) WHERE category = 'Pastors' AND isactive = true;

SELECT 'Performance indexes created successfully!' as status;

-- DATA VALIDATION CONSTRAINTS
SELECT 'Implementing Data Validation Constraints...' as status;

-- Email validation
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_email_format;
ALTER TABLE public.members ADD CONSTRAINT valid_email_format 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone validation
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_phone_format;
ALTER TABLE public.members ADD CONSTRAINT valid_phone_format 
    CHECK (phone IS NULL OR (LENGTH(TRIM(phone)) >= 10 AND phone ~ '^[\+]?[0-9\s\-\(\)]+$'));

-- Full name validation
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_fullname;
ALTER TABLE public.members ADD CONSTRAINT valid_fullname 
    CHECK (fullname IS NOT NULL AND LENGTH(TRIM(fullname)) >= 2);

-- Category validation
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_member_category;
ALTER TABLE public.members ADD CONSTRAINT valid_member_category 
    CHECK (category IN ('Pastors', 'Members', 'MINT'));

-- Church unit validation
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_church_unit_format;
ALTER TABLE public.members ADD CONSTRAINT valid_church_unit_format 
    CHECK (churchunit IS NULL OR LENGTH(TRIM(churchunit)) > 0);

-- Active status validation
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_active_status;
ALTER TABLE public.members ADD CONSTRAINT valid_active_status 
    CHECK (isactive IS NOT NULL);

SELECT 'Data validation constraints implemented successfully!' as status;

-- CHURCH-SPECIFIC MATERIALIZED VIEWS
SELECT 'Creating Church-Specific Analytics Views...' as status;

-- Drop existing views if they exist
DROP MATERIALIZED VIEW IF EXISTS public.church_unit_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.pastoral_care_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.member_category_stats CASCADE;

-- Church Unit Statistics
CREATE MATERIALIZED VIEW public.church_unit_stats AS
SELECT 
    COALESCE(churchunit, 'Unassigned') as unit_name,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE category = 'Pastors') as pastors_count,
    COUNT(*) FILTER (WHERE category = 'Members') as members_count,
    COUNT(*) FILTER (WHERE category = 'MINT') as mint_count,
    COUNT(*) FILTER (WHERE assignedto IS NOT NULL) as members_with_pastor,
    COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND 
                     EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 35) as youth_count,
    COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND 
                     EXTRACT(YEAR FROM AGE(date_of_birth)) > 35) as adult_count,
    MAX(created_at) as last_member_joined,
    MIN(created_at) as first_member_joined
FROM public.members 
WHERE isactive = true
GROUP BY churchunit;

-- Pastoral Care Statistics
CREATE MATERIALIZED VIEW public.pastoral_care_stats AS
SELECT 
    p.fullname as pastor_name,
    p.churchunit as pastor_unit,
    COUNT(m.id) as assigned_members,
    COUNT(m.id) FILTER (WHERE m.category = 'Members') as regular_members,
    COUNT(m.id) FILTER (WHERE m.category = 'MINT') as mint_members,
    AVG(EXTRACT(YEAR FROM AGE(m.date_of_birth))) as avg_member_age
FROM public.members p
LEFT JOIN public.members m ON p.user_id = m.assignedto
WHERE p.category = 'Pastors' AND p.isactive = true
GROUP BY p.user_id, p.fullname, p.churchunit;

-- Member Category Statistics
CREATE MATERIALIZED VIEW public.member_category_stats AS
SELECT 
    category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE churchunit IS NOT NULL) as assigned_to_unit,
    COUNT(*) FILTER (WHERE assignedto IS NOT NULL) as has_assigned_pastor,
    ROUND(AVG(EXTRACT(YEAR FROM AGE(date_of_birth))), 1) as average_age,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as joined_last_30_days,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '90 days') as joined_last_90_days
FROM public.members 
WHERE isactive = true
GROUP BY category;

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_church_unit_stats_unit ON public.church_unit_stats(unit_name);
CREATE INDEX IF NOT EXISTS idx_pastoral_care_stats_pastor ON public.pastoral_care_stats(pastor_name);
CREATE INDEX IF NOT EXISTS idx_member_category_stats_category ON public.member_category_stats(category);

SELECT 'Church analytics views created successfully!' as status;

-- HELPER FUNCTIONS FOR COMMON QUERIES
SELECT 'Creating Helper Functions...' as status;

-- Function to get member count by category
CREATE OR REPLACE FUNCTION public.get_member_count_by_category()
RETURNS TABLE(category public.member_category, active_count bigint, total_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.category,
        COUNT(*) FILTER (WHERE m.isactive = true),
        COUNT(*)
    FROM public.members m
    GROUP BY m.category
    ORDER BY COUNT(*) FILTER (WHERE m.isactive = true) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get church unit summary
CREATE OR REPLACE FUNCTION public.get_church_unit_summary()
RETURNS TABLE(
    unit_name text,
    total_members bigint,
    pastors_count bigint,
    members_count bigint,
    mint_count bigint,
    coverage_percentage numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(m.churchunit, 'Unassigned'),
        COUNT(*),
        COUNT(*) FILTER (WHERE m.category = 'Pastors'),
        COUNT(*) FILTER (WHERE m.category = 'Members'),
        COUNT(*) FILTER (WHERE m.category = 'MINT'),
        ROUND(
            COUNT(*) FILTER (WHERE m.assignedto IS NOT NULL) * 100.0 / 
            NULLIF(COUNT(*) FILTER (WHERE m.category != 'Pastors'), 0), 
            1
        )
    FROM public.members m
    WHERE m.isactive = true
    GROUP BY m.churchunit
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh all church statistics
CREATE OR REPLACE FUNCTION public.refresh_all_church_stats()
RETURNS text AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.church_unit_stats;
    REFRESH MATERIALIZED VIEW public.pastoral_care_stats;
    REFRESH MATERIALIZED VIEW public.member_category_stats;
    
    RETURN 'All church statistics refreshed successfully at ' || NOW()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pastor workload
CREATE OR REPLACE FUNCTION public.get_pastor_workload()
RETURNS TABLE(
    pastor_name text,
    church_unit text,
    assigned_members bigint,
    workload_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.fullname,
        p.churchunit,
        COUNT(m.id),
        CASE 
            WHEN COUNT(m.id) = 0 THEN 'No assignments'
            WHEN COUNT(m.id) <= 5 THEN 'Light load'
            WHEN COUNT(m.id) <= 10 THEN 'Moderate load'
            WHEN COUNT(m.id) <= 15 THEN 'Heavy load'
            ELSE 'Overloaded'
        END
    FROM public.members p
    LEFT JOIN public.members m ON p.user_id = m.assignedto AND m.isactive = true
    WHERE p.category = 'Pastors' AND p.isactive = true
    GROUP BY p.user_id, p.fullname, p.churchunit
    ORDER BY COUNT(m.id) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Helper functions created successfully!' as status;

-- GRANT PERMISSIONS
SELECT 'Setting up Permissions...' as status;

-- Grant permissions on materialized views
GRANT SELECT ON public.church_unit_stats TO authenticated;
GRANT SELECT ON public.pastoral_care_stats TO authenticated;
GRANT SELECT ON public.member_category_stats TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.get_member_count_by_category() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_church_unit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_all_church_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pastor_workload() TO authenticated;

SELECT 'Permissions configured successfully!' as status;

-- VERIFICATION AND SUMMARY
SELECT 'PHASE 2 IMPLEMENTATION COMPLETED!' as status;

-- Show performance improvements
SELECT 'Performance Indexes Created:' as info;
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('members', 'user_roles')
  AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- Show data validation
SELECT 'Data Validation Constraints:' as info;
SELECT 
    table_name,
    constraint_name
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name = 'members'
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Show analytics capabilities
SELECT 'Analytics Views Created:' as info;
SELECT 
    matviewname,
    hasindexes
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Test the analytics
SELECT 'Sample Analytics Data:' as info;
SELECT * FROM public.get_member_count_by_category();

SELECT 'Church Unit Summary:' as info;
SELECT * FROM public.get_church_unit_summary();

SELECT '✅ Phase 2 completed successfully!' as final_status;
SELECT '📊 Your database now has enhanced performance, validation, and analytics!' as final_message;
SELECT '🔄 Run refresh_all_church_stats() daily to keep analytics current' as maintenance_tip;