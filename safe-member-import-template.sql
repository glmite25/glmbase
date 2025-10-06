
-- Safe Member Data Import Template
-- This script safely imports member data without affecting schema

-- Step 1: Backup existing data (run this first)
-- CREATE TABLE members_backup AS SELECT * FROM members;

-- Step 2: Import new members (avoiding duplicates)
-- Replace the VALUES below with data from your backup

INSERT INTO public.members (
  fullname, email, phone, category, churchunit, churchunits, assignedto, isactive
) VALUES
  -- Add your member data here, for example:
  -- ('John Doe', 'john@example.com', '1234567890', 'Members', 'Main Church', ARRAY['Main Church'], null, true),
  -- ('Jane Smith', 'jane@example.com', '0987654321', 'Pastors', 'Youth Ministry', ARRAY['Youth Ministry'], null, true)
  
  -- Use this to avoid duplicates:
ON CONFLICT (email) DO UPDATE SET
  fullname = EXCLUDED.fullname,
  phone = EXCLUDED.phone,
  category = EXCLUDED.category,
  churchunit = EXCLUDED.churchunit,
  churchunits = EXCLUDED.churchunits,
  assignedto = EXCLUDED.assignedto,
  isactive = EXCLUDED.isactive,
  updated_at = NOW();

-- Step 3: Verify the import
-- SELECT COUNT(*) FROM members;
-- SELECT * FROM members ORDER BY created_at DESC LIMIT 10;
