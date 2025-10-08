-- Manual Data Consolidation Script
-- Task 3.1: Execute data consolidation from profiles to enhanced members table
-- Run this SQL after running manual-consolidation-setup.sql

-- SAFETY CHECK: Uncomment the line below if you want to clear existing data first
-- TRUNCATE TABLE public.members_enhanced CASCADE;

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
    -- Email conflict resolution: prefer members table email, fallback to profiles
    COALESCE(NULLIF(TRIM(m.email), ''), NULLIF(TRIM(p.email), ''), CONCAT('member-', m.id, '@noemail.local')) as email,
    
    -- Name conflict resolution: prefer non-null, longer names
    CASE 
        WHEN m.fullname IS NOT NULL AND TRIM(m.fullname) != '' THEN TRIM(m.fullname)
        WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '' THEN TRIM(p.full_name)
        ELSE 'Unknown Name'
    END as fullname,
    
    -- Phone conflict resolution: prefer non-null values from members, then profiles
    COALESCE(NULLIF(TRIM(m.phone), ''), NULLIF(TRIM(p.phone), '')) as phone,
    
    -- Address conflict resolution: prefer longer, non-null addresses
    CASE 
        WHEN LENGTH(COALESCE(m.address, '')) > LENGTH(COALESCE(p.address, '')) THEN m.address
        ELSE COALESCE(p.address, m.address)
    END as address,
    
    -- Genotype from profiles (new field)
    p.genotype,
    
    -- Extended personal information from profiles
    COALESCE(m.date_of_birth, p.date_of_birth) as date_of_birth,
    COALESCE(m.gender, p.gender) as gender,
    p.marital_status,
    p.occupation,
    
    -- Emergency contact from profiles
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.emergency_contact_relationship,
    
    -- Location information from profiles
    p.city,
    p.state,
    p.postal_code,
    COALESCE(p.country, 'Nigeria') as country,
    
    -- Church-specific information (prefer members table)
    COALESCE(m.category, 'Members') as category,
    m.title,
    m.assignedto,
    
    -- Church unit conflict resolution: prefer members table, add profiles church_unit to array
    COALESCE(NULLIF(TRIM(m.churchunit), ''), NULLIF(TRIM(p.church_unit), '')) as churchunit,
    
    -- Church units array: combine existing array with profile church_unit if different
    CASE 
        WHEN p.church_unit IS NOT NULL AND TRIM(p.church_unit) != '' 
             AND (m.churchunits IS NULL OR NOT (TRIM(p.church_unit) = ANY(m.churchunits)))
        THEN array_append(COALESCE(m.churchunits, ARRAY[]::TEXT[]), TRIM(p.church_unit))
        ELSE m.churchunits
    END as churchunits,
    
    m.auxanogroup,
    COALESCE(m.joindate, p.join_date, CURRENT_DATE) as joindate,
    m.notes,
    COALESCE(m.isactive, true) as isactive,
    
    -- Spiritual information from profiles
    p.baptism_date,
    p.baptism_location,
    COALESCE(p.is_baptized, false) as is_baptized,
    COALESCE(p.membership_status, 'active') as membership_status,
    
    -- Communication preferences from profiles
    COALESCE(p.preferred_contact_method, 'email') as preferred_contact_method,
    p.skills_talents,
    p.interests,
    p.bio,
    p.profile_image_url,
    
    -- Role from profiles (default to 'user')
    COALESCE(p.role, 'user') as role,
    
    -- Metadata
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
    'user' as role, -- Default role for members without profiles
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
    p.genotype,
    p.date_of_birth,
    p.gender,
    p.marital_status,
    p.occupation,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.emergency_contact_relationship,
    p.city,
    p.state,
    p.postal_code,
    COALESCE(p.country, 'Nigeria') as country,
    'Members' as category, -- Default category for profile-only users
    p.church_unit as churchunit,
    COALESCE(p.join_date, CURRENT_DATE) as joindate,
    true as isactive, -- Default to active
    p.baptism_date,
    p.baptism_location,
    COALESCE(p.is_baptized, false) as is_baptized,
    COALESCE(p.membership_status, 'active') as membership_status,
    COALESCE(p.preferred_contact_method, 'email') as preferred_contact_method,
    p.skills_talents,
    p.interests,
    p.bio,
    p.profile_image_url,
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
-- Check for duplicate emails
SELECT 'DUPLICATE_EMAILS' as check_name, 
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' duplicate email addresses' as details
FROM (
    SELECT email, COUNT(*) as cnt 
    FROM public.members_enhanced 
    GROUP BY email 
    HAVING COUNT(*) > 1
) duplicates;

-- Check for missing required fields
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

-- Check foreign key integrity
SELECT 'INVALID_USER_IDS' as check_name,
       COUNT(*) as count_value,
       'Found ' || COUNT(*) || ' records with invalid user_id references' as details
FROM public.members_enhanced m
WHERE m.user_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);

-- Summary statistics
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