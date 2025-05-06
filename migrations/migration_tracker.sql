-- Create a migrations table to track applied migrations

-- First, check if the migrations table exists
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