-- Update Church Units to match frontend admin dashboard
-- This script updates the church_units table with the correct units from your admin dashboard

-- Based on the UUIDs visible in your database screenshot, here are the precise updates:

-- Update Technical Ministry to 3HMedia
UPDATE church_units 
SET name = '3HMedia'
WHERE id = '29335507-7f6f-45f3-8f3e-c299cdb90f3c';

-- Update Music Ministry to 3HMusic
UPDATE church_units 
SET name = '3HMusic' 
WHERE id = '272f760f-e005-41e6-b3a6-152c983ab3cc';

-- Update Security Ministry to 3HSecurity
UPDATE church_units 
SET name = '3HSecurity'
WHERE id = '0ce4f2d5-6918-4cd8-9c21-299b35f9ea36';

-- Update Youth Ministry to Discipleship
UPDATE church_units 
SET name = 'Discipleship'
WHERE id = '338d775-ab87-4ae8-a97c-35d8773c1c6b';

-- Update Prayer Ministry to Cloven Tongues
UPDATE church_units 
SET name = 'Cloven Tongues'
WHERE id = '6408c33e-def0-49e6-9e96-62b0db1fb3c';

-- Update Ushering Ministry to 3HMovies (reusing this record)
UPDATE church_units 
SET name = '3HMovies'
WHERE id = '0727b7a8-2ef2-46d1-a626-84596a8407b';

-- Update one of the remaining records to Praise Feet
-- Using Evangelism Ministry record for this
UPDATE church_units 
SET name = 'Praise Feet'
WHERE id = '441036a2-f30d-4841-9baa-78b3142e77b2';

-- Remove duplicate or unnecessary units
DELETE FROM church_units 
WHERE name IN (
  'Ushering Ministry',
  'Evangelism Ministry', 
  'Welfare Ministry',
  'Children Ministry',
  'Administration'
) AND id NOT IN (
  '29335507-7f6f-45f3-8f3e-c299cdb90f3c',
  '272f760f-e005-41e6-b3a6-152c983ab3cc',
  '0ce4f2d5-6918-4cd8-9c21-299b35f9ea36',
  '338d775-ab87-4ae8-a97c-35d8773c1c6b',
  '6408c33e-def0-49e6-9e96-62b0db1fb3c'
);

-- Insert any missing church units if they don't exist
INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), '3HMedia'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = '3HMedia');

INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), '3HMusic'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = '3HMusic');

INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), '3HMovies'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = '3HMovies');

INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), '3HSecurity'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = '3HSecurity');

INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), 'Discipleship'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = 'Discipleship');

INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), 'Praise Feet'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = 'Praise Feet');

INSERT INTO church_units (id, name) 
SELECT gen_random_uuid(), 'Cloven Tongues'
WHERE NOT EXISTS (SELECT 1 FROM church_units WHERE name = 'Cloven Tongues');

-- Verify the results
SELECT id, name FROM church_units ORDER BY name;