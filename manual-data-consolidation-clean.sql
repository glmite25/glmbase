-- Manual Data Consolidation Script (Clean Version)
-- Task 3.1: Execute data consolidation from profiles to enhanced members table
-- Run this SQL after running manual-consolidation-setup.sql

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
INSERT INTO public.members_enhanced (
    id, user_id, email, fullname, phone, address, genotype,
    date_of_birth, gender, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    city, state, postal_code, country,
    category, title, assignedto, churchunit, churchunits, auxanogroup,
    joindate, notes, isactive,
    baptism_date, baptism_location, is_baptized, membership_status,
    preferred_contact_method, skills_talents, interests, bio, profile_image_url,
    role, created_at, updated_at
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
    COALESCE(m.category, 'Members') as category,
    NULL as title,
    m.assignedto,
    m.churchunit,
    m.churchunits,
    NULL as auxanogroup,
    CURRENT_DATE as joindate,
    NULL as notes,
    COALESCE(m.isactive, true) as isactive,
    NULL as baptism_date,
    NULL as baptism_location,
    false as is_baptized,
    'active' as membership_status,
    'email' as preferred_contact_method,
    NULL as skills_talents,
    NULL as interests,
    NULL as bio,
    NULL as profile_image_url,
    COALESCE(p.role, 'user') as role,
    m.created_at,
    GREATEST(m.updated_at, p.updated_at) as updated_at
FROM public.members m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    genotype = EXCLUDED.genotype,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    marital_status = EXCLUDED.marital_status,
    occupation = EXCLUDED.occupation,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    country = EXCLUDED.country,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    assignedto = EXCLUDED.assignedto,
    churchunit = EXCLUDED.churchunit,
    churchunits = EXCLUDED.churchunits,
    auxanogroup = EXCLUDED.auxanogroup,
    joindate = EXCLUDED.joindate,
    notes = EXCLUDED.notes,
    isactive = EXCLUDED.isactive,
    baptism_date = EXCLUDED.baptism_date,
    baptism_location = EXCLUDED.baptism_location,
    is_baptized = EXCLUDED.is_baptized,
    membership_status = EXCLUDED.membership_status,
    preferred_contact_method = EXCLUDED.preferred_contact_method,
    skills_talents = EXCLUDED.skills_talents,
    interests = EXCLUDED.interests,
    bio = EXCLUDED.bio,
    profile_image_url = EXCLUDED.profile_image_url,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Step 2: Insert members without profiles (user_id is null)
INSERT INTO public.members_enhanced (
    id, user_id, email, fullname, phone, address,
    category, title, assignedto, churchunit, churchunits, auxanogroup,
    joindate, notes, isactive, role, created_at, updated_at
)
SELECT 
    m.id,
    m.user_id,
    COALESCE(NULLIF(TRIM(m.email), ''), CONCAT('member-', m.id, '@noemail.local')) as email,
    COALESCE(NULLIF(TRIM(m.fullname), ''), 'Unknown Name') as fullname,
    m.phone,
    m.address,
    COALESCE(m.category, 'Members') as category,
    m.title,
    m.assignedto,
    m.churchunit,
    m.churchunits,
    m.auxanogroup,
    COALESCE(m.joindate, CURRENT_DATE) as joindate,
    m.notes,
    COALESCE(m.isactive, true) as isactive,
    'user' as role,
    m.created_at,
    m.updated_at
FROM public.members m
WHERE m.user_id IS NULL
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    category = EXCLUDED.category,
    title = EXCLUDED.title,
    assignedto = EXCLUDED.assignedto,
    churchunit = EXCLUDED.churchunit,
    churchunits = EXCLUDED.churchunits,
    auxanogroup = EXCLUDED.auxanogroup,
    joindate = EXCLUDED.joindate,
    notes = EXCLUDED.notes,
    isactive = EXCLUDED.isactive,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Step 3: Insert profiles without corresponding members
INSERT INTO public.members_enhanced (
    user_id, email, fullname, phone, address, genotype,
    date_of_birth, gender, marital_status, occupation,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    city, state, postal_code, country,
    category, churchunit, joindate, isactive,
    baptism_date, baptism_location, is_baptized, membership_status,
    preferred_contact_method, skills_talents, interests, bio, profile_image_url,
    role, created_at, updated_at
)
SELECT 
    p.id as user_id,
    COALESCE(NULLIF(TRIM(p.email), ''), CONCAT('profile-', p.id, '@noemail.local')) as email,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Unknown Name') as fullname,
    p.phone,
    p.address,
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
    'Members' as category,
    NULL as churchunit,
    CURRENT_DATE as joindate,
    true as isactive,
    NULL as baptism_date,
    NULL as baptism_location,
    false as is_baptized,
    'active' as membership_status,
    'email' as preferred_contact_method,
    NULL as skills_talents,
    NULL as interests,
    NULL as bio,
    NULL as profile_image_url,
    COALESCE(p.role, 'user') as role,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN public.members m ON p.id = m.user_id
WHERE m.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    genotype = EXCLUDED.genotype,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    marital_status = EXCLUDED.marital_status,
    occupation = EXCLUDED.occupation,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    country = EXCLUDED.country,
    category = EXCLUDED.category,
    churchunit = EXCLUDED.churchunit,
    joindate = EXCLUDED.joindate,
    isactive = EXCLUDED.isactive,
    baptism_date = EXCLUDED.baptism_date,
    baptism_location = EXCLUDED.baptism_location,
    is_baptized = EXCLUDED.is_baptized,
    membership_status = EXCLUDED.membership_status,
    preferred_contact_method = EXCLUDED.preferred_contact_method,
    skills_talents = EXCLUDED.skills_talents,
    interests = EXCLUDED.interests,
    bio = EXCLUDED.bio,
    profile_image_url = EXCLUDED.profile_image_url,
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;

-- Step 4: Data integrity validation queries
SELECT 'DUPLICATE_EMAILS' as check_name, 
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' duplicate email addresses' as details
FROM (
    SELECT email, COUNT(*) as cnt 
    FROM public.members_enhanced 
    GROUP BY email 
    HAVING COUNT(*) > 1
) duplicates;

SELECT 'MISSING_EMAILS' as check_name,
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' records with missing emails' as details
FROM public.members_enhanced 
WHERE email IS NULL OR TRIM(email) = '';

SELECT 'MISSING_NAMES' as check_name,
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' records with missing names' as details
FROM public.members_enhanced 
WHERE fullname IS NULL OR TRIM(fullname) = '';

SELECT 'INVALID_USER_IDS' as check_name,
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' records with invalid user_id references' as details
FROM public.members_enhanced m
WHERE m.user_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);

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
    genotype,
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