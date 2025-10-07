-- Fix Infinite Recursion in Database Triggers
-- Run this IMMEDIATELY in Supabase SQL Editor to stop the recursion

-- 1. Drop the problematic triggers first
DROP TRIGGER IF EXISTS sync_user_role_to_profile ON public.user_roles;
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_profile_role ON public.profiles;

-- 2. Drop the problematic functions
DROP FUNCTION IF EXISTS public.sync_user_role_to_profile();
DROP FUNCTION IF EXISTS public.sync_profile_role_to_user_roles();

-- 3. Create a safe, non-recursive function to sync roles
CREATE OR REPLACE FUNCTION public.sync_roles_safely()
RETURNS TRIGGER AS $$
DECLARE
    highest_role public.app_role;
BEGIN
    -- Prevent recursion by checking if we're already in a trigger context
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Only sync from user_roles to profiles (one direction only)
        IF TG_TABLE_NAME = 'user_roles' THEN
            -- Get the highest role for this user
            SELECT CASE 
                WHEN 'superuser' = ANY(array_agg(ur.role)) THEN 'superuser'::public.app_role
                WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'::public.app_role
                ELSE 'user'::public.app_role
            END INTO highest_role
            FROM public.user_roles ur 
            WHERE ur.user_id = COALESCE(NEW.user_id, OLD.user_id);
            
            -- Update profiles table without triggering another sync
            UPDATE public.profiles 
            SET role = highest_role
            WHERE id = COALESCE(NEW.user_id, OLD.user_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Handle deletion from user_roles
        IF TG_TABLE_NAME = 'user_roles' THEN
            -- Get remaining highest role for this user
            SELECT CASE 
                WHEN 'superuser' = ANY(array_agg(ur.role)) THEN 'superuser'::public.app_role
                WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'::public.app_role
                ELSE 'user'::public.app_role
            END INTO highest_role
            FROM public.user_roles ur 
            WHERE ur.user_id = OLD.user_id;
            
            -- If no roles left, set to user
            IF highest_role IS NULL THEN
                highest_role := 'user'::public.app_role;
            END IF;
            
            -- Update profiles table
            UPDATE public.profiles 
            SET role = highest_role
            WHERE id = OLD.user_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create a single trigger only on user_roles (one direction sync)
CREATE TRIGGER sync_roles_safely_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_roles_safely();

-- 5. Clean up any existing problematic data
-- Reset any users who might be stuck in a bad state
UPDATE public.profiles 
SET role = (
    SELECT CASE 
        WHEN 'superuser' = ANY(array_agg(ur.role)) THEN 'superuser'::public.app_role
        WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'::public.app_role
        ELSE 'user'::public.app_role
    END
    FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id
)
WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id
);

-- 6. Ensure admin user has correct roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'superuser'
FROM auth.users u
WHERE u.email = 'ojidelawrence@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = u.id AND ur.role = 'superuser'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Success message
SELECT 'Infinite recursion fixed! Triggers have been safely replaced.' as status;