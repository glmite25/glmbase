#!/usr/bin/env node

/**
 * Database Backup Generator Script
 * 
 * This script generates comprehensive backup scripts for both members and profiles tables
 * with all data, creating both SQL dumps and JSON exports for safety.
 * 
 * Requirements covered: Backup generation for migration safety
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class DatabaseBackupGenerator {
  constructor() {
    this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = `database-backups-${this.backupTimestamp}`;
    
    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Generate SQL backup script for a table
   */
  async generateSQLBackup(tableName) {
    console.log(`Generating SQL backup for ${tableName} table...`);
    
    try {
      // Get all data from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log(`⚠️  No data found in ${tableName} table`);
        return null;
      }

      // Generate SQL INSERT statements
      const columns = Object.keys(data[0]);
      const tableSqlPath = path.join(this.backupDir, `${tableName}_backup.sql`);
      
      let sqlContent = `-- Backup for ${tableName} table\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Records: ${data.length}\n\n`;
      
      // Create backup table
      sqlContent += `-- Create backup table\n`;
      sqlContent += `DROP TABLE IF EXISTS ${tableName}_backup;\n`;
      sqlContent += `CREATE TABLE ${tableName}_backup AS SELECT * FROM ${tableName} WHERE 1=0;\n\n`;
      
      // Insert data
      sqlContent += `-- Insert backup data\n`;
      
      for (const record of data) {
        const values = columns.map(col => {
          const value = record[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
          }
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (Array.isArray(value)) return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          return value;
        });
        
        sqlContent += `INSERT INTO ${tableName}_backup (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      
      // Add restore instructions
      sqlContent += `\n-- Restore instructions:\n`;
      sqlContent += `-- To restore data: INSERT INTO ${tableName} SELECT * FROM ${tableName}_backup;\n`;
      sqlContent += `-- To replace data: TRUNCATE ${tableName}; INSERT INTO ${tableName} SELECT * FROM ${tableName}_backup;\n`;
      
      fs.writeFileSync(tableSqlPath, sqlContent);
      console.log(`✓ SQL backup saved: ${tableSqlPath} (${data.length} records)`);
      
      return tableSqlPath;
    } catch (error) {
      console.error(`Error generating SQL backup for ${tableName}:`, error.message);
      return null;
    }
  }

  /**
   * Generate JSON backup for a table
   */
  async generateJSONBackup(tableName) {
    console.log(`Generating JSON backup for ${tableName} table...`);
    
    try {
      // Get all data from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log(`⚠️  No data found in ${tableName} table`);
        return null;
      }

      const jsonBackup = {
        table: tableName,
        backup_timestamp: new Date().toISOString(),
        record_count: data.length,
        data: data
      };

      const jsonPath = path.join(this.backupDir, `${tableName}_backup.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(jsonBackup, null, 2));
      
      console.log(`✓ JSON backup saved: ${jsonPath} (${data.length} records)`);
      return jsonPath;
    } catch (error) {
      console.error(`Error generating JSON backup for ${tableName}:`, error.message);
      return null;
    }
  }

  /**
   * Generate restore script
   */
  generateRestoreScript(backupFiles) {
    console.log('Generating restore script...');
    
    const restoreScriptPath = path.join(this.backupDir, 'restore_backups.sql');
    
    let restoreContent = `-- Database Restore Script\n`;
    restoreContent += `-- Generated: ${new Date().toISOString()}\n`;
    restoreContent += `-- Use this script to restore data from backups\n\n`;
    
    restoreContent += `-- WARNING: This will replace all current data!\n`;
    restoreContent += `-- Make sure to backup current state before running\n\n`;
    
    for (const [tableName, files] of Object.entries(backupFiles)) {
      if (files.sql) {
        restoreContent += `-- Restore ${tableName} table\n`;
        restoreContent += `\\i ${path.basename(files.sql)}\n`;
        restoreContent += `TRUNCATE ${tableName};\n`;
        restoreContent += `INSERT INTO ${tableName} SELECT * FROM ${tableName}_backup;\n`;
        restoreContent += `DROP TABLE ${tableName}_backup;\n\n`;
      }
    }
    
    fs.writeFileSync(restoreScriptPath, restoreContent);
    console.log(`✓ Restore script saved: ${restoreScriptPath}`);
    
    return restoreScriptPath;
  }

  /**
   * Generate emergency rollback script
   */
  generateRollbackScript() {
    console.log('Generating emergency rollback script...');
    
    const rollbackScriptPath = path.join(this.backupDir, 'emergency_rollback.sql');
    
    let rollbackContent = `-- Emergency Rollback Script\n`;
    rollbackContent += `-- Generated: ${new Date().toISOString()}\n`;
    rollbackContent += `-- Use this script in case of migration failure\n\n`;
    
    rollbackContent += `-- Step 1: Stop all application connections\n`;
    rollbackContent += `-- Step 2: Run the restore script\n`;
    rollbackContent += `-- Step 3: Verify data integrity\n\n`;
    
    rollbackContent += `-- Quick data verification queries\n`;
    rollbackContent += `SELECT 'members' as table_name, COUNT(*) as record_count FROM members;\n`;
    rollbackContent += `SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles;\n\n`;
    
    rollbackContent += `-- Check for data consistency\n`;
    rollbackContent += `SELECT \n`;
    rollbackContent += `  COUNT(DISTINCT m.email) as unique_member_emails,\n`;
    rollbackContent += `  COUNT(DISTINCT p.email) as unique_profile_emails,\n`;
    rollbackContent += `  COUNT(*) as total_members\n`;
    rollbackContent += `FROM members m\n`;
    rollbackContent += `LEFT JOIN profiles p ON m.user_id = p.id;\n`;
    
    fs.writeFileSync(rollbackScriptPath, rollbackContent);
    console.log(`✓ Rollback script saved: ${rollbackScriptPath}`);
    
    return rollbackScriptPath;
  }

  /**
   * Generate backup manifest
   */
  generateBackupManifest(backupFiles, restoreScript, rollbackScript) {
    const manifestPath = path.join(this.backupDir, 'backup_manifest.json');
    
    const manifest = {
      backup_timestamp: this.backupTimestamp,
      backup_directory: this.backupDir,
      files: backupFiles,
      restore_script: restoreScript,
      rollback_script: rollbackScript,
      instructions: {
        restore: "Run restore_backups.sql to restore all data from backups",
        rollback: "Run emergency_rollback.sql in case of migration failure",
        verify: "Check backup_manifest.json for file integrity"
      }
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✓ Backup manifest saved: ${manifestPath}`);
    
    return manifestPath;
  }

  /**
   * Run complete backup generation
   */
  async runBackup() {
    console.log('💾 Starting comprehensive database backup generation...\n');
    
    try {
      const backupFiles = {};
      
      // Backup members table
      const membersSql = await this.generateSQLBackup('members');
      const membersJson = await this.generateJSONBackup('members');
      backupFiles.members = { sql: membersSql, json: membersJson };
      
      // Backup profiles table
      const profilesSql = await this.generateSQLBackup('profiles');
      const profilesJson = await this.generateJSONBackup('profiles');
      backupFiles.profiles = { sql: profilesSql, json: profilesJson };
      
      // Generate utility scripts
      const restoreScript = this.generateRestoreScript(backupFiles);
      const rollbackScript = this.generateRollbackScript();
      const manifest = this.generateBackupManifest(backupFiles, restoreScript, rollbackScript);
      
      console.log('\n✅ Database backup generation completed successfully!');
      console.log(`📁 Backup directory: ${this.backupDir}`);
      console.log(`📋 Manifest: ${manifest}`);
      
      return {
        backupDir: this.backupDir,
        backupFiles,
        restoreScript,
        rollbackScript,
        manifest
      };
    } catch (error) {
      console.error('\n❌ Backup generation failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other scripts
export { DatabaseBackupGenerator };

// Run backup generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new DatabaseBackupGenerator();
  generator.runBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}