-- PHASE 3: LONG-TERM IMPROVEMENTS (Next Month)
-- Gospel Labour Ministry Database - Advanced Features

-- ========================================
-- PLANNING: SCHEMA CONSOLIDATION ANALYSIS
-- ========================================

-- This script analyzes your current setup to plan Phase 3 improvements
-- Run this to understand what consolidation would involve

SELECT 'Phase 3 Planning: Schema Consolidation Analysis' as info;

-- Analyze profiles vs members overlap
SELECT 'Data Overlap Analysis:' as analysis;
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(email) as has_email,
    COUNT(full_name) as has_name,
    COUNT(avatar_url) as has_avatar
FROM public.profiles
UNION ALL
SELECT 
    'members' as table_name,
    COUNT(*) as total_records,
    COUNT(email) as has_email,
    COUNT(fullname) as has_name,
    0 as has_avatar
FROM public.members;

-- Check for data inconsistencies
SELECT 'Data Consistency Check:' as analysis;
SELECT 
    p.id as user_id,
    p.email as profile_email,
    m.email as member_email,
    p.full_name as profile_name,
    m.fullname as member_name,
    CASE 
        WHEN p.email != m.email THEN 'EMAIL_MISMATCH'
        WHEN p.full_name != m.fullname THEN 'NAME_MISMATCH'
        ELSE 'CONSISTENT'
    END as status
FROM public.profiles p
FULL OUTER JOIN public.members m ON p.id = m.user_id
WHERE p.id IS NOT NULL OR m.user_id IS NOT NULL;

-- Identify unique data in each table
SELECT 'Unique Data in Profiles:' as analysis;
SELECT 
    COUNT(*) FILTER (WHERE avatar_url IS NOT NULL) as profiles_with_avatars,
    COUNT(*) FILTER (WHERE updated_at IS NOT NULL) as profiles_with_timestamps
FROM public.profiles;

SELECT 'Unique Data in Members:' as analysis;
SELECT 
    COUNT(*) FILTER (WHERE phone IS NOT NULL) as members_with_phone,
    COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL) as members_with_dob,
    COUNT(*) FILTER (WHERE churchunit IS NOT NULL) as members_with_unit,
    COUNT(*) FILTER (WHERE category IS NOT NULL) as members_with_category,
    COUNT(*) FILTER (WHERE assignedto IS NOT NULL) as members_with_pastor
FROM public.members;