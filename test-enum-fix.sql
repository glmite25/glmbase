-- Test script to verify the enum type casting fix works
-- Run this in Supabase SQL Editor to test the fix

-- First, check what enum values exist for member_category
SELECT 'Checking member_category enum values:' as info;
SELECT enumlabel as enum_value
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'member_category'
)
ORDER BY enumsortorder;

-- Test the type casting that was causing the error
SELECT 'Testing type casting fix:' as test_info;

-- This should work now with proper type casting
SELECT 
    email,
    category as current_category,
    CASE 
        WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
        ELSE 'Members'::public.member_category
    END as should_be_category,
    CASE 
        WHEN category != CASE 
            WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
            ELSE 'Members'::public.member_category
        END THEN 'NEEDS UPDATE'
        ELSE 'CORRECT'
    END as status
FROM public.members 
WHERE isactive = true
ORDER BY 
    CASE category 
        WHEN 'Pastors' THEN 1 
        ELSE 2 
    END,
    email;

-- Show summary of what needs to be updated
SELECT 'Summary of category updates needed:' as summary_info;
SELECT 
    COUNT(*) as total_members,
    SUM(CASE WHEN category != CASE 
        WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 'Pastors'::public.member_category
        ELSE 'Members'::public.member_category
    END THEN 1 ELSE 0 END) as members_needing_update,
    SUM(CASE WHEN category = 'Pastors'::public.member_category THEN 1 ELSE 0 END) as current_pastors,
    SUM(CASE WHEN LOWER(email) IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com') THEN 1 ELSE 0 END) as should_be_pastors
FROM public.members 
WHERE isactive = true;
