-- Add address column to members table
-- This script adds the address column that is missing from the members table

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
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
AND column_name = 'address';