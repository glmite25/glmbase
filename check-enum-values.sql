-- Check what enum values are allowed for member_category
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'member_category'
ORDER BY e.enumsortorder;