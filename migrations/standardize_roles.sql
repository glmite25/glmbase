-- Standardize role management between profiles.role and user_roles

-- Check if this migration has been applied
DO $MIGRATION_BLOCK$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'standardize_roles_001') THEN
        -- Create a function to sync roles between profiles and user_roles
        CREATE OR REPLACE FUNCTION sync_profile_role_to_user_roles()
        RETURNS TRIGGER AS $FUNCTION_BODY$
        BEGIN
            -- If role is being updated in profiles
            IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
                -- Delete existing roles for this user
                DELETE FROM user_roles WHERE user_id = NEW.id;

                -- Insert the new role
                IF NEW.role IS NOT NULL THEN
                    INSERT INTO user_roles (user_id, role)
                    VALUES (NEW.id, NEW.role::app_role);
                END IF;
            -- If a new profile is being inserted
            ELSIF TG_OP = 'INSERT' AND NEW.role IS NOT NULL THEN
                INSERT INTO user_roles (user_id, role)
                VALUES (NEW.id, NEW.role::app_role);
            END IF;

            RETURN NEW;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql;

        -- Create a trigger to sync roles when profiles are updated
        DROP TRIGGER IF EXISTS trigger_sync_profile_role ON profiles;
        CREATE TRIGGER trigger_sync_profile_role
        AFTER INSERT OR UPDATE OF role ON profiles
        FOR EACH ROW
        EXECUTE FUNCTION sync_profile_role_to_user_roles();

        -- Create a function to sync roles from user_roles to profiles
        CREATE OR REPLACE FUNCTION sync_user_roles_to_profile()
        RETURNS TRIGGER AS $FUNCTION_BODY$
        DECLARE
            highest_role app_role;
        BEGIN
            -- Find the highest role for this user
            SELECT role INTO highest_role
            FROM user_roles
            WHERE user_id = NEW.user_id
            ORDER BY CASE role
                WHEN 'superuser' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'moderator' THEN 3
                WHEN 'user' THEN 4
                ELSE 5
            END
            LIMIT 1;

            -- Update the profile with the highest role
            IF highest_role IS NOT NULL THEN
                UPDATE profiles
                SET role = highest_role::text
                WHERE id = NEW.user_id;
            END IF;

            RETURN NEW;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql;

        -- Create a trigger to sync roles when user_roles are updated
        DROP TRIGGER IF EXISTS trigger_sync_user_roles ON user_roles;
        CREATE TRIGGER trigger_sync_user_roles
        AFTER INSERT OR UPDATE OF role ON user_roles
        FOR EACH ROW
        EXECUTE FUNCTION sync_user_roles_to_profile();

        -- Create a trigger to handle role deletion
        CREATE OR REPLACE FUNCTION handle_user_role_deletion()
        RETURNS TRIGGER AS $FUNCTION_BODY$
        DECLARE
            highest_role app_role;
        BEGIN
            -- Find the highest remaining role for this user
            SELECT role INTO highest_role
            FROM user_roles
            WHERE user_id = OLD.user_id
            ORDER BY CASE role
                WHEN 'superuser' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'moderator' THEN 3
                WHEN 'user' THEN 4
                ELSE 5
            END
            LIMIT 1;

            -- Update the profile with the highest role or NULL if no roles remain
            UPDATE profiles
            SET role = highest_role::text
            WHERE id = OLD.user_id;

            RETURN OLD;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql;

        -- Create a trigger to handle role deletion
        DROP TRIGGER IF EXISTS trigger_handle_role_deletion ON user_roles;
        CREATE TRIGGER trigger_handle_role_deletion
        AFTER DELETE ON user_roles
        FOR EACH ROW
        EXECUTE FUNCTION handle_user_role_deletion();

        -- Sync existing data
        -- First, sync from profiles to user_roles
        INSERT INTO user_roles (user_id, role)
        SELECT id, role::app_role
        FROM profiles
        WHERE role IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = profiles.role::app_role
        );

        -- Record this migration
        PERFORM record_migration('standardize_roles_001', 'Standardize role management between profiles.role and user_roles');
    END IF;
END $MIGRATION_BLOCK$;
