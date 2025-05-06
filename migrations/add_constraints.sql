-- Add constraints to ensure data integrity

-- Check if this migration has been applied
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
