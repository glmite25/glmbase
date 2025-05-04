-- This file contains SQL to create a trigger that automatically adds new users to the members table
-- Run this in the Supabase SQL editor

-- Function to handle new profile creation and sync to members table
CREATE OR REPLACE FUNCTION public.sync_profile_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user already exists in the members table
  IF NOT EXISTS (
    SELECT 1 FROM public.members WHERE email = NEW.email
  ) THEN
    -- Insert the new user into the members table
    INSERT INTO public.members (
      fullname,
      email,
      category,
      churchunit,
      assignedto,
      phone,
      address,
      isactive,
      joindate,
      userid
    )
    VALUES (
      NEW.full_name,
      NEW.email,
      'Others', -- Default category
      NEW.church_unit,
      NEW.assigned_pastor,
      NEW.phone,
      NEW.address,
      true, -- isactive
      CURRENT_DATE, -- joindate
      NEW.id -- userid (links to auth.users)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add new profiles to the members table
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_members();

-- Trigger to update members when profiles are updated
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW 
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR 
        OLD.full_name IS DISTINCT FROM NEW.full_name OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.address IS DISTINCT FROM NEW.address)
  EXECUTE FUNCTION public.sync_profile_to_members();

-- Function to sync existing profiles to members table
CREATE OR REPLACE FUNCTION public.sync_all_profiles_to_members()
RETURNS TEXT AS $$
DECLARE
  profile_count INTEGER := 0;
  member_count INTEGER := 0;
  synced_count INTEGER := 0;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO member_count FROM public.members;
  
  -- Insert profiles that don't exist in members table
  WITH profiles_to_sync AS (
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.church_unit,
      p.assigned_pastor,
      p.phone,
      p.address
    FROM 
      public.profiles p
    LEFT JOIN 
      public.members m ON LOWER(p.email) = LOWER(m.email)
    WHERE 
      m.email IS NULL
      AND p.email IS NOT NULL
  )
  INSERT INTO public.members (
    fullname,
    email,
    category,
    churchunit,
    assignedto,
    phone,
    address,
    isactive,
    joindate,
    userid
  )
  SELECT
    pts.full_name,
    pts.email,
    'Others', -- Default category
    pts.church_unit,
    pts.assigned_pastor,
    pts.phone,
    pts.address,
    true, -- isactive
    CURRENT_DATE, -- joindate
    pts.id -- userid
  FROM
    profiles_to_sync pts;
  
  GET DIAGNOSTICS synced_count = ROW_COUNT;
  
  RETURN 'Sync complete. Profiles: ' || profile_count || ', Members: ' || member_count || ', Newly synced: ' || synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this function to sync all existing profiles to members table
-- SELECT public.sync_all_profiles_to_members();
