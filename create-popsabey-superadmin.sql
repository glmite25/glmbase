-- Create Popsabey as Super Admin
-- Run this in Supabase SQL Editor

-- Step 1: Check if user exists and get the actual user ID
DO $$
DECLARE
    user_id_var uuid;
    user_email text := 'popsabey1@gmail.com';
BEGIN
    -- Try to get the user ID from auth.users
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id_var IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please create the user first in Supabase Auth dashboard.', user_email;
        RAISE NOTICE 'Email: %', user_email;
        RAISE NOTICE 'Password: SuperAdmin123!';
        RAISE NOTICE 'Make sure to confirm the email when creating.';
    ELSE
        RAISE NOTICE 'Found user % with ID: %', user_email, user_id_var;
        
        -- Step 2: Clean up existing records
        DELETE FROM user_roles WHERE user_id = user_id_var;
        DELETE FROM members WHERE email = user_email;
        DELETE FROM profiles WHERE email = user_email;
        
        RAISE NOTICE 'Cleaned up existing records for %', user_email;
        
        -- Step 3: Confirm the user's email if not confirmed
        UPDATE auth.users 
        SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = user_id_var;
        
        RAISE NOTICE 'Email confirmed for user %', user_email;
        
        -- Step 4: Create profile record
        INSERT INTO profiles (
            id, 
            email, 
            full_name, 
            role, 
            church_unit, 
            country, 
            join_date, 
            membership_status, 
            preferred_contact_method,
            created_at, 
            updated_at
        ) VALUES (
            user_id_var,
            user_email,
            'Popsabey Admin',
            'superuser',
            'Administration',
            'Nigeria',
            CURRENT_DATE,
            'active',
            'email',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created profile record for %', user_email;
        
        -- Step 5: Create member record
        INSERT INTO members (
            user_id,
            email,
            fullname,
            category,
            isactive,
            created_at,
            updated_at
        ) VALUES (
            user_id_var,
            user_email,
            'Popsabey Admin',
            'Pastors',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created member record for %', user_email;
        
        -- Step 6: Create user role record
        INSERT INTO user_roles (
            user_id,
            role,
            created_at
        ) VALUES (
            user_id_var,
            'superuser',
            NOW()
        );
        
        RAISE NOTICE 'Created superuser role for %', user_email;
        
        -- Step 7: Temporarily disable RLS for testing
        ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
        ALTER TABLE members DISABLE ROW LEVEL SECURITY;
        ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Temporarily disabled RLS for testing';
        
        RAISE NOTICE '=== SETUP COMPLETE ===';
        RAISE NOTICE 'Email: %', user_email;
        RAISE NOTICE 'Password: SuperAdmin123!';
        RAISE NOTICE 'User ID: %', user_id_var;
        RAISE NOTICE 'Try signing in now!';
        
    END IF;
END $$;

-- Step 8: Verify the setup
SELECT 
    'Setup Verification' as check_type,
    (SELECT COUNT(*) FROM profiles WHERE email = 'popsabey1@gmail.com' AND role = 'superuser') as profile_count,
    (SELECT COUNT(*) FROM members WHERE email = 'popsabey1@gmail.com' AND isactive = true) as member_count,
    (SELECT COUNT(*) FROM user_roles ur JOIN profiles p ON ur.user_id = p.id WHERE p.email = 'popsabey1@gmail.com' AND ur.role = 'superuser') as role_count;

-- Show the created records
SELECT 'Profile Data' as type, id, email, full_name, role FROM profiles WHERE email = 'popsabey1@gmail.com'
UNION ALL
SELECT 'Member Data' as type, user_id::text, email, fullname, category FROM members WHERE email = 'popsabey1@gmail.com'
UNION ALL
SELECT 'Role Data' as type, user_id::text, 'popsabey1@gmail.com', 'N/A', role FROM user_roles WHERE user_id IN (SELECT id FROM profiles WHERE email = 'popsabey1@gmail.com');