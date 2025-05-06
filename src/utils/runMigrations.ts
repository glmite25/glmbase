import { supabase } from '@/integrations/supabase/client';
import fs from 'fs';
import path from 'path';

/**
 * Runs database migrations in order
 */
export async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // First, ensure the migrations table exists
    const migrationTrackerSql = fs.readFileSync(
      path.join(process.cwd(), 'migrations', 'migration_tracker.sql'),
      'utf8'
    );
    
    const { error: trackerError } = await supabase.rpc('exec_sql', {
      sql_string: migrationTrackerSql
    });
    
    if (trackerError) {
      console.error('Error setting up migration tracker:', trackerError);
      return;
    }

    // Get list of migrations that have been applied
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('migrations')
      .select('name');
      
    if (fetchError) {
      console.error('Error fetching applied migrations:', fetchError);
      return;
    }

    const appliedMigrationNames = appliedMigrations?.map(m => m.name) || [];
    
    // Define migrations in order
    const migrations = [
      { name: 'add_indexes', file: 'add_indexes.sql' },
      { name: 'standardize_roles', file: 'standardize_roles.sql' },
      { name: 'add_constraints', file: 'add_constraints.sql' }
    ];

    // Run each migration if not already applied
    for (const migration of migrations) {
      if (!appliedMigrationNames.includes(`${migration.name}_001`)) {
        console.log(`Applying migration: ${migration.name}`);
        
        const migrationSql = fs.readFileSync(
          path.join(process.cwd(), 'migrations', migration.file),
          'utf8'
        );
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_string: migrationSql
        });
        
        if (error) {
          console.error(`Error applying migration ${migration.name}:`, error);
        } else {
          console.log(`Successfully applied migration: ${migration.name}`);
        }
      } else {
        console.log(`Migration already applied: ${migration.name}`);
      }
    }

    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

/**
 * Checks if a specific migration has been applied
 * @param migrationName The name of the migration to check
 * @returns True if the migration has been applied, false otherwise
 */
export async function isMigrationApplied(migrationName: string): Promise<boolean> {
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
