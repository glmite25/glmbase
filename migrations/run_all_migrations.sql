-- This script runs all migrations in the correct order
-- You can run this script directly in the Supabase SQL Editor

-- First, create the migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Create a function to record a migration
CREATE OR REPLACE FUNCTION record_migration(migration_name VARCHAR, migration_description TEXT)
RETURNS VOID AS $FUNCTION_BODY$
BEGIN
    INSERT INTO migrations (name, description)
    VALUES (migration_name, migration_description);
END;
$FUNCTION_BODY$ LANGUAGE plpgsql;

-- Create a function to check if a migration has been applied
CREATE OR REPLACE FUNCTION is_migration_applied(migration_name VARCHAR)
RETURNS BOOLEAN AS $FUNCTION_BODY$
DECLARE
    migration_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM migrations WHERE name = migration_name) INTO migration_exists;
    RETURN migration_exists;
END;
$FUNCTION_BODY$ LANGUAGE plpgsql;

-- Migration 1: Add indexes
DO $MIGRATION_BLOCK$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_indexes_001') THEN
        -- members table indexes
        CREATE INDEX IF NOT EXISTS idx_members_fullname ON members (fullname);
        CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
        CREATE INDEX IF NOT EXISTS idx_members_category ON members (category);
        CREATE INDEX IF NOT EXISTS idx_members_assignedto ON members (assignedto);
        CREATE INDEX IF NOT EXISTS idx_members_churchunit ON members (churchunit);
        CREATE INDEX IF NOT EXISTS idx_members_isactive ON members (isactive);

        -- Add a GIN index for the churchunits array to enable efficient array operations
        CREATE INDEX IF NOT EXISTS idx_members_churchunits ON members USING GIN (churchunits);

        -- profiles table indexes
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
        CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles (full_name);
        CREATE INDEX IF NOT EXISTS idx_profiles_church_unit ON profiles (church_unit);
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

        -- user_roles table indexes
        CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles (role);

        -- Record this migration
        PERFORM record_migration('add_indexes_001', 'Add indexes to improve query performance');
    END IF;
END $MIGRATION_BLOCK$;

-- Migration 2: Standardize roles
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

        -- Create a function to handle role deletion
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

-- Migration 3: Add constraints
DO $MIGRATION_BLOCK$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'add_constraints_001') THEN
        -- Add foreign key constraint for members.assignedto
        ALTER TABLE members
        ADD CONSTRAINT fk_members_assignedto
        FOREIGN KEY (assignedto)
        REFERENCES members(id)
        ON DELETE SET NULL;

        -- Add check constraint for valid email format
        ALTER TABLE members
        ADD CONSTRAINT check_members_email_format
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

        ALTER TABLE profiles
        ADD CONSTRAINT check_profiles_email_format
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

        -- Add check constraint for valid phone format (allowing various formats)
        ALTER TABLE members
        ADD CONSTRAINT check_members_phone_format
        CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)\.]{7,20}$');

        ALTER TABLE profiles
        ADD CONSTRAINT check_profiles_phone_format
        CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)\.]{7,20}$');

        -- Add check constraint for valid categories
        ALTER TABLE members
        ADD CONSTRAINT check_members_category
        CHECK (category IN ('Members', 'Pastors', 'Workers', 'Visitors', 'Partners'));

        -- Create a function to validate churchunits array
        CREATE OR REPLACE FUNCTION validate_churchunits()
        RETURNS TRIGGER AS $FUNCTION_BODY$
        DECLARE
            valid_units TEXT[] := ARRAY['3hmedia', '3hmusic', '3hmovies', '3hsecurity', 'discipleship', 'praisefeet', 'tof', 'cloventongues'];
            unit TEXT;
        BEGIN
            -- Skip validation if churchunits is NULL
            IF NEW.churchunits IS NULL THEN
                RETURN NEW;
            END IF;
            
            -- Check each unit in the array
            FOREACH unit IN ARRAY NEW.churchunits
            LOOP
                IF NOT (unit = ANY(valid_units)) THEN
                    RAISE EXCEPTION 'Invalid church unit: %', unit;
                END IF;
            END LOOP;
            
            RETURN NEW;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql;

        -- Create a trigger to validate churchunits
        DROP TRIGGER IF EXISTS trigger_validate_churchunits ON members;
        CREATE TRIGGER trigger_validate_churchunits
        BEFORE INSERT OR UPDATE OF churchunits ON members
        FOR EACH ROW
        EXECUTE FUNCTION validate_churchunits();

        -- Add a trigger to automatically update the updated_at timestamp
        CREATE OR REPLACE FUNCTION update_modified_column()
        RETURNS TRIGGER AS $FUNCTION_BODY$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql;

        -- Create triggers for updated_at on members
        DROP TRIGGER IF EXISTS trigger_update_members_modtime ON members;
        CREATE TRIGGER trigger_update_members_modtime
        BEFORE UPDATE ON members
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();

        -- Record this migration
        PERFORM record_migration('add_constraints_001', 'Add constraints to ensure data integrity');
    END IF;
END $MIGRATION_BLOCK$;

-- Show applied migrations
SELECT name, applied_at, description FROM migrations ORDER BY applied_at;
