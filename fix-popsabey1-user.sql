-- Fix popsabey1@gmail.com user migration
-- This script handles the existing record and updates it properly

-- Log the start of user fix
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'USER_FIX_START',
    0,
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting fix for popsabey1@gmail.com user',
        'email', 'popsabey1@gmail.com',
        'timestamp', NOW()
    )
);

-- Simple approach: Update existing record or insert if not exists
DO $$
DECLARE
    auth_user_id UUID;
    user_exists BOOLEAN := FALSE;
BEGIN
    -- Get the auth user ID if it exists
    SELECT id INTO auth_user_id
    FROM auth.users 
    WHERE email = 'popsabey1@gmail.com';
    
    IF FOUND THEN
        user_exists := TRUE;
        RAISE NOTICE 'Found auth user: %', auth_user_id;
    ELSE
        RAISE NOTICE 'No auth user found for popsabey1@gmail.com';
    END IF;
    
    -- Handle profiles table
    IF user_exists THEN
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            role, 
            created_at, 
            updated_at
        ) VALUES (
            auth_user_id,
            'popsabey1@gmail.com',
            'Biodun Abey',
            'superuser',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'superuser',
            full_name = COALESCE(profiles.full_name, 'Biodun Abey'),
            email = 'popsabey1@gmail.com',
            updated_at = NOW();
        
        RAISE NOTICE 'Profile handled for user: %', auth_user_id;
        
        -- Add superuser role
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (auth_user_id, 'superuser', NOW())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Superuser role ensured for user: %', auth_user_id;
    END IF;
    
    -- Handle members_enhanced table (works with or without auth user)
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
        auth_user_id, -- Will be NULL if no auth user exists
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
        user_id = COALESCE(EXCLUDED.user_id, members_enhanced.user_id),
        role = 'superuser',
        category = 'Pastors',
        isactive = true,
        membership_status = 'active',
        fullname = COALESCE(members_enhanced.fullname, 'Biodun Abey'),
        updated_at = NOW();
    
    RAISE NOTICE 'Member record handled for: popsabey1@gmail.com';
    
END $$;

-- Verification queries
SELECT 
    'AUTH_USER' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'popsabey1@gmail.com') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status,
    (SELECT id::text FROM auth.users WHERE email = 'popsabey1@gmail.com') as user_id;

SELECT 
    'PROFILE' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM public.profiles p 
                     JOIN auth.users u ON p.id = u.id 
                     WHERE u.email = 'popsabey1@gmail.com') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status,
    (SELECT p.role FROM public.profiles p 
     JOIN auth.users u ON p.id = u.id 
     WHERE u.email = 'popsabey1@gmail.com') as role;

SELECT 
    'MEMBER' as table_name,
    'EXISTS' as status,
    role,
    category,
    isactive,
    user_id::text
FROM public.members_enhanced 
WHERE email = 'popsabey1@gmail.com';

SELECT 
    'USER_ROLES' as table_name,
    CASE WHEN EXISTS(SELECT 1 FROM public.user_roles ur 
                     JOIN auth.users u ON ur.user_id = u.id 
                     WHERE u.email = 'popsabey1@gmail.com' AND ur.role = 'superuser') 
         THEN 'EXISTS' ELSE 'NOT_FOUND' END as status;

-- Log the completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'USER_FIX_COMPLETE',
    1,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Completed fix for popsabey1@gmail.com user',
        'email', 'popsabey1@gmail.com',
        'timestamp', NOW()
    )
);

SELECT 'popsabey1@gmail.com user fix completed successfully!' as result;