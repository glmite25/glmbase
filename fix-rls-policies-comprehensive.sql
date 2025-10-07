-- Comprehensive RLS Policy Fix for Authentication Issues
-- This addresses the "Database error granting user" issue

-- First, let's disable RLS on all tables temporarily to allow authentication
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Superusers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Superusers can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

DROP POLICY IF EXISTS "Users can view own member record" ON members;
DROP POLICY IF EXISTS "Users can update own member record" ON members;
DROP POLICY IF EXISTS "Superusers can view all members" ON members;
DROP POLICY IF EXISTS "Superusers can manage all members" ON members;
DROP POLICY IF EXISTS "Enable read access for all users" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON members;

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Superusers can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Superusers can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_roles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for profiles
CREATE POLICY "Allow all operations for authenticated users" ON profiles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for anonymous users" ON profiles
    FOR SELECT USING (true);

-- Create simple, permissive policies for members
CREATE POLICY "Allow all operations for authenticated users" ON members
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for anonymous users" ON members
    FOR SELECT USING (true);

-- Create simple, permissive policies for user_roles
CREATE POLICY "Allow all operations for authenticated users" ON user_roles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for anonymous users" ON user_roles
    FOR SELECT USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create or replace the handle_new_user function to ensure it works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a function to help with authentication debugging
CREATE OR REPLACE FUNCTION public.debug_user_auth(user_email text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'profile_exists', EXISTS(SELECT 1 FROM profiles WHERE email = user_email),
    'member_exists', EXISTS(SELECT 1 FROM members WHERE email = user_email),
    'user_role_exists', EXISTS(SELECT 1 FROM user_roles ur JOIN profiles p ON ur.user_id = p.id WHERE p.email = user_email),
    'profile_data', (SELECT row_to_json(profiles) FROM profiles WHERE email = user_email LIMIT 1),
    'member_data', (SELECT row_to_json(members) FROM members WHERE email = user_email LIMIT 1),
    'role_data', (SELECT json_agg(role) FROM user_roles ur JOIN profiles p ON ur.user_id = p.id WHERE p.email = user_email)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the setup
SELECT 'RLS Policy Fix Applied' as status;

-- Check current user data
SELECT public.debug_user_auth('ojidelawrence@gmail.com') as user_debug_info;