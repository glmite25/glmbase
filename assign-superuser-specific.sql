-- Assign Superuser Role to Specific User ID
-- Run this in Supabase SQL Editor

-- Step 1: Check if the user exists in profiles
SELECT 'Checking user profile...' as step;
SELECT id, email FROM public.profiles WHERE id = '47c693aa-e85c-4450-8d35-250aa4c61587';

-- Step 2: Create profile if it doesn't exist (for ojidelawrence@gmail.com)
INSERT INTO public.profiles (id, email, created_at, updated_at)
VALUES ('47c693aa-e85c-4450-8d35-250aa4c61587', 'ojidelawrence@gmail.com', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 3: Assign superuser role to the specific user
INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
VALUES ('47c693aa-e85c-4450-8d35-250aa4c61587', 'superuser', NOW(), 'manual_setup')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Verify the assignment
SELECT 'Superuser role assignment complete' as status;

-- Show the user profile
SELECT 'User Profile:' as info, id, email, created_at 
FROM public.profiles 
WHERE id = '47c693aa-e85c-4450-8d35-250aa4c61587';

-- Show the user role
SELECT 'User Role:' as info, user_id, role, assigned_at, assigned_by 
FROM public.user_roles 
WHERE user_id = '47c693aa-e85c-4450-8d35-250aa4c61587';

-- Test the is_superuser function
SELECT 'Testing is_superuser function:' as info, 
       public.is_superuser('47c693aa-e85c-4450-8d35-250aa4c61587') as is_superuser_result;