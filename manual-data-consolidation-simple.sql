-- Manual Data Consolidation Script (Simple Version)
-- Task 3.1: Execute data consolidation from profiles to enhanced members table
-- This version only uses columns that actually exist in the current schema

-- Log the start of consolidation
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'DATA_CONSOLIDATION_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting data consolidation process',
        'timestamp', NOW()
    )
);

-- Step 1: Insert members with matching profiles (consolidate data with conflict resolution)
-- Only use columns that exist in both current members and profiles tables
INSERT INTO public.members_enhanced (
    id, user_id, email, fullname, phone, address,
    category, assignedto, churchunit, churchunits,
    joindate, isactive, role, created_at, updated_at,
    -- Set other enhanced fields to defaults
    genotype, date_of_birth, gender, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    city, state, postal_code, country, title, auxanogroup, notes,
    baptism_date, baptism_location, is_baptized, membership_status,
    preferred_contact_method, skills_talents, interests, bio, profile_image_url
)
SELECT 
    m.id,
    m.user_id,
    COALESCE(NULLIF(TRIM(m.email), ''), NULLIF(TRIM(p.email), ''), CONCAT('member-', m.id, '@noemail.local')) as email,
    CASE 
        WHEN m.fullname IS NOT NULL AND TRIM(m.fullname) != '' THEN TRIM(m.fullname)
        WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '' THEN TRIM(p.full_name)
        ELSE 'Unknown Name'
    END as fullname,
    COALESCE(NULLIF(TRIM(m.phone), ''), NULLIF(TRIM(p.phone), '')) as phone,
    COALESCE(m.address, p.address) as address,
    COALESCE(m.category, 'Members') as category,
    m.assignedto,
    m.churchunit,
    m.churchunits,
    CURRENT_DATE as joindate,
    COALESCE(m.isactive, true) as isactive,
    COALESCE(p.role, 'user') as role,
    m.created_at,
    GREATEST(m.updated_at, p.updated_at) as updated_at,
    -- Enhanced fields set to defaults/NULL
    NULL as genotype,
    NULL as date_of_birth,
    NULL as gender,
    NULL as marital_status,
    NULL as occupation,
    NULL as emergency_contact_name,
    NULL as emergency_contact_phone,
    NULL as emergency_contact_relationship,
    NULL as city,
    NULL as state,
    NULL as postal_code,
    'Nigeria' as country,
    NULL as title,
    NULL as auxanogroup,
    NULL as notes,
    NULL as baptism_date,
    NULL as baptism_location,
    false as is_baptized,
    'active' as membership_status,
    'email' as preferred_contact_method,
    NULL as skills_talents,
    NULL as interests,
    NULL as bio,
    NULL as profile_image_url
FROM public.members m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    category = EXCLUDED.category,
    assignedto = EXCLUDED.assignedto,
    churchunit = EXCLUDED.churchunit,
    churchunits = EXCLUDED.churchunits,
    joindate = EXCLUDED.joindate,
    isactive = EXCLUDED.isactive,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Step 2: Insert members without profiles (user_id is null)
INSERT INTO public.members_enhanced (
    id, user_id, email, fullname, phone, address,
    category, assignedto, churchunit, churchunits,
    joindate, isactive, role, created_at, updated_at,
    -- Set enhanced fields to defaults
    genotype, date_of_birth, gender, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    city, state, postal_code, country, title, auxanogroup, notes,
    baptism_date, baptism_location, is_baptized, membership_status,
    preferred_contact_method, skills_talents, interests, bio, profile_image_url
)
SELECT 
    m.id,
    m.user_id,
    COALESCE(NULLIF(TRIM(m.email), ''), CONCAT('member-', m.id, '@noemail.local')) as email,
    COALESCE(NULLIF(TRIM(m.fullname), ''), 'Unknown Name') as fullname,
    m.phone,
    m.address,
    COALESCE(m.category, 'Members') as category,
    m.assignedto,
    m.churchunit,
    m.churchunits,
    CURRENT_DATE as joindate,
    COALESCE(m.isactive, true) as isactive,
    'user' as role,
    m.created_at,
    m.updated_at,
    -- Enhanced fields set to defaults/NULL
    NULL as genotype,
    NULL as date_of_birth,
    NULL as gender,
    NULL as marital_status,
    NULL as occupation,
    NULL as emergency_contact_name,
    NULL as emergency_contact_phone,
    NULL as emergency_contact_relationship,
    NULL as city,
    NULL as state,
    NULL as postal_code,
    'Nigeria' as country,
    NULL as title,
    NULL as auxanogroup,
    NULL as notes,
    NULL as baptism_date,
    NULL as baptism_location,
    false as is_baptized,
    'active' as membership_status,
    'email' as preferred_contact_method,
    NULL as skills_talents,
    NULL as interests,
    NULL as bio,
    NULL as profile_image_url
FROM public.members m
WHERE m.user_id IS NULL
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    category = EXCLUDED.category,
    assignedto = EXCLUDED.assignedto,
    churchunit = EXCLUDED.churchunit,
    churchunits = EXCLUDED.churchunits,
    joindate = EXCLUDED.joindate,
    isactive = EXCLUDED.isactive,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Step 3: Insert profiles without corresponding members
INSERT INTO public.members_enhanced (
    user_id, email, fullname, phone, address,
    category, joindate, isactive, role, created_at, updated_at,
    -- Set enhanced fields to defaults
    genotype, date_of_birth, gender, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    city, state, postal_code, country, title, assignedto, churchunit, churchunits, auxanogroup, notes,
    baptism_date, baptism_location, is_baptized, membership_status,
    preferred_contact_method, skills_talents, interests, bio, profile_image_url
)
SELECT 
    p.id as user_id,
    COALESCE(NULLIF(TRIM(p.email), ''), CONCAT('profile-', p.id, '@noemail.local')) as email,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Unknown Name') as fullname,
    p.phone,
    p.address,
    'Members' as category,
    CURRENT_DATE as joindate,
    true as isactive,
    COALESCE(p.role, 'user') as role,
    p.created_at,
    p.updated_at,
    -- Enhanced fields set to defaults/NULL
    NULL as genotype,
    NULL as date_of_birth,
    NULL as gender,
    NULL as marital_status,
    NULL as occupation,
    NULL as emergency_contact_name,
    NULL as emergency_contact_phone,
    NULL as emergency_contact_relationship,
    NULL as city,
    NULL as state,
    NULL as postal_code,
    'Nigeria' as country,
    NULL as title,
    NULL as assignedto,
    NULL as churchunit,
    NULL as churchunits,
    NULL as auxanogroup,
    NULL as notes,
    NULL as baptism_date,
    NULL as baptism_location,
    false as is_baptized,
    'active' as membership_status,
    'email' as preferred_contact_method,
    NULL as skills_talents,
    NULL as interests,
    NULL as bio,
    NULL as profile_image_url
FROM public.profiles p
LEFT JOIN public.members m ON p.id = m.user_id
WHERE m.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    category = EXCLUDED.category,
    joindate = EXCLUDED.joindate,
    isactive = EXCLUDED.isactive,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Step 4: Data integrity validation queries
SELECT 'TOTAL_RECORDS' as check_name,
       COUNT(*) as count_value,
       'Total records in enhanced members table: ' || COUNT(*) as details
FROM public.members_enhanced;

SELECT 'ACTIVE_RECORDS' as check_name,
       COUNT(*) as count_value,
       'Active records: ' || COUNT(*) as details
FROM public.members_enhanced 
WHERE isactive = true;

SELECT 'RECORDS_WITH_AUTH' as check_name,
       COUNT(*) as count_value,
       'Records with auth.users link: ' || COUNT(*) as details
FROM public.members_enhanced 
WHERE user_id IS NOT NULL;

-- Step 5: Sample consolidated data for verification
SELECT 
    'SAMPLE_DATA' as info,
    fullname,
    email,
    role,
    category,
    churchunit,
    CASE WHEN user_id IS NOT NULL THEN 'Has Auth' ELSE 'No Auth' END as auth_status
FROM public.members_enhanced 
ORDER BY created_at 
LIMIT 5;

-- Log the completion of consolidation
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'DATA_CONSOLIDATION_COMPLETE',
    (SELECT COUNT(*) FROM public.members_enhanced),
    'SUCCESS',
    jsonb_build_object(
        'message', 'Data consolidation completed successfully',
        'total_records', (SELECT COUNT(*) FROM public.members_enhanced),
        'active_records', (SELECT COUNT(*) FROM public.members_enhanced WHERE isactive = true),
        'records_with_auth', (SELECT COUNT(*) FROM public.members_enhanced WHERE user_id IS NOT NULL),
        'timestamp', NOW()
    )
);

-- Final success message
SELECT 'Data consolidation completed successfully!' as completion_status,
       (SELECT COUNT(*) FROM public.members_enhanced) as total_records_consolidated,
       'Check the consolidation_log table for detailed operation history' as next_steps;