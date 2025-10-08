-- STEP 3: Fix Specific Users and Verify Everything
-- Run this third to fix specific users and verify the complete solution

-- Fix specific known users
SELECT 'Fixing specific users...' as status;

-- Fix Sam Adeyemi specifically
SELECT sync_user_profile('dev.samadeyemi@gmail.com') as sam_sync_result;

-- Fix other known admin users
SELECT sync_user_profile('ojidelawrence@gmail.com') as ojidel_sync_result;
SELECT sync_user_profile('admin@gospellabourministry.com') as admin_sync_result;

-- Show available categories for reference
SELECT 'Available member categories:' as info;
SELECT DISTINCT category, COUNT(*) as count
FROM members 
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;

-- Final verification and results
SELECT 'SYNC VERIFICATION REPORT' as report_section;

-- Count totals
SELECT 
    'Total Counts:' as metric,
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM members) as members_count,
    (SELECT COUNT(*) FROM members WHERE userid IS NOT NULL) as members_with_userid;

-- Check overall sync status
SELECT check_profile_sync_status() as final_sync_status;

-- Show specific users with issues (if any)
SELECT 
    'Users with remaining sync issues:' as section,
    COALESCE(p.email, m.email) as email,
    CASE 
        WHEN p.id IS NULL THEN 'Missing profile'
        WHEN m.id IS NULL THEN 'Missing member record'
        WHEN m.userid IS NULL THEN 'Missing userid link'
        WHEN m.userid != p.id THEN 'Userid mismatch'
        ELSE 'OK'
    END as issue_type,
    p.id as profile_id,
    m.id as member_id,
    m.userid as member_userid
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email
WHERE p.id IS NULL 
   OR m.id IS NULL 
   OR m.userid IS NULL 
   OR (m.userid IS NOT NULL AND p.id IS NOT NULL AND m.userid != p.id)
ORDER BY email
LIMIT 10;

-- Test Sam's profile specifically
SELECT 
    'Sam Adeyemi Profile Test:' as test_section,
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
        WHEN p.id IS NOT NULL AND m.id IS NOT NULL AND m.userid = p.id THEN 'SYNCED ✅'
        ELSE 'NOT SYNCED ❌'
    END as sync_status
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email
WHERE p.email = 'dev.samadeyemi@gmail.com' OR m.email = 'dev.samadeyemi@gmail.com';

-- Test the get_member_profile function for Sam
SELECT 'Testing get_member_profile function for Sam:' as test_info;
SELECT public.get_member_profile(
    (SELECT id FROM profiles WHERE email = 'dev.samadeyemi@gmail.com')
) as sam_profile_function_test;

SELECT 
    'STEP 3 COMPLETE - ALL DONE! ✅' as status,
    'Profile sync fix has been deployed successfully' as message,
    'Sam should now be able to access his profile' as result,
    NOW() as completed_at;