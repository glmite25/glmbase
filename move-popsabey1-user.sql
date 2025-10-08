-- Move popsabey1@gmail.com user to members and profiles tables
-- This script safely migrates the user data to the appropriate tables

-- Log the start of user migration
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'USER_MIGRATION_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting migration of popsabey1@gmail.com user',
        'email', 'popsabey1@gmail.com',
        'timestamp', NOW()
    )
);

-- First, let's check if the user exists in auth.users
DO $$
DECLARE
    user_record RECORD;
    user_exists BOOLEAN := FALSE;
    profile_exists BOOLEAN := FALSE;
    member_exists BOOLEAN := FALSE;
BEGIN
    -- Check if user exists in auth.users
    SELECT id, email, raw_user_meta_data
    INTO user_record
    FROM auth.users 
    WHERE email = 'popsabey1@gmail.com';
    
    IF FOUND THEN
        user_exists := TRUE;
        RAISE NOTICE 'Found user in auth.users: %', user_record.id;
        
        -- Check if profile already exists
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_record.id) INTO profile_exists;
        
        -- Check if member already exists (by email or user_id)
        SELECT EXISTS(
            SELECT 1 FROM public.members_enhanced 
            WHERE email = 'popsabey1@gmail.com' OR user_id = user_record.id
        ) INTO member_exists;
        
        -- Create or update profile using UPSERT
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            role, 
            created_at, 
            updated_at
        ) VALUES (
            user_record.id,
            'popsabey1@gmail.com',
            COALESCE(user_record.raw_user_meta_data->>'full_name', 'Biodun Abey'),
            'superuser',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'superuser',
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, 'Biodun Abey'),
            email = EXCLUDED.email,
            updated_at = NOW();
        
        RAISE NOTICE 'Upserted profile for user: %', user_record.id;
        
        -- Create or update member record using UPSERT
        INSERT INTO public.members_enhanced (
            user_id,
            email,
            fullname,
            category,
            role,
            isactive,
            membership_status,
            joindate,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            'popsabey1@gmail.com',
            COALESCE(user_record.raw_user_meta_data->>'full_name', 'Biodun Abey'),
            'Pastors',
            'superuser',
            true,
            'active',
            CURRENT_DATE,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            role = 'superuser',
            category = 'Pastors',
            isactive = true,
            membership_status = 'active',
            fullname = COALESCE(EXCLUDED.fullname, members_enhanced.fullname, 'Biodun Abey'),
            updated_at = NOW();
        
        RAISE NOTICE 'Upserted member record for user: %', user_record.id;
        
        -- Ensure user has superuser role in user_roles table
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_record.id, 'superuser', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Ensured superuser role for user: %', user_record.id;
        
    ELSE
        RAISE NOTICE 'User popsabey1@gmail.com not found in auth.users table';
        
        -- If user doesn't exist in auth.users, create/update member record without user_id using UPSERT
        INSERT INTO public.members_enhanced (
            email,
            fullname,
            category,
            role,
            isactive,
            membership_status,
            joindate,
            created_at,
            updated_at
        ) VALUES (
            'popsabey1@gmail.com',
            'Biodun Abey',
            'Pastors',
            'superuser',
            true,
            'active',
            CURRENT_DATE,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            role = 'superuser',
            category = 'Pastors',
            isactive = true,
            membership_status = 'active',
            fullname = COALESCE(members_enhanced.fullname, 'Biodun Abey'),
            updated_at = NOW();
        
        RAISE NOTICE 'Upserted member record without auth user for: popsabey1@gmail.com';
    END IF;
END $$;

-- Verify the migration results
SELECT 
    'VERIFICATION' as check_type,
    'AUTH_USER' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'popsabey1@gmail.com') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status,
    (SELECT id FROM auth.users WHERE email = 'popsabey1@gmail.com') as user_id;

SELECT 
    'VERIFICATION' as check_type,
    'PROFILE' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM public.profiles p 
                     JOIN auth.users u ON p.id = u.id 
                     WHERE u.email = 'popsabey1@gmail.com') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status,
    (SELECT p.role FROM public.profiles p 
     JOIN auth.users u ON p.id = u.id 
     WHERE u.email = 'popsabey1@gmail.com') as role;

SELECT 
    'VERIFICATION' as check_type,
    'MEMBER' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM public.members_enhanced WHERE email = 'popsabey1@gmail.com') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status,
    (SELECT role FROM public.members_enhanced WHERE email = 'popsabey1@gmail.com') as role,
    (SELECT category FROM public.members_enhanced WHERE email = 'popsabey1@gmail.com') as category;

SELECT 
    'VERIFICATION' as check_type,
    'USER_ROLES' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM public.user_roles ur 
                     JOIN auth.users u ON ur.user_id = u.id 
                     WHERE u.email = 'popsabey1@gmail.com' AND ur.role = 'superuser') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status;

-- Log the completion of user migration
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'USER_MIGRATION_COMPLETE',
    1,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Completed migration of popsabey1@gmail.com user',
        'email', 'popsabey1@gmail.com',
        'tables_updated', ARRAY['profiles', 'members_enhanced', 'user_roles'],
        'timestamp', NOW()
    )
);

-- Final success message
SELECT 'User popsabey1@gmail.com migration completed successfully!' as completion_status,
       'User has been added/updated in profiles, members_enhanced, and user_roles tables' as result,
       'User should now have superuser access' as note;