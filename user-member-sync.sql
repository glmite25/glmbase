-- User-Member Synchronization SQL
-- This script ensures all authenticated users are properly synced to the members table

-- First, ensure the members table has the correct structure
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add unique constraint on user_id to prevent duplicates
ALTER TABLE members ADD CONSTRAINT unique_user_id UNIQUE (user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- Create function to sync auth users to members table
CREATE OR REPLACE FUNCTION sync_user_to_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new user registration)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO members (
      user_id,
      email,
      fullname,
      phone,
      address,
      church_unit,
      assigned_pastor,
      category,
      status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'church_unit',
      NEW.raw_user_meta_data->>'assigned_pastor',
      CASE 
        WHEN NEW.email = 'ojidelawrence@gmail.com' THEN 'Pastors'
        ELSE 'Members'
      END,
      'active',
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      fullname = COALESCE(EXCLUDED.fullname, members.fullname),
      phone = COALESCE(EXCLUDED.phone, members.phone),
      address = COALESCE(EXCLUDED.address, members.address),
      church_unit = COALESCE(EXCLUDED.church_unit, members.church_unit),
      assigned_pastor = COALESCE(EXCLUDED.assigned_pastor, members.assigned_pastor),
      updated_at = NOW();
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE (user profile changes)
  IF TG_OP = 'UPDATE' THEN
    UPDATE members SET
      email = NEW.email,
      fullname = COALESCE(NEW.raw_user_meta_data->>'full_name', fullname),
      phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
      address = COALESCE(NEW.raw_user_meta_data->>'address', address),
      church_unit = COALESCE(NEW.raw_user_meta_data->>'church_unit', church_unit),
      assigned_pastor = COALESCE(NEW.raw_user_meta_data->>'assigned_pastor', assigned_pastor),
      updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
  END IF;

  -- Handle DELETE (user deletion)
  IF TG_OP = 'DELETE' THEN
    UPDATE members SET
      status = 'inactive',
      updated_at = NOW()
    WHERE user_id = OLD.id;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;

-- Create trigger to automatically sync users to members
CREATE TRIGGER trigger_sync_user_to_member
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_member();

-- Sync existing auth users to members table
INSERT INTO members (
  user_id,
  email,
  fullname,
  phone,
  address,
  church_unit,
  assigned_pastor,
  category,
  status,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'address',
  u.raw_user_meta_data->>'church_unit',
  u.raw_user_meta_data->>'assigned_pastor',
  CASE 
    WHEN u.email = 'ojidelawrence@gmail.com' THEN 'Pastors'
    ELSE 'Members'
  END,
  'active',
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN members m ON u.id = m.user_id
WHERE m.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  fullname = COALESCE(EXCLUDED.fullname, members.fullname),
  updated_at = NOW();

-- Clean up members without corresponding auth users (mock data)
DELETE FROM members 
WHERE user_id IS NULL 
   OR user_id NOT IN (SELECT id FROM auth.users);

-- Create a view for active members with user info
CREATE OR REPLACE VIEW active_members_with_auth AS
SELECT 
  m.*,
  u.email as auth_email,
  u.created_at as auth_created_at,
  u.email_confirmed_at,
  u.last_sign_in_at
FROM members m
JOIN auth.users u ON m.user_id = u.id
WHERE m.status = 'active';

-- Create function to get member stats
CREATE OR REPLACE FUNCTION get_member_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM members),
    'active_members', (SELECT COUNT(*) FROM members WHERE status = 'active'),
    'pastors', (SELECT COUNT(*) FROM members WHERE category = 'Pastors'),
    'recent_registrations', (SELECT COUNT(*) FROM members WHERE created_at >= NOW() - INTERVAL '30 days'),
    'members_with_auth', (SELECT COUNT(*) FROM members WHERE user_id IS NOT NULL),
    'members_without_auth', (SELECT COUNT(*) FROM members WHERE user_id IS NULL)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON active_members_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_stats() TO authenticated;

-- Create RLS policies for members table
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active members
CREATE POLICY "Users can view active members" ON members
  FOR SELECT USING (status = 'active');

-- Policy: Users can update their own member record
CREATE POLICY "Users can update own member record" ON members
  FOR UPDATE USING (user_id = auth.uid());

-- Policy: Admins can manage all members
CREATE POLICY "Admins can manage all members" ON members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'superuser')
    )
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';