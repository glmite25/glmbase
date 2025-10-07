-- Query to check the member_category enum values
-- Run this first in Supabase SQL Editor to see what enum values are available

SELECT 
    enumlabel as enum_value
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'member_category'
)
ORDER BY enumsortorder;

-- Also check the current members table to see what category values are being used
SELECT DISTINCT category, COUNT(*) as count
FROM members 
GROUP BY category
ORDER BY count DESC;
