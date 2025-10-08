-- Check Sam Adeyemi's profile status
-- Email: dev.samadeyemi@gmail.com

-- 1. Check if user exists in auth.users (via profiles table)
SELECT 'Checking profiles table:' as step;
SELECT id, email, full_name, created_at, updated_at 
FROM profiles 
WHERE email = 'dev.samadeyemi@gmail.com';

-- 2. Check if user exists in members table
SELECT 'Checking members table:' as step;
SELECT id, fullname, email, category, churchunit, assignedto, isactive, created_at, updated_at
FROM members 
WHERE email = 'dev.samadeyemi@gmail.com';

-- 3. Check if there are any sync issues
SELECT 'Checking for sync issues:' as step;
SELECT 
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_name,
    m.id as member_id,
    m.email as member_email,
    m.fullname as member_name,
    m.userid as member_userid,
    CASE 
        WHEN p.id IS NULL THEN 'Missing from profiles'
        WHEN m.id IS NULL THEN 'Missing from members'
        WHEN m.userid IS NULL THEN 'Member missing userid link'
        WHEN m.userid != p.id THEN 'Userid mismatch'
        ELSE 'OK'
    END as sync_status
FROM profiles p
FULL OUTER JOIN members m ON p.email = m.email
WHERE p.email = 'dev.samadeyemi@gmail.com' OR m.email = 'dev.samadeyemi@gmail.com';

-- 4. Test the get_member_profile function for Sam's user ID
SELECT 'Testing get_member_profile function:' as step;
-- First get Sam's user ID
DO $$
DECLARE
    sam_user_id UUID;
    profile_result JSONB;
BEGIN
    -- Get Sam's user ID from profiles
    SELECT id INTO sam_user_id FROM profiles WHERE email = 'dev.samadeyemi@gmail.com';
    
    IF sam_user_id IS NOT NULL THEN
        RAISE NOTICE 'Sam user ID: %', sam_user_id;
        
        -- Test the function
        SELECT public.get_member_profile(sam_user_id) INTO profile_result;
        RAISE NOTICE 'Profile function result: %', profile_result;
    ELSE
        RAISE NOTICE 'Sam not found in profiles table';
    END IF;
END $$;