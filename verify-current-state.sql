-- VERIFY CURRENT DATABASE STATE
-- Run this to check what's been implemented so far

-- ========================================
-- CHECK 1: VERIFY TABLES AND DATA
-- ========================================

SELECT 'Current Table Status:' as info;
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check member data distribution
SELECT 'Member Data Distribution:' as info;
SELECT 
    category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM public.members 
GROUP BY category
ORDER BY count DESC;

-- Check church unit distribution
SELECT 'Church Unit Distribution:' as info;
SELECT 
    COALESCE(churchunit, 'Unassigned') as church_unit,
    COUNT(*) as count
FROM public.members 
GROUP BY churchunit
ORDER BY count DESC;

-- ========================================
-- CHECK 2: VERIFY INDEXES
-- ========================================

SELECT 'Current Indexes:' as info;
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('members', 'user_roles', 'profiles')
ORDER BY tablename, indexname;

-- ========================================
-- CHECK 3: VERIFY RLS POLICIES
-- ========================================

SELECT 'Row Level Security Status:' as info;
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'Current RLS Policies:' as info;
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- CHECK 4: VERIFY CONSTRAINTS
-- ========================================

SELECT 'Current Constraints:' as info;
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name IN ('members', 'user_roles', 'profiles')
ORDER BY table_name, constraint_type, constraint_name;

-- ========================================
-- CHECK 5: VERIFY FUNCTIONS AND TRIGGERS
-- ========================================

SELECT 'Current Functions:' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name LIKE '%member%' OR routine_name LIKE '%church%'
ORDER BY routine_name;

SELECT 'Current Triggers:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- CHECK 6: VERIFY MATERIALIZED VIEWS
-- ========================================

SELECT 'Materialized Views:' as info;
SELECT 
    schemaname,
    matviewname,
    hasindexes
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;