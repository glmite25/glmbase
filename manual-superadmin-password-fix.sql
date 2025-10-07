-- Manual Superadmin Password Fix
-- Run this in your Supabase SQL Editor
-- Task 3: Fix superadmin account in auth.users table

-- Step 1: Check current state
SELECT 
    'BEFORE UPDATE - Current superadmin record' as status,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    created_at,
    updated_at,
    banned_until IS NULL as account_active
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Step 2: Update the password and ensure proper settings
UPDATE auth.users 
SET 
    encrypted_password = crypt('Fa-#8rC6DRTkd$5', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW(),
    banned_until = NULL,
    recovery_sent_at = NULL,
    email_change_sent_at = NULL
WHERE email = 'ojidelawrence@gmail.com';

-- Step 3: Verify the update
SELECT 
    'AFTER UPDATE - Updated superadmin record' as status,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    created_at,
    updated_at,
    banned_until IS NULL as account_active,
    encrypted_password IS NOT NULL as has_password,
    length(encrypted_password) as password_length
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Step 4: Confirm the fix was successful
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Task 3 completed - Superadmin auth.users record fixed'
        ELSE 'ERROR: Superadmin account not found'
    END as task_3_result
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com'
AND email_confirmed_at IS NOT NULL
AND banned_until IS NULL
AND encrypted_password IS NOT NULL;