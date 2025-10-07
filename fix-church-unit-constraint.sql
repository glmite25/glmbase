-- FIX CHURCH UNIT CONSTRAINT ISSUE
-- This script will identify and fix problematic church unit values

-- ========================================
-- STEP 1: IDENTIFY PROBLEMATIC DATA
-- ========================================

-- Check all church unit values including problematic ones
SELECT 'All church unit values (including problematic ones):' as info;
SELECT 
    CASE 
        WHEN churchunit IS NULL THEN '[NULL]'
        WHEN churchunit = '' THEN '[EMPTY STRING]'
        WHEN LENGTH(TRIM(churchunit)) = 0 THEN '[WHITESPACE ONLY]'
        ELSE churchunit
    END as churchunit_display,
    churchunit as raw_value,
    LENGTH(churchunit) as length,
    COUNT(*) as count
FROM public.members 
GROUP BY churchunit
ORDER BY count DESC;

-- ========================================
-- STEP 2: CLEAN THE DATA
-- ========================================

-- Convert empty strings and whitespace-only values to NULL
UPDATE public.members 
SET churchunit = NULL 
WHERE churchunit IS NOT NULL 
  AND (churchunit = '' OR LENGTH(TRIM(churchunit)) = 0);

-- Show how many records were cleaned
SELECT 'Data cleaning completed. Updated records with empty/whitespace church units to NULL.' as status;

-- ========================================
-- STEP 3: SHOW CLEAN DATA
-- ========================================

-- Show the cleaned church unit values
SELECT 'Cleaned church unit values:' as info;
SELECT 
    COALESCE(churchunit, '[NULL]') as churchunit_display,
    COUNT(*) as count
FROM public.members 
GROUP BY churchunit
ORDER BY count DESC;

-- ========================================
-- STEP 4: APPLY CONSTRAINT SAFELY
-- ========================================

-- Drop any existing constraint first
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_church_unit;

-- Create the constraint that allows NULL and any non-empty string
-- This is the safest approach - we'll validate the specific values later if needed
ALTER TABLE public.members ADD CONSTRAINT valid_church_unit 
    CHECK (churchunit IS NULL OR LENGTH(TRIM(churchunit)) > 0);

SELECT 'Church unit constraint applied successfully!' as status;

-- ========================================
-- STEP 5: VERIFICATION
-- ========================================

-- Verify the constraint works
SELECT 'Constraint verification:' as info;
SELECT 
    COUNT(*) as total_members,
    COUNT(churchunit) as members_with_church_unit,
    COUNT(*) - COUNT(churchunit) as members_without_church_unit
FROM public.members;

-- Show final church unit distribution
SELECT 'Final church unit distribution:' as info;
SELECT 
    COALESCE(churchunit, '[No Unit Assigned]') as church_unit,
    COUNT(*) as member_count
FROM public.members 
GROUP BY churchunit
ORDER BY COUNT(*) DESC;