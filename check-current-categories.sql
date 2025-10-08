-- Check current category values in members table
SELECT DISTINCT category, COUNT(*) as count
FROM members 
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;

-- Also check the column definition
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'category';