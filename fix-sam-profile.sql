-- Fix Sam Adeyemi's profile sync issue
-- This script ensures Sam's profile exists in both tables and is properly linked

-- First, let's ensure Sam exists in the members table
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
    COALESCE(p.full_name, 'Sam Adeyemi') as fullname,
    p.email,
    'Others' as category,
    NULL as churchunit,
    true as isactive,
    CURRENT_DATE as joindate,
    p.id as userid,
    NOW() as created_at,
    NOW() as updated_at
FROM profiles p
WHERE p.email = 'dev.samadeyemi@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM members m WHERE m.email = p.email
);

-- Update existing member record if it exists but userid is missing
UPDATE members 
SET 
    userid = (SELECT id FROM profiles WHERE email = 'dev.samadeyemi@gmail.com'),
    fullname = COALESCE(fullname, (SELECT full_name FROM profiles WHERE email = 'dev.samadeyemi@gmail.com')),
    updated_at = NOW()
WHERE email = 'dev.samadeyemi@gmail.com' 
AND userid IS NULL;

-- Ensure the profile exists in profiles table (in case it's missing)
INSERT INTO profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
)
SELECT 
    m.userid,
    m.email,
    m.fullname,
    NOW(),
    NOW()
FROM members m
WHERE m.email = 'dev.samadeyemi@gmail.com'
AND m.userid IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = m.userid
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- Verify the fix
SELECT 
    'Profile sync verification:' as status,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_name,
    m.id as member_id,
    m.email as member_email,
    m.fullname as member_name,
    m.userid as member_userid,
    m.category,
    m.isactive
FROM profiles p
JOIN members m ON p.email = m.email AND p.id = m.userid
WHERE p.email = 'dev.samadeyemi@gmail.com';