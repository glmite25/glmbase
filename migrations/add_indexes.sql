-- Add indexes to improve query performance

-- members table indexes
CREATE INDEX IF NOT EXISTS idx_members_fullname ON members (fullname);
CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_category ON members (category);
CREATE INDEX IF NOT EXISTS idx_members_assignedto ON members (assignedto);
CREATE INDEX IF NOT EXISTS idx_members_churchunit ON members (churchunit);
CREATE INDEX IF NOT EXISTS idx_members_isactive ON members (isactive);

-- Add a GIN index for the churchunits array to enable efficient array operations
CREATE INDEX IF NOT EXISTS idx_members_churchunits ON members USING GIN (churchunits);

-- profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_church_unit ON profiles (church_unit);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- user_roles table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role);

-- Add a comment explaining the purpose of these indexes
COMMENT ON INDEX idx_members_fullname IS 'Improves performance of searches and filters by member name';
COMMENT ON INDEX idx_members_email IS 'Improves performance of searches and filters by email';
COMMENT ON INDEX idx_members_category IS 'Improves performance when filtering members by category';
COMMENT ON INDEX idx_members_assignedto IS 'Improves performance when querying members assigned to a specific pastor';
COMMENT ON INDEX idx_members_churchunit IS 'Improves performance when filtering members by church unit';
COMMENT ON INDEX idx_members_isactive IS 'Improves performance when filtering active/inactive members';
COMMENT ON INDEX idx_members_churchunits IS 'Enables efficient searching within the churchunits array';
COMMENT ON INDEX idx_profiles_email IS 'Improves performance of searches and filters by email in profiles';
COMMENT ON INDEX idx_profiles_full_name IS 'Improves performance of searches and filters by name in profiles';
COMMENT ON INDEX idx_profiles_church_unit IS 'Improves performance when filtering profiles by church unit';
COMMENT ON INDEX idx_profiles_role IS 'Improves performance when filtering profiles by role';
COMMENT ON INDEX idx_user_roles_user_id IS 'Improves performance when querying roles for a specific user';
COMMENT ON INDEX idx_user_roles_role IS 'Improves performance when filtering users by role';
