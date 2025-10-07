-- MEMBER PROFILE MANAGEMENT FUNCTIONS
-- Run this AFTER implement-database-recommendations.sql completes successfully

-- ========================================
-- PART 1: GET MEMBER PROFILE FUNCTION
-- ========================================

-- Function to get complete member profile data
CREATE OR REPLACE FUNCTION public.get_member_profile(target_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    profile_data JSONB;
    user_id_to_fetch UUID;
BEGIN
    -- If no target_user_id provided, use current authenticated user
    user_id_to_fetch := COALESCE(target_user_id, auth.uid());
    
    -- Check if user exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.members 
        WHERE user_id = user_id_to_fetch AND isactive = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Member profile not found or inactive',
            'data', null
        );
    END IF;
    
    -- Get complete member profile data
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Profile retrieved successfully',
        'data', jsonb_build_object(
            'id', m.id,
            'user_id', m.user_id,
            'email', m.email,
            'fullname', m.fullname,
            'phone', m.phone,
            'address', m.address,
            'date_of_birth', m.date_of_birth,
            'gender', m.gender,
            'title', m.title,
            'category', m.category,
            'churchunit', m.churchunit,
            'churchunits', m.churchunits,
            'auxanogroup', m.auxanogroup,
            'assignedto', m.assignedto,
            'assigned_pastor_name', pastor.fullname,
            'notes', m.notes,
            'joindate', m.joindate,
            'isactive', m.isactive,
            'created_at', m.created_at,
            'updated_at', m.updated_at,
            'created_by', m.created_by,
            'updated_by', m.updated_by,
            -- Extended profile data from profiles table if it exists
            'bio', p.bio,
            'marital_status', p.marital_status,
            'occupation', p.occupation,
            'emergency_contact_name', p.emergency_contact_name,
            'emergency_contact_phone', p.emergency_contact_phone,
            'emergency_contact_relationship', p.emergency_contact_relationship,
            'city', p.city,
            'state', p.state,
            'postal_code', p.postal_code,
            'country', p.country,
            'profile_image_url', p.profile_image_url,
            'baptism_date', p.baptism_date,
            'baptism_location', p.baptism_location,
            'is_baptized', p.is_baptized,
            'membership_status', p.membership_status,
            'preferred_contact_method', p.preferred_contact_method,
            'skills_talents', p.skills_talents,
            'interests', p.interests,
            'genotype', p.genotype,
            -- User role information
            'roles', (
                SELECT COALESCE(array_agg(ur.role), ARRAY[]::public.app_role[])
                FROM public.user_roles ur 
                WHERE ur.user_id = m.user_id
            ),
            'is_super_admin', EXISTS(
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = m.user_id AND ur.role = 'superuser'
            ),
            'is_pastor', m.category = 'Pastors'
        )
    ) INTO profile_data
    FROM public.members m
    LEFT JOIN public.profiles p ON m.user_id = p.id
    LEFT JOIN public.members pastor ON m.assignedto = pastor.id
    WHERE m.user_id = user_id_to_fetch AND m.isactive = true;
    
    RETURN profile_data;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error retrieving profile: ' || SQLERRM,
            'data', null
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PART 2: UPDATE MEMBER PROFILE FUNCTION
-- ========================================

-- Function to update member profile data
CREATE OR REPLACE FUNCTION public.update_member_profile(
    target_user_id UUID DEFAULT NULL,
    profile_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    user_id_to_update UUID;
    is_super_admin BOOLEAN := false;
    is_self_update BOOLEAN := false;
    current_member RECORD;
    update_result JSONB;
BEGIN
    -- If no target_user_id provided, use current authenticated user
    user_id_to_update := COALESCE(target_user_id, auth.uid());
    
    -- Check if current user is super admin
    is_super_admin := EXISTS(
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
    );
    
    -- Check if user is updating their own profile
    is_self_update := (auth.uid() = user_id_to_update);
    
    -- Security check: only super admins can update other users' profiles
    IF NOT is_self_update AND NOT is_super_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: You can only update your own profile',
            'data', null
        );
    END IF;
    
    -- Get current member data
    SELECT * INTO current_member
    FROM public.members 
    WHERE user_id = user_id_to_update AND isactive = true;
    
    IF current_member IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Member profile not found or inactive',
            'data', null
        );
    END IF;
    
    -- Update members table (with restrictions for non-admin users)
    UPDATE public.members SET
        fullname = COALESCE(profile_data->>'fullname', fullname),
        phone = COALESCE(profile_data->>'phone', phone),
        address = COALESCE(profile_data->>'address', address),
        date_of_birth = COALESCE((profile_data->>'date_of_birth')::date, date_of_birth),
        gender = COALESCE(profile_data->>'gender', gender),
        title = COALESCE(profile_data->>'title', title),
        auxanogroup = COALESCE(profile_data->>'auxanogroup', auxanogroup),
        notes = CASE 
            WHEN is_super_admin THEN COALESCE(profile_data->>'notes', notes)
            ELSE notes -- Only admins can update notes
        END,
        -- Restricted fields (only super admins can update)
        category = CASE 
            WHEN is_super_admin THEN COALESCE((profile_data->>'category')::public.member_category, category)
            ELSE category
        END,
        churchunit = CASE 
            WHEN is_super_admin THEN COALESCE(profile_data->>'churchunit', churchunit)
            ELSE churchunit
        END,
        churchunits = CASE 
            WHEN is_super_admin THEN COALESCE(
                ARRAY(SELECT jsonb_array_elements_text(profile_data->'churchunits')), 
                churchunits
            )
            ELSE churchunits
        END,
        assignedto = CASE 
            WHEN is_super_admin THEN COALESCE((profile_data->>'assignedto')::uuid, assignedto)
            ELSE assignedto
        END,
        updated_at = NOW()
    WHERE user_id = user_id_to_update;
    
    -- Update or insert into profiles table for extended data
    INSERT INTO public.profiles (
        id, email, full_name, phone, address, church_unit, assigned_pastor,
        date_of_birth, gender, marital_status, occupation, bio,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        city, state, postal_code, country, profile_image_url,
        baptism_date, baptism_location, is_baptized, membership_status,
        preferred_contact_method, skills_talents, interests, genotype,
        created_at, updated_at
    ) VALUES (
        user_id_to_update,
        current_member.email,
        COALESCE(profile_data->>'fullname', current_member.fullname),
        COALESCE(profile_data->>'phone', current_member.phone),
        COALESCE(profile_data->>'address', current_member.address),
        current_member.churchunit,
        current_member.assignedto::text,
        COALESCE((profile_data->>'date_of_birth')::date, current_member.date_of_birth),
        COALESCE(profile_data->>'gender', current_member.gender),
        COALESCE(profile_data->>'marital_status', 'single'),
        COALESCE(profile_data->>'occupation', ''),
        COALESCE(profile_data->>'bio', ''),
        COALESCE(profile_data->>'emergency_contact_name', ''),
        COALESCE(profile_data->>'emergency_contact_phone', ''),
        COALESCE(profile_data->>'emergency_contact_relationship', ''),
        COALESCE(profile_data->>'city', ''),
        COALESCE(profile_data->>'state', ''),
        COALESCE(profile_data->>'postal_code', ''),
        COALESCE(profile_data->>'country', 'Nigeria'),
        COALESCE(profile_data->>'profile_image_url', ''),
        COALESCE((profile_data->>'baptism_date')::date, NULL),
        COALESCE(profile_data->>'baptism_location', ''),
        COALESCE((profile_data->>'is_baptized')::boolean, false),
        COALESCE(profile_data->>'membership_status', 'active'),
        COALESCE(profile_data->>'preferred_contact_method', 'email'),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(profile_data->'skills_talents')), 
            ARRAY[]::text[]
        ),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(profile_data->'interests')), 
            ARRAY[]::text[]
        ),
        COALESCE(profile_data->>'genotype', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(profile_data->>'fullname', EXCLUDED.full_name),
        phone = COALESCE(profile_data->>'phone', EXCLUDED.phone),
        address = COALESCE(profile_data->>'address', EXCLUDED.address),
        date_of_birth = COALESCE((profile_data->>'date_of_birth')::date, EXCLUDED.date_of_birth),
        gender = COALESCE(profile_data->>'gender', EXCLUDED.gender),
        marital_status = COALESCE(profile_data->>'marital_status', profiles.marital_status),
        occupation = COALESCE(profile_data->>'occupation', profiles.occupation),
        bio = COALESCE(profile_data->>'bio', profiles.bio),
        emergency_contact_name = COALESCE(profile_data->>'emergency_contact_name', profiles.emergency_contact_name),
        emergency_contact_phone = COALESCE(profile_data->>'emergency_contact_phone', profiles.emergency_contact_phone),
        emergency_contact_relationship = COALESCE(profile_data->>'emergency_contact_relationship', profiles.emergency_contact_relationship),
        city = COALESCE(profile_data->>'city', profiles.city),
        state = COALESCE(profile_data->>'state', profiles.state),
        postal_code = COALESCE(profile_data->>'postal_code', profiles.postal_code),
        country = COALESCE(profile_data->>'country', profiles.country),
        profile_image_url = COALESCE(profile_data->>'profile_image_url', profiles.profile_image_url),
        baptism_date = COALESCE((profile_data->>'baptism_date')::date, profiles.baptism_date),
        baptism_location = COALESCE(profile_data->>'baptism_location', profiles.baptism_location),
        is_baptized = COALESCE((profile_data->>'is_baptized')::boolean, profiles.is_baptized),
        membership_status = COALESCE(profile_data->>'membership_status', profiles.membership_status),
        preferred_contact_method = COALESCE(profile_data->>'preferred_contact_method', profiles.preferred_contact_method),
        skills_talents = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(profile_data->'skills_talents')), 
            profiles.skills_talents
        ),
        interests = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(profile_data->'interests')), 
            profiles.interests
        ),
        genotype = COALESCE(profile_data->>'genotype', profiles.genotype),
        updated_at = NOW();
    
    -- Return updated profile data
    SELECT public.get_member_profile(user_id_to_update) INTO update_result;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile updated successfully',
        'data', update_result->'data'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error updating profile: ' || SQLERRM,
            'data', null
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PART 3: GRANT PERMISSIONS
-- ========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_profile(UUID, JSONB) TO authenticated;

-- ========================================
-- PART 4: VERIFICATION
-- ========================================

SELECT 'MEMBER PROFILE FUNCTIONS CREATED SUCCESSFULLY!' as status;

-- Test the functions (optional - comment out if not needed)
-- SELECT 'Testing get_member_profile function:' as test_info;
-- SELECT public.get_member_profile();

SELECT 'Member profile management functions are ready for use!' as final_status;
