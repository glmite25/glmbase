-- STEP 1: Profile Synchronization
-- Run this first to sync all profiles and members

-- Check what categories exist first
SELECT 'Current member categories:' as info;
SELECT DISTINCT category, COUNT(*) as count
FROM members 
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;

-- Start the sync process
BEGIN;

-- Create missing member records for users who exist in profiles but not in members
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
    -- Use the most common existing category or NULL if none exist
    COALESCE(
        (SELECT category FROM members WHERE category IS NOT NULL GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1),
        NULL
    ) as category,
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

-- Update existing member records that are missing userid links
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

-- Create missing profile records for members who don't have profiles
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

-- Update member records with the new profile IDs if they were created
UPDATE members 
SET 
    userid = p.id,
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid IS NULL;

-- Fix any mismatched userid references
UPDATE members 
SET 
    userid = p.id,
    updated_at = NOW()
FROM profiles p
WHERE members.email = p.email 
AND members.userid != p.id;

-- Ensure all active members have proper names
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

-- Ensure all profiles have proper names
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

-- Show results of Step 1
SELECT 'STEP 1 COMPLETE - Profile Sync Results:' as status;
SELECT 
    (SELECT COUNT(*) FROM profiles) as total_profiles,
    (SELECT COUNT(*) FROM members) as total_members,
    (SELECT COUNT(*) FROM members WHERE userid IS NOT NULL) as synced_members;