-- Fix Signup Database Issues
-- This script addresses RLS policies and database triggers that prevent user signup

-- 1. Check and fix RLS policies for profiles table
-- Allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Check and fix RLS policies for members table
-- Allow users to insert their own member record during signup
DROP POLICY IF EXISTS "Users can insert own member record" ON members;
CREATE POLICY "Users can insert own member record" ON members
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Allow users to read their own member record
DROP POLICY IF EXISTS "Users can read own member record" ON members;
CREATE POLICY "Users can read own member record" ON members
  FOR SELECT USING (auth.uid()::text = id);

-- Allow users to update their own member record
DROP POLICY IF EXISTS "Users can update own member record" ON members;
CREATE POLICY "Users can update own member record" ON members
  FOR UPDATE USING (auth.uid()::text = id);

-- 3. Create or replace function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  -- Insert into members table
  INSERT INTO public.members (
    id,
    email,
    fullname,
    phone,
    category,
    churchunit,
    assignedto,
    isactive,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    CASE 
      WHEN NEW.email IN ('ojidelawrence@gmail.com', 'admin@gospellabourministry.com') 
      THEN 'Pastors' 
      ELSE 'Members' 
    END,
    NEW.raw_user_meta_data->>'church_unit',
    NEW.raw_user_meta_data->>'assigned_pastor',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    fullname = COALESCE(EXCLUDED.fullname, members.fullname),
    phone = COALESCE(EXCLUDED.phone, members.phone),
    churchunit = COALESCE(EXCLUDED.churchunit, members.churchunit),
    assignedto = COALESCE(EXCLUDED.assignedto, members.assignedto),
    updated_at = NOW();

  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Add admin role for specific emails
  IF NEW.email IN ('ojidelawrence@gmail.com', 'admin@gospellabourministry.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Add policies for user_roles table
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Users can read own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 7. Add admin policies for full access
-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can read all members
DROP POLICY IF EXISTS "Admins can read all members" ON members;
CREATE POLICY "Admins can read all members" ON members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update all members
DROP POLICY IF EXISTS "Admins can update all members" ON members;
CREATE POLICY "Admins can update all members" ON members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can insert members
DROP POLICY IF EXISTS "Admins can insert members" ON members;
CREATE POLICY "Admins can insert members" ON members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can read all user roles
DROP POLICY IF EXISTS "Admins can read all user roles" ON user_roles;
CREATE POLICY "Admins can read all user roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Admins can insert user roles
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
CREATE POLICY "Admins can insert user roles" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON members TO anon, authenticated;
GRANT SELECT, INSERT ON user_roles TO anon, authenticated;

-- 9. Test the setup by checking if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'members', 'user_roles')
ORDER BY tablename, policyname;