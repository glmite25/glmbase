-- Manual Data Consolidation Script (Minimal Version)
-- This version avoids triggering problematic functions and focuses on basic consolidation

-- Temporarily disable triggers to avoid function conflicts
SET session_replication_role = replica;

-- Log the start of consolidation
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'DATA_CONSOLIDATION_START_MINIMAL',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting minimal data consolidation process',
        'timestamp', NOW()
    )
);

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
WHERE m.user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    role = EXCLUDED.role,
    updated_at = NOW();

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
WHERE m.user_id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    updated_at = NOW();

-- Step 3: Insert profiles without members
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
ON CONFLICT (email) DO UPDATE SET
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    role = EXCLUDED.role,
    user_id = EXCLUDED.user_id,
    updated_at = NOW();

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
    'DATA_CONSOLIDATION_COMPLETE_MINIMAL',
    (SELECT COUNT(*) FROM public.members_enhanced),
    'SUCCESS',
    jsonb_build_object(
        'message', 'Minimal data consolidation completed successfully',
        'total_records', (SELECT COUNT(*) FROM public.members_enhanced),
        'timestamp', NOW()
    )
);

SELECT 'Minimal data consolidation completed successfully!' as completion_status,
       (SELECT COUNT(*) FROM public.members_enhanced) as total_records_consolidated;