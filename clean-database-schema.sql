-- Clean Database Schema for Gospel Labour Ministry
-- Only includes essential tables: profiles, user_roles, members

-- 1. Profiles table (already exists, ensure proper structure)
-- This table stores user profile information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User roles table (already exists, ensure proper structure)
-- This table manages admin and user roles
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'admin', 'superuser')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 3. Members table (main church members database)
-- This table stores all church member information
CREATE TABLE IF NOT EXISTS members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    churchunit VARCHAR(100),
    churchunits TEXT[],
    assignedto VARCHAR(255),
    category VARCHAR(50) DEFAULT 'Members' CHECK (category IN ('Members', 'Pastors', 'Deacons', 'Elders')),
    isactive BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_category ON members(category);
CREATE INDEX IF NOT EXISTS idx_members_isactive ON members(isactive);
CREATE INDEX IF NOT EXISTS idx_members_churchunit ON members(churchunit);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- User roles policies
CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Members policies
CREATE POLICY "Users can view active members" ON members
    FOR SELECT USING (isactive = true);

CREATE POLICY "Users can view own member record" ON members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own member record" ON members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all members" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

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
      category,
      isactive,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      CASE 
        WHEN NEW.email = 'ojidelawrence@gmail.com' THEN 'Pastors'
        ELSE 'Members'
      END,
      true,
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      fullname = COALESCE(EXCLUDED.fullname, members.fullname),
      updated_at = NOW();
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE (user profile changes)
  IF TG_OP = 'UPDATE' THEN
    UPDATE members SET
      email = NEW.email,
      fullname = COALESCE(NEW.raw_user_meta_data->>'full_name', fullname),
      updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
  END IF;

  -- Handle DELETE (user deletion)
  IF TG_OP = 'DELETE' THEN
    UPDATE members SET
      isactive = false,
      updated_at = NOW()
    WHERE user_id = OLD.id;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync users to members
DROP TRIGGER IF EXISTS trigger_sync_user_to_member ON auth.users;
CREATE TRIGGER trigger_sync_user_to_member
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_member();

-- Function to get member statistics
CREATE OR REPLACE FUNCTION get_member_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM members),
    'active_members', (SELECT COUNT(*) FROM members WHERE isactive = true),
    'pastors', (SELECT COUNT(*) FROM members WHERE category = 'Pastors'),
    'recent_registrations', (SELECT COUNT(*) FROM members WHERE created_at >= NOW() - INTERVAL '30 days'),
    'members_with_auth', (SELECT COUNT(*) FROM members WHERE user_id IS NOT NULL),
    'church_units', (
      SELECT json_object_agg(
        COALESCE(churchunit, 'No Unit'), 
        unit_count
      )
      FROM (
        SELECT 
          churchunit,
          COUNT(*) as unit_count
        FROM members 
        WHERE isactive = true
        GROUP BY churchunit
      ) unit_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_stats() TO authenticated;

-- Sync existing auth users to members table
INSERT INTO members (
  user_id,
  email,
  fullname,
  category,
  isactive,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  CASE 
    WHEN u.email = 'ojidelawrence@gmail.com' THEN 'Pastors'
    ELSE 'Members'
  END,
  true,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN members m ON u.id = m.user_id
WHERE m.user_id IS NULL
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  fullname = COALESCE(EXCLUDED.fullname, members.fullname),
  updated_at = NOW();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';