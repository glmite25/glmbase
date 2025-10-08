-- Fix Member Categories
-- Set only ojidelawrence@gmail.com and popsabey1@gmail.com as Pastors
-- All other users should be Members

-- Log the start of category fix
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'MEMBER_CATEGORIES_FIX_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting fix for member categories',
        'pastor_emails', ARRAY['ojidelawrence@gmail.com', 'popsabey1@gmail.com'],
        'timestamp', NOW()
    )
);

-- First, let's see the current state
SELECT 'BEFORE_FIX' as status, 
       category, 
       COUNT(*) as count,
       array_agg(email ORDER BY email) as sample_emails
FROM public.members_enhanced 
GROUP BY category
ORDER BY category;

-- Update all members to 'Members' category first
UPDATE public.members_enhanced 
SET 
    category = 'Members',
    updated_at = NOW()
WHERE category != 'Members';

-- Now set the two specific users as Pastors with superuser roles
UPDATE public.members_enhanced 
SET 
    category = 'Pastors',
    role = 'superuser',
    isactive = true,
    membership_status = 'active',
    updated_at = NOW()
WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com');

-- Ensure these users have proper names if missing
UPDATE public.members_enhanced 
SET 
    fullname = CASE 
        WHEN email = 'ojidelawrence@gmail.com' THEN COALESCE(NULLIF(fullname, ''), 'Ojide Lawrence')
        WHEN email = 'popsabey1@gmail.com' THEN COALESCE(NULLIF(fullname, ''), 'Biodun Abey')
        ELSE fullname
    END,
    updated_at = NOW()
WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
AND (fullname IS NULL OR fullname = '');

-- Ensure all other members have 'user' role (not admin/superuser unless they're pastors)
UPDATE public.members_enhanced 
SET 
    role = 'user',
    updated_at = NOW()
WHERE email NOT IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
AND role IN ('admin', 'superuser');

-- Update profiles table to match (if profiles exist for these users)
UPDATE public.profiles 
SET 
    role = 'superuser',
    full_name = CASE 
        WHEN email = 'ojidelawrence@gmail.com' THEN COALESCE(NULLIF(full_name, ''), 'Ojide Lawrence')
        WHEN email = 'popsabey1@gmail.com' THEN COALESCE(NULLIF(full_name, ''), 'Biodun Abey')
        ELSE full_name
    END,
    updated_at = NOW()
WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com');

-- Update profiles for regular members (set to user role)
UPDATE public.profiles 
SET 
    role = 'user',
    updated_at = NOW()
WHERE email NOT IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
AND role IN ('admin', 'superuser');

-- Ensure user_roles table has correct superuser entries
-- First, remove any existing superuser roles for non-pastor users
DELETE FROM public.user_roles 
WHERE role = 'superuser' 
AND user_id NOT IN (
    SELECT u.id 
    FROM auth.users u 
    WHERE u.email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
);

-- Add superuser roles for the two pastors (if they have auth accounts)
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT u.id, 'superuser', NOW()
FROM auth.users u 
WHERE u.email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Show the results after fix
SELECT 'AFTER_FIX' as status, 
       category, 
       role,
       COUNT(*) as count,
       array_agg(email ORDER BY email) as sample_emails
FROM public.members_enhanced 
GROUP BY category, role
ORDER BY category, role;

-- Show specific pastor records
SELECT 'PASTOR_DETAILS' as status,
       email,
       fullname,
       category,
       role,
       isactive,
       membership_status
FROM public.members_enhanced 
WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
ORDER BY email;

-- Show count of members by category
SELECT 'SUMMARY' as status,
       category,
       COUNT(*) as total_count,
       COUNT(CASE WHEN isactive = true THEN 1 END) as active_count,
       COUNT(CASE WHEN role = 'superuser' THEN 1 END) as superuser_count
FROM public.members_enhanced 
GROUP BY category
ORDER BY category;

-- Log the completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'MEMBER_CATEGORIES_FIX_COMPLETE',
    (SELECT COUNT(*) FROM public.members_enhanced),
    'SUCCESS',
    jsonb_build_object(
        'message', 'Completed fix for member categories',
        'pastors_count', (SELECT COUNT(*) FROM public.members_enhanced WHERE category = 'Pastors'),
        'members_count', (SELECT COUNT(*) FROM public.members_enhanced WHERE category = 'Members'),
        'pastor_emails', ARRAY['ojidelawrence@gmail.com', 'popsabey1@gmail.com'],
        'timestamp', NOW()
    )
);

SELECT 'Member categories fixed successfully!' as result,
       (SELECT COUNT(*) FROM public.members_enhanced WHERE category = 'Pastors') as pastors_count,
       (SELECT COUNT(*) FROM public.members_enhanced WHERE category = 'Members') as members_count;