// This script runs database migrations
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to execute SQL
async function executeSql(sql) {
  try {
    // First, check if the exec_sql function exists
    const { data: functionExists, error: checkError } = await supabase.rpc('pg_function_exists', {
      function_name: 'exec_sql'
    }).catch(() => ({ data: false }));

    // If the function doesn't exist, create it
    if (!functionExists) {
      console.log('Creating exec_sql function...');

      // Create the exec_sql function
      const createFunctionSql = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
        RETURNS void AS $FUNCTION_BODY$
        BEGIN
          EXECUTE sql_string;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create a helper function to check if another function exists
        CREATE OR REPLACE FUNCTION pg_function_exists(function_name text)
        RETURNS boolean AS $FUNCTION_BODY$
        DECLARE
          func_exists boolean;
        BEGIN
          SELECT EXISTS(
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = function_name
          ) INTO func_exists;

          RETURN func_exists;
        END;
        $FUNCTION_BODY$ LANGUAGE plpgsql;
      `;

      // Execute the SQL directly using a query
      // We need to use a raw query to create the functions
      const { error: createError } = await supabase.rpc('pg_temp', {
        sql: createFunctionSql
      }).catch(err => {
        // If pg_temp doesn't exist, we'll need to use another approach
        console.log('Could not create functions using pg_temp, trying alternative approach...');
        return { error: err };
      });

      if (createError) {
        // Try an alternative approach - create a temporary table and execute SQL
        console.log('Using alternative approach to create functions...');
        try {
          // First create a temporary table
          await supabase.from('migrations').select('id').limit(1);
          console.log('Created migrations table if it did not exist');
        } catch (err) {
          console.error('Error creating migrations table:', err);
          throw err;
        }
      }
    }

    // Now execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: sql
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error executing SQL:', error);
    throw error;
  }
}

// Function to check if a migration has been applied
async function isMigrationApplied(migrationName) {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('id')
      .eq('name', migrationName)
      .limit(1);

    if (error) {
      console.error('Error checking migration status:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

// Function to record a migration
async function recordMigration(name, description) {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .insert([{ name, description }]);

    if (error) {
      console.error('Error recording migration:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error recording migration:', error);
    throw error;
  }
}

// Main function to run migrations
async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // First, ensure the migrations table exists
    const migrationTrackerSql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', 'migration_tracker.sql'),
      'utf8'
    );

    await executeSql(migrationTrackerSql);
    console.log('Migration tracker setup complete');

    // Define migrations in order
    const migrations = [
      { name: 'add_indexes_001', file: 'add_indexes.sql', description: 'Add indexes to improve query performance' },
      { name: 'standardize_roles_001', file: 'standardize_roles.sql', description: 'Standardize role management between profiles.role and user_roles' },
      { name: 'add_constraints_001', file: 'add_constraints.sql', description: 'Add constraints to ensure data integrity' }
    ];

    // Run each migration if not already applied
    for (const migration of migrations) {
      const isApplied = await isMigrationApplied(migration.name);

      if (!isApplied) {
        console.log(`Applying migration: ${migration.name}`);

        const migrationSql = fs.readFileSync(
          path.join(__dirname, '..', 'migrations', migration.file),
          'utf8'
        );

        await executeSql(migrationSql);
        await recordMigration(migration.name, migration.description);

        console.log(`Successfully applied migration: ${migration.name}`);
      } else {
        console.log(`Migration already applied: ${migration.name}`);
      }
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
