-- Fix phone validation constraint to allow Nigerian phone numbers
-- This script updates the valid_phone constraint to accept phone numbers starting with 0

-- First, check if the constraint exists and drop it
DO $$
BEGIN
    -- Drop constraint from profiles table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_phone' 
        AND table_name = 'profiles' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT valid_phone;
        RAISE NOTICE 'Dropped valid_phone constraint from profiles table';
    END IF;

    -- Drop constraint from members table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_phone' 
        AND table_name = 'members' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.members DROP CONSTRAINT valid_phone;
        RAISE NOTICE 'Dropped valid_phone constraint from members table';
    END IF;
END $$;

-- Add new constraint to profiles table that allows:
-- - Nigerian numbers starting with 0 (like 07031098097, 08012345678)
-- - International numbers with + prefix (+2347031098097)
-- - Numbers starting with 1-9 for other countries
-- - NULL values (phone is optional)
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_phone 
CHECK (
  phone IS NULL OR 
  phone = '' OR
  phone ~* '^(\+?[1-9]\d{1,14}|0[1-9]\d{8,10})$'
);

-- Add the same constraint to members table
ALTER TABLE public.members 
ADD CONSTRAINT valid_phone 
CHECK (
  phone IS NULL OR 
  phone = '' OR
  phone ~* '^(\+?[1-9]\d{1,14}|0[1-9]\d{8,10})$'
);

-- Test the constraint with common Nigerian phone number formats
-- These should all be valid now:
-- '07031098097' (MTN)
-- '08012345678' (Airtel)
-- '09012345678' (9mobile)
-- '+2347031098097' (International format)
-- '+1234567890' (Other international)

RAISE NOTICE 'Phone validation constraints updated successfully';
RAISE NOTICE 'Valid formats: Nigerian (0xxxxxxxxxx), International (+xxxxxxxxxx), or NULL/empty';