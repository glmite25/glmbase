-- Check if app_role enum exists and create it if needed
DO $$
BEGIN
    -- Check if app_role enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        -- Create the app_role enum if it doesn't exist
        CREATE TYPE app_role AS ENUM ('user', 'admin', 'superuser');
        RAISE NOTICE 'Created app_role enum type';
    ELSE
        RAISE NOTICE 'app_role enum type already exists';
    END IF;
END $$;

-- Add the role column to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'user';

-- Update existing superuser members to have proper roles
UPDATE members 
SET role = 'superuser' 
WHERE email IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com');

-- Show the updated table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'role';