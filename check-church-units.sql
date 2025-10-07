-- Check existing church unit values in the members table
SELECT DISTINCT churchunit, COUNT(*) as count
FROM public.members 
WHERE churchunit IS NOT NULL
GROUP BY churchunit
ORDER BY count DESC;

-- Also check for any NULL or empty values
SELECT 
    COUNT(*) as total_records,
    COUNT(churchunit) as non_null_units,
    COUNT(*) - COUNT(churchunit) as null_units
FROM public.members;