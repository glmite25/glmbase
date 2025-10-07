-- Assign Superuser Role to Admin Account
-- Run this in Supabase SQL Editor

-- Step 1: Check if ojidelawrence@gmail.com exists in profiles
SELECT 'Checking for admin profile...' as step;
SELECT id, email FROM public.profiles WHERE email = 'ojidelawrence@gmail.com';

-- Step 2: If the profile doesn't exist, we need to create it first
-- You'll need to get the actual User ID from Supabase Dashboard > Authentication > Users
-- Look for ojidelawrence@gmail.com and copy the User ID

-- Step 3: Insert the profile if it doesn't exist (replace USER_ID_HERE with actual ID)
-- INSERT INTO public.profiles (id, email, created_at, updated_at)
-- VALUES ('USER_ID_HERE', 'ojidelawrence@gmail.com', NOW(), NOW())
-- ON CONFLICT (id) DO NOTHING;

-- Step 4: Assign superuser role (replace USER_ID_HERE with actual ID)
-- INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
-- VALUES ('USER_ID_HERE', 'superuser', NOW(), 'manual_setup')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Alternative: Use one of the existing users as superadmin
-- Pick one of these existing user IDs and assign superuser role:

-- Option 1: gidadobamidele@gmail.com
INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
VALUES ('f49cd31d-9565-4260-958e-9b8907188bbd', 'superuser', NOW(), 'manual_setup')
ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2: samuelogunleye196@gmail.com  
-- INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
-- VALUES ('c3be0592-adc3-4c64-90ba-8244e2d8f004', 'superuser', NOW(), 'manual_setup')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 3: dev.samadeyemi@gmail.com
-- INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
-- VALUES ('10ef46d8-93cd-4715-aef0-b88d5aaac8d3', 'superuser', NOW(), 'manual_setup')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was assigned
SELECT 'Superuser role assignment complete' as status;
SELECT user_id, role, assigned_at FROM public.user_roles WHERE role = 'superuser';