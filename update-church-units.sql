-- Update Church Units to Official Names
-- Run this in Supabase SQL Editor to migrate to official church unit names

-- Step 1: Update the validation function with official church units
CREATE OR REPLACE FUNCTION validate_churchunits()
RETURNS TRIGGER AS $$
DECLARE
    valid_units TEXT[] := ARRAY['3hmedia', '3hmusic', '3hmovies', '3hsecurity', 'discipleship', 'praisefeet', 'cloventongues'];
    unit TEXT;
BEGIN
    -- Skip validation if churchunits is NULL
    IF NEW.churchunits IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check each unit in the array
    FOREACH unit IN ARRAY NEW.churchunits
    LOOP
        IF NOT (unit = ANY(valid_units)) THEN
            RAISE EXCEPTION 'Invalid church unit: %. Valid units are: %', unit, array_to_string(valid_units, ', ');
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create migration mapping function
CREATE OR REPLACE FUNCTION migrate_church_unit_name(old_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE 
        WHEN LOWER(old_name) IN ('3h media', '3hmedia') THEN '3HMedia'
        WHEN LOWER(old_name) IN ('3h music', '3hmusic') THEN '3HMusic'
        WHEN LOWER(old_name) IN ('3h movies', '3hmovies') THEN '3HMovies'
        WHEN LOWER(old_name) IN ('3h security', '3hsecurity') THEN '3HSecurity'
        WHEN LOWER(old_name) IN ('discipleship') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('praise feet', 'praisefeet') THEN 'Praise Feet'
        WHEN LOWER(old_name) IN ('cloven tongues', 'cloventongues') THEN 'Cloven Tongues'
        -- Legacy mappings
        WHEN LOWER(old_name) IN ('auxano group', 'auxano') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('tof') THEN 'Cloven Tongues'
        WHEN LOWER(old_name) IN ('administration') THEN '3HMedia'
        WHEN LOWER(old_name) IN ('youth ministry') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('children ministry') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('music ministry') THEN '3HMusic'
        WHEN LOWER(old_name) IN ('ushering ministry') THEN '3HSecurity'
        WHEN LOWER(old_name) IN ('technical ministry') THEN '3HMedia'
        WHEN LOWER(old_name) IN ('evangelism ministry') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('prayer ministry') THEN 'Cloven Tongues'
        WHEN LOWER(old_name) IN ('welfare ministry') THEN 'Discipleship'
        WHEN LOWER(old_name) IN ('security ministry') THEN '3HSecurity'
        ELSE old_name -- Keep original if no mapping found
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Show current church units before migration
SELECT 'Current church units before migration:' as info;
SELECT 
    churchunit as current_unit,
    COUNT(*) as member_count
FROM public.members 
WHERE churchunit IS NOT NULL AND isactive = true
GROUP BY churchunit
ORDER BY member_count DESC;

-- Step 4: Update churchunit column (singular)
UPDATE public.members 
SET 
    churchunit = migrate_church_unit_name(churchunit),
    updated_at = NOW()
WHERE churchunit IS NOT NULL;

-- Step 5: Update churchunits array column (plural)
UPDATE public.members 
SET 
    churchunits = ARRAY(
        SELECT migrate_church_unit_name(unnest_unit)
        FROM unnest(churchunits) as unnest_unit
    ),
    updated_at = NOW()
WHERE churchunits IS NOT NULL AND array_length(churchunits, 1) > 0;

-- Step 6: Update church_units table if it exists
UPDATE public.church_units 
SET 
    name = migrate_church_unit_name(name),
    updated_at = NOW()
WHERE name IS NOT NULL;

-- Step 7: Show church units after migration
SELECT 'Church units after migration:' as info;
SELECT 
    churchunit as updated_unit,
    COUNT(*) as member_count
FROM public.members 
WHERE churchunit IS NOT NULL AND isactive = true
GROUP BY churchunit
ORDER BY member_count DESC;

-- Step 8: Show any unmapped church units (for review)
SELECT 'Unmapped church units (may need manual review):' as info;
SELECT DISTINCT 
    churchunit as unmapped_unit,
    COUNT(*) as member_count
FROM public.members 
WHERE churchunit IS NOT NULL 
  AND isactive = true
  AND churchunit NOT IN ('3HMedia', '3HMusic', '3HMovies', '3HSecurity', 'Discipleship', 'Praise Feet', 'Cloven Tongues')
GROUP BY churchunit
ORDER BY member_count DESC;

-- Step 9: Insert official church units into church_units table
INSERT INTO public.church_units (name, description, is_active) VALUES
    ('3HMedia', 'Media and communications ministry', true),
    ('3HMusic', 'Music and worship ministry', true),
    ('3HMovies', 'Film and video production ministry', true),
    ('3HSecurity', 'Security and safety ministry', true),
    ('Discipleship', 'Discipleship and spiritual growth ministry', true),
    ('Praise Feet', 'Dance and movement ministry', true),
    ('Cloven Tongues', 'Prayer and intercession ministry', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 10: Clean up migration function (optional)
-- DROP FUNCTION IF EXISTS migrate_church_unit_name(TEXT);

-- Step 11: Summary report
SELECT 'Migration Summary:' as summary;
SELECT 
    'Total active members' as metric,
    COUNT(*) as count
FROM public.members 
WHERE isactive = true

UNION ALL

SELECT 
    'Members with church units' as metric,
    COUNT(*) as count
FROM public.members 
WHERE isactive = true AND churchunit IS NOT NULL

UNION ALL

SELECT 
    'Official church units in use' as metric,
    COUNT(DISTINCT churchunit) as count
FROM public.members 
WHERE isactive = true 
  AND churchunit IN ('3HMedia', '3HMusic', '3HMovies', '3HSecurity', 'Discipleship', 'Praise Feet', 'Cloven Tongues');

SELECT 'Church unit migration completed successfully!' as status;
