
-- Safe Member Import Script
-- This preserves your current schema and adds members safely

-- Step 1: Check current member count
SELECT 'Current members:' as info, COUNT(*) as count FROM members;

-- Step 2: Import members from backup (replace with actual data)
-- IMPORTANT: Replace the VALUES section with data from your backup

INSERT INTO public.members (
  id, fullname, email, phone, category, churchunit, churchunits, assignedto, isactive, created_at
) VALUES
  -- Paste your member data here from the backup
  -- Example format:
  -- ('uuid-here', 'John Doe', 'john@example.com', '1234567890', 'Members', 'Main Church', ARRAY['Main Church'], null, true, '2024-01-01T00:00:00Z'),
  
  -- Add more rows as needed...
  
-- Use this to handle conflicts (keeps existing data, adds new ones)
ON CONFLICT (email) DO NOTHING;

-- Step 3: Verify the import
SELECT 'After import:' as info, COUNT(*) as count FROM members;
SELECT 'New members added:' as info, COUNT(*) as count FROM members WHERE created_at > NOW() - INTERVAL '1 hour';

-- Step 4: Check for any issues
SELECT fullname, email, category, churchunit 
FROM members 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
