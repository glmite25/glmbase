-- Enhanced Profile Synchronization
-- This script ensures profile updates sync to members table

-- Step 1: Create function to sync profile changes to members table
CREATE OR REPLACE FUNCTION public.sync_profile_to_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Update corresponding member record when profile is updated
    UPDATE public.members 
    SET 
        fullname = COALESCE(NEW.full_name, OLD.full_name, members.fullname),
        phone = COALESCE(NEW.phone, members.phone),
        address = COALESCE(NEW.address, members.address),
        churchunit = COALESCE(NEW.church_unit, members.churchunit),
        updated_at = NOW()
    WHERE user_id = NEW.id;
    
    -- If no member record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.members (
            user_id,
            email,
            fullname,
            phone,
            address,
            churchunit,
            category,
            isactive,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.full_name, NEW.email),
            NEW.phone,
            NEW.address,
            NEW.church_unit,
            'Members',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            fullname = COALESCE(EXCLUDED.fullname, members.fullname),
            phone = COALESCE(EXCLUDED.phone, members.phone),
            address = COALESCE(EXCLUDED.address, members.address),
            churchunit = COALESCE(EXCLUDED.churchunit, members.churchunit),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger for profile updates
DROP TRIGGER IF EXISTS trigger_sync_profile_to_member ON public.profiles;
CREATE TRIGGER trigger_sync_profile_to_member
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_member();

-- Step 3: Create function to sync member changes back to profiles
CREATE OR REPLACE FUNCTION public.sync_member_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if the member has a user_id (linked to auth user)
    IF NEW.user_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET 
            full_name = COALESCE(NEW.fullname, profiles.full_name),
            phone = COALESCE(NEW.phone, profiles.phone),
            address = COALESCE(NEW.address, profiles.address),
            church_unit = COALESCE(NEW.churchunit, profiles.church_unit),
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- If no profile exists, create one
        IF NOT FOUND THEN
            INSERT INTO public.profiles (
                id,
                email,
                full_name,
                phone,
                address,
                church_unit,
                created_at,
                updated_at
            )
            VALUES (
                NEW.user_id,
                NEW.email,
                NEW.fullname,
                NEW.phone,
                NEW.address,
                NEW.churchunit,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
                phone = COALESCE(EXCLUDED.phone, profiles.phone),
                address = COALESCE(EXCLUDED.address, profiles.address),
                church_unit = COALESCE(EXCLUDED.church_unit, profiles.church_unit),
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger for member updates
DROP TRIGGER IF EXISTS trigger_sync_member_to_profile ON public.members;
CREATE TRIGGER trigger_sync_member_to_profile
    AFTER INSERT OR UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.sync_member_to_profile();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_profile_to_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_member_to_profile() TO authenticated;

-- Step 6: Create a function to manually sync all profiles to members
CREATE OR REPLACE FUNCTION public.manual_sync_all_profiles_to_members()
RETURNS JSONB AS $$
DECLARE
    sync_count INTEGER := 0;
    error_count INTEGER := 0;
    profile_record RECORD;
BEGIN
    -- Loop through all profiles and sync to members
    FOR profile_record IN 
        SELECT * FROM public.profiles 
    LOOP
        BEGIN
            -- Update or insert member record
            INSERT INTO public.members (
                user_id,
                email,
                fullname,
                phone,
                address,
                churchunit,
                category,
                isactive,
                created_at,
                updated_at
            )
            VALUES (
                profile_record.id,
                profile_record.email,
                COALESCE(profile_record.full_name, profile_record.email),
                profile_record.phone,
                profile_record.address,
                profile_record.church_unit,
                'Members',
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                fullname = COALESCE(EXCLUDED.fullname, members.fullname),
                phone = COALESCE(EXCLUDED.phone, members.phone),
                address = COALESCE(EXCLUDED.address, members.address),
                churchunit = COALESCE(EXCLUDED.churchunit, members.churchunit),
                updated_at = NOW();
            
            sync_count := sync_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE 'Error syncing profile %: %', profile_record.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'synced_count', sync_count,
        'error_count', error_count,
        'message', format('Synced %s profiles, %s errors', sync_count, error_count)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant execute permission
GRANT EXECUTE ON FUNCTION public.manual_sync_all_profiles_to_members() TO authenticated;

-- Step 8: Test the sync function
SELECT 'Testing profile-member sync:' as test;
SELECT public.manual_sync_all_profiles_to_members() as sync_result;
