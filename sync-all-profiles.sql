-- Comprehensive Profile Synchronization Script
-- This script ensures all users have properly synced profiles between profiles and members tables

BEGIN;

-- Step 1: Create missing member records for users who exist in profiles but not in members
INSERT INTO members (
    fullname,
    email,
    category,
    churchunit,
    isactive,
    joindate,
    userid,
    created_at,
    updated_at
)
SELECT 
    COALESCE(p.full_name, 
        -- Extract name from email if full_name is null
        INITCAP(REPLACE(SPLIT_PART(p.email, '@', 1), '.', ' '))
    ) as fullname,
    p.email,
    'Others' as category,  -- Default category for new members
    NULL as churchunit,
    true as isactive,
    CURRENT_DATE as joindate,
    p.id as userid,
    COALESCE(p.created_at, NOW()) as created_at,
    COALESCE(p.updated_at, NOW()) as updated_at
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM members m WHERE m.email = p.email
);

-- Step 2: Update existing member records that are missing userid links
UPDATE members 
SET 
    userid = p.id,
    fullname = COALESCE(members.fullname, p.full_name, 
        INITCAP(REPLACE(SPLIT_PART(members.email, '@', 1), '.', ' '))
    ),
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid IS NULL;

-- Step 3: Create missing profile records for members who don't have profiles
-- (This handles cases where members exist but profiles don't)
INSERT INTO profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
)
SELECT 
    COALESCE(m.userid, gen_random_uuid()) as id,
    m.email,
    COALESCE(m.fullname, 
        INITCAP(REPLACE(SPLIT_PART(m.email, '@', 1), '.', ' '))
    ) as full_name,
    COALESCE(m.created_at, NOW()) as created_at,
    COALESCE(m.updated_at, NOW()) as updated_at
FROM members m
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.email = m.email
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

-- Step 4: Update member records with the new profile IDs if they were created
UPDATE members 
SET 
    userid = p.id,
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid IS NULL;

-- Step 5: Fix any mismatched userid references
UPDATE members 
SET 
    userid = p.id,
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid != p.id;

-- Step 6: Ensure all active members have proper names
UPDATE members 
SET 
    fullname = COALESCE(
        NULLIF(TRIM(fullname), ''),
        p.full_name,
        INITCAP(REPLACE(SPLIT_PART(members.email, '@', 1), '.', ' '))
    ),
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND (members.fullname IS NULL OR TRIM(members.fullname) = '');

-- Step 7: Ensure all profiles have proper names
UPDATE profiles 
SET 
    full_name = COALESCE(
        NULLIF(TRIM(full_name), ''),
        m.fullname,
        INITCAP(REPLACE(SPLIT_PART(profiles.email, '@', 1), '.', ' '))
    ),
    updated_at = NOW()
FROM members m
WHERE profiles.email = m.email 
AND (profiles.full_name IS NULL OR TRIM(profiles.full_name) = '');

COMMIT;

-- Verification Report
SELECT 'SYNC VERIFICATION REPORT' as report_section;

-- Count totals
SELECT 
    'Total Counts:' as metric,
    (SELECT COUNT(*) FROM profiles) as profiles_count,
    (SELECT COUNT(*) FROM members) as members_count,
    (SELECT COUNT(*) FROM members WHERE userid IS NOT NULL) as members_with_userid;

-- Check for sync issues
SELECT 
    'Sync Issues Found:' as issue_type,
    COUNT(*) as count
FROM (
    -- Members without profiles
    SELECT 'Members without profiles' as issue, m.email
    FROM members m
    LEFT JOIN profiles p ON m.email = p.email
    WHERE p.id IS NULL
    
    UNION ALL
    
    -- Profiles without members
    SELECT 'Profiles without members' as issue, p.email
    FROM profiles p
    LEFT JOIN members m ON p.email = m.email
    WHERE m.id IS NULL
    
    UNION ALL
    
    -- Members with null userid
    SELECT 'Members with null userid' as issue, m.email
    FROM members m
    WHERE m.userid IS NULL
    
    UNION ALL
    
    -- Userid mismatches
    SELECT 'Userid mismatches' as issue, m.email
    FROM members m
    JOIN profiles p ON m.email = p.email
    WHERE m.userid != p.id
) issues
GROUP BY issue_type;

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
ORDER BY email;

-- Show successful syncs for verification
SELECT 
    'Successfully synced profiles (sample):' as section,
    p.email,
    p.full_name as profile_name,
    m.fullname as member_name,
    m.category,
    m.isactive
FROM profiles p
JOIN members m ON p.email = m.email AND p.id = m.userid
WHERE m.isactive = true
ORDER BY p.email
LIMIT 10;

SELECT 'Profile synchronization completed!' as final_status;