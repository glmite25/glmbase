-- Manual Data Consolidation Script (Basic Version)
-- This version uses simple INSERT without ON CONFLICT to avoid constraint issues

-- Temporarily disable triggers to avoid function conflicts
SET session_replication_role = replica;

-- Log the start of consolidation
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'DATA_CONSOLIDATION_START_BASIC',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting basic data consolidation process',
        'timestamp', NOW()
    )
);

-- Clear existing data first to avoid conflicts
TRUNCATE TABLE public.members_enhanced CASCADE;

-- Step 1: Insert members with profiles (basic consolidation)
INSERT INTO public.members_enhanced (
    id, user_id, email, fullname, phone, address,
    category, assignedto, churchunit, churchunits,
    isactive, role, created_at, updated_at
)
SELECT 
    m.id,
    m.user_id,
    COALESCE(m.email, p.email, CONCAT('member-', m.id, '@noemail.local')) as email,
    COALESCE(m.fullname, p.full_name, 'Unknown Name') as fullname,
    COALESCE(m.phone, p.phone) as phone,
    COALESCE(m.address, p.address) as address,
    COALESCE(m.category, 'Members') as category,
    m.assignedto,
    m.churchunit,
    m.churchunits,
    COALESCE(m.isactive, true) as isactive,
    COALESCE(p.role, 'user') as role,
    m.created_at,
    COALESCE(m.updated_at, p.updated_at, NOW()) as updated_at
FROM public.members m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.user_id IS NOT NULL;

-- Step 2: Insert members without profiles
INSERT INTO public.members_enhanced (
    id, user_id, email, fullname, phone, address,
    category, assignedto, churchunit, churchunits,
    isactive, role, created_at, updated_at
)
SELECT 
    m.id,
    m.user_id,
    COALESCE(m.email, CONCAT('member-', m.id, '@noemail.local')) as email,
    COALESCE(m.fullname, 'Unknown Name') as fullname,
    m.phone,
    m.address,
    COALESCE(m.category, 'Members') as category,
    m.assignedto,
    m.churchunit,
    m.churchunits,
    COALESCE(m.isactive, true) as isactive,
    'user' as role,
    m.created_at,
    COALESCE(m.updated_at, NOW()) as updated_at
FROM public.members m
WHERE m.user_id IS NULL;

-- Step 3: Insert profiles without members (only if they don't conflict with existing emails)
INSERT INTO public.members_enhanced (
    user_id, email, fullname, phone, address,
    category, isactive, role, created_at, updated_at
)
SELECT 
    p.id as user_id,
    COALESCE(p.email, CONCAT('profile-', p.id, '@noemail.local')) as email,
    COALESCE(p.full_name, 'Unknown Name') as fullname,
    p.phone,
    p.address,
    'Members' as category,
    true as isactive,
    COALESCE(p.role, 'user') as role,
    p.created_at,
    COALESCE(p.updated_at, NOW()) as updated_at
FROM public.profiles p
LEFT JOIN public.members m ON p.id = m.user_id
WHERE m.user_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.members_enhanced me 
    WHERE me.email = COALESCE(p.email, CONCAT('profile-', p.id, '@noemail.local'))
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Validation queries
SELECT 'TOTAL_RECORDS' as check_name,
       COUNT(*) as count_value
FROM public.members_enhanced;

SELECT 'RECORDS_WITH_AUTH' as check_name,
       COUNT(*) as count_value
FROM public.members_enhanced 
WHERE user_id IS NOT NULL;

SELECT 'UNIQUE_EMAILS' as check_name,
       COUNT(DISTINCT email) as count_value
FROM public.members_enhanced;

-- Sample data
SELECT 
    fullname,
    email,
    role,
    category,
    CASE WHEN user_id IS NOT NULL THEN 'Has Auth' ELSE 'No Auth' END as auth_status
FROM public.members_enhanced 
ORDER BY created_at 
LIMIT 5;

-- Log completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'DATA_CONSOLIDATION_COMPLETE_BASIC',
    (SELECT COUNT(*) FROM public.members_enhanced),
    'SUCCESS',
    jsonb_build_object(
        'message', 'Basic data consolidation completed successfully',
        'total_records', (SELECT COUNT(*) FROM public.members_enhanced),
        'unique_emails', (SELECT COUNT(DISTINCT email) FROM public.members_enhanced),
        'timestamp', NOW()
    )
);

SELECT 'Basic data consolidation completed successfully!' as completion_status,
       (SELECT COUNT(*) FROM public.members_enhanced) as total_records_consolidated,
       (SELECT COUNT(DISTINCT email) FROM public.members_enhanced) as unique_emails;