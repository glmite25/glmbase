-- Add missing columns to members table for database consolidation
-- This script adds the genotype and address columns that may be missing from the members table

-- Check if genotype column exists in members table, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'genotype'
    ) THEN
        ALTER TABLE public.members ADD COLUMN genotype VARCHAR(10);
        
        -- Add constraint for valid genotype values
        ALTER TABLE public.members ADD CONSTRAINT valid_genotype 
        CHECK (genotype IS NULL OR genotype IN ('AA', 'AS', 'SS', 'AC', 'SC', 'CC'));
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.members.genotype IS 'Blood genotype from profiles table (AA, AS, SS, AC, SC, CC)';
        
        RAISE NOTICE 'Added genotype column to members table';
    ELSE
        RAISE NOTICE 'Genotype column already exists in members table';
    END IF;
END $$;

-- Check if address column exists in members table, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.members ADD COLUMN address TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.members.address IS 'Physical address of the member';
        
        RAISE NOTICE 'Added address column to members table';
    ELSE
        RAISE NOTICE 'Address column already exists in members table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
AND column_name = 'genotype';

-- Show sample of members table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
ORDER BY ordinal_position;