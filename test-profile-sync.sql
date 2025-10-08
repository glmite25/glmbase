-- Test Profile Sync Fix
-- This script tests if the profile sync fix is working correctly

-- Test 1: Check if Sam's profile is now properly synced
SELECT 'TEST 1: Sam Adeyemi Profile Sync' as test_name;
SELECT 
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_name,
    m.id as member_id,
    m.email as member_email,
    m.fullname as member_name,
    m.userid as member_userid,
    m.category,
    m.isactive,
    CASE 
        WHEN p.id IS NOT NULL AND m.id IS NOT NULL AND m.userid = p.id THEN 'SYNCED'
        ELSE 'NOT SYNCED'
    END as sync_status
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email
WHERE p.email = 'dev.samadeyemi@gmail.com' OR m.email = 'dev.samadeyemi@gmail.com';

-- Test 2: Test the get_member_profile function for Sam
SELECT 'TEST 2: get_member_profile Function Test' as test_name;
SELECT public.get_member_profile(
    (SELECT id FROM profiles WHERE email = 'dev.samadeyemi@gmail.com')
) as function_result;

-- Test 3: Check overall sync status
SELECT 'TEST 3: Overall Sync Status' as test_name;
SELECT check_profile_sync_status() as overall_status;

-- Test 4: Count sync issues
SELECT 'TEST 4: Remaining Sync Issues Count' as test_name;
SELECT 
    COUNT(*) FILTER (WHERE p.id IS NULL) as profiles_missing,
    COUNT(*) FILTER (WHERE m.id IS NULL) as members_missing,
    COUNT(*) FILTER (WHERE m.userid IS NULL) as userid_missing,
    COUNT(*) FILTER (WHERE m.userid IS NOT NULL AND p.id IS NOT NULL AND m.userid != p.id) as userid_mismatch,
    COUNT(*) as total_records_checked
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email;

-- Test 5: Show sample of successfully synced users
SELECT 'TEST 5: Sample of Successfully Synced Users' as test_name;
SELECT 
    p.email,
    p.full_name,
    m.fullname,
    m.category,
    m.isactive
FROM profiles p
JOIN members m ON p.email = m.email AND p.id = m.userid
WHERE m.isactive = true
ORDER BY p.email
LIMIT 5;

SELECT 'PROFILE SYNC TESTS COMPLETED' as final_status;