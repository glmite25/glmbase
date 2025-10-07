-- Fix Superadmin Account in auth.users Table
-- Task 3: Update auth.users record for ojidelawrence@gmail.com
-- with correct password and ensure proper confirmation status

-- First, let's check the current state
SELECT 
    'Current superadmin auth.users record' as check_type,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    created_at,
    banned_until IS NULL as account_active
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Update the superadmin account with correct password and ensure email is confirmed
UPDATE auth.users 
SET 
    encrypted_password = crypt('Fa-#8rC6DRTkd$5', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW(),
    -- Ensure account is not banned
    banned_until = NULL,
    -- Clear any lockout attempts
    recovery_sent_at = NULL,
    email_change_sent_at = NULL
WHERE email = 'ojidelawrence@gmail.com';

-- Verify the update
SELECT 
    'Updated superadmin auth.users record' as check_type,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    created_at,
    updated_at,
    banned_until IS NULL as account_active,
    recovery_sent_at IS NULL as no_recovery_pending,
    email_change_sent_at IS NULL as no_email_change_pending
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Additional verification: Check if the password was encrypted properly
SELECT 
    'Password encryption verification' as check_type,
    email,
    encrypted_password IS NOT NULL as has_encrypted_password,
    length(encrypted_password) as password_length,
    encrypted_password LIKE '$2%' as uses_bcrypt
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';

-- Show summary of what was fixed
SELECT 
    'Task 3 Summary' as summary,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Superadmin account found and updated'
        ELSE 'ERROR: Superadmin account not found'
    END as result,
    COUNT(*) as records_updated
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com'
AND email_confirmed_at IS NOT NULL
AND banned_until IS NULL;