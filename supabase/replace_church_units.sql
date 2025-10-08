-- Complete replacement of church units with correct ones
-- This approach removes all existing units and creates the correct ones

-- First, delete all existing church units
DELETE FROM church_units;

-- Insert the correct church units as shown in your admin dashboard
INSERT INTO church_units (id, name) VALUES 
  (gen_random_uuid(), '3HMedia'),
  (gen_random_uuid(), '3HMusic'),
  (gen_random_uuid(), '3HMovies'),
  (gen_random_uuid(), '3HSecurity'),
  (gen_random_uuid(), 'Discipleship'),
  (gen_random_uuid(), 'Praise Feet'),
  (gen_random_uuid(), 'Cloven Tongues');

-- Verify the results
SELECT id, name FROM church_units ORDER BY name;