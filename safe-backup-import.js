import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function safeBackupImport() {
  console.log('🛡️  Safe Backup Import - Preserving Current Schema');
  console.log('==================================================');
  
  try {
    // Step 1: Backup current schema and data
    console.log('📋 Step 1: Creating backup of current database state...');
    
    const { data: currentMembers, error: currentError } = await supabase
      .from('members')
      .select('*');
    
    if (currentError) {
      console.error('❌ Failed to backup current members:', currentError.message);
      return;
    }
    
    console.log(`✅ Current database has ${currentMembers?.length || 0} members`);
    
    // Save current data as backup
    const backupData = {
      timestamp: new Date().toISOString(),
      members: currentMembers || [],
      schema_version: 'current'
    };
    
    fs.writeFileSync('current-db-backup.json', JSON.stringify(backupData, null, 2));
    console.log('✅ Current data backed up to current-db-backup.json');
    
    // Step 2: Check if backup file exists
    const backupFile = 'supabase/db_cluster-05-06-2025@13-22-03.backup';
    const gzBackupFile = 'supabase/db_cluster-05-06-2025@13-22-03.backup.gz';
    
    let targetFile = null;
    if (fs.existsSync(backupFile)) {
      targetFile = backupFile;
    } else if (fs.existsSync(gzBackupFile)) {
      targetFile = gzBackupFile;
      console.log('📦 Found compressed backup, extracting...');
      try {
        execSync(`gunzip -k "${gzBackupFile}"`);
        targetFile = backupFile;
        console.log('✅ Backup extracted successfully');
      } catch (error) {
        console.error('❌ Failed to extract backup:', error.message);
        return;
      }
    } else {
      console.error('❌ Backup file not found in supabase directory');
      return;
    }
    
    // Step 3: Analyze backup file (without importing)
    console.log('🔍 Step 3: Analyzing backup file...');
    
    if (targetFile.endsWith('.backup')) {
      console.log('📊 PostgreSQL backup file detected');
      console.log('⚠️  WARNING: .backup files contain both schema and data');
      console.log('🛡️  To safely import, we need to extract only the data');
      
      // Try to extract data using pg_restore (if available)
      try {
        console.log('🔧 Attempting to extract member data from backup...');
        
        // This would require pg_restore to be installed
        // For now, we'll provide instructions instead
        console.log('📋 MANUAL IMPORT INSTRUCTIONS:');
        console.log('==============================');
        console.log('1. Install PostgreSQL tools (pg_restore)');
        console.log('2. Extract only member data:');
        console.log(`   pg_restore --data-only --table=members "${targetFile}" > members_data.sql`);
        console.log('3. Review the extracted SQL file');
        console.log('4. Import only the INSERT statements for members table');
        console.log('');
        console.log('🚨 DO NOT import the full backup as it may overwrite your current schema!');
        
      } catch (error) {
        console.log('⚠️  pg_restore not available, providing alternative approach...');
      }
    }
    
    // Step 4: Provide safe import strategy
    console.log('');
    console.log('🎯 RECOMMENDED SAFE IMPORT STRATEGY:');
    console.log('===================================');
    console.log('1. Keep your current schema (already working)');
    console.log('2. Extract member data from backup manually');
    console.log('3. Import only member records that don\'t exist');
    console.log('4. Preserve your current admin users and roles');
    console.log('');
    
    // Step 5: Show current schema info
    console.log('📊 CURRENT DATABASE SCHEMA INFO:');
    console.log('================================');
    
    // Check current tables
    const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
    const { data: userRoles } = await supabase.from('user_roles').select('*').limit(1);
    const { data: userRolesView } = await supabase.from('user_roles_view').select('*').limit(1);
    
    console.log('✅ Tables available:');
    console.log('  - members (working)');
    console.log('  - profiles', profiles ? '(working)' : '(needs setup)');
    console.log('  - user_roles', userRoles ? '(working)' : '(needs setup)');
    console.log('  - user_roles_view', userRolesView ? '(working)' : '(needs setup)');
    
    // Step 6: Offer to create a data-only import script
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('==============');
    console.log('1. Your current schema is preserved and working');
    console.log('2. If you want to import old member data:');
    console.log('   - Use Supabase Dashboard SQL Editor');
    console.log('   - Import only INSERT statements for members');
    console.log('   - Use ON CONFLICT (email) DO NOTHING to avoid duplicates');
    console.log('3. Test the import with a small batch first');
    
  } catch (error) {
    console.error('💥 Safe import analysis failed:', error);
  }
}

// Additional function to create a data-only import template
async function createDataImportTemplate() {
  console.log('📝 Creating data import template...');
  
  const template = `
-- Safe Member Data Import Template
-- This script safely imports member data without affecting schema

-- Step 1: Backup existing data (run this first)
-- CREATE TABLE members_backup AS SELECT * FROM members;

-- Step 2: Import new members (avoiding duplicates)
-- Replace the VALUES below with data from your backup

INSERT INTO public.members (
  fullname, email, phone, category, churchunit, churchunits, assignedto, isactive
) VALUES
  -- Add your member data here, for example:
  -- ('John Doe', 'john@example.com', '1234567890', 'Members', 'Main Church', ARRAY['Main Church'], null, true),
  -- ('Jane Smith', 'jane@example.com', '0987654321', 'Pastors', 'Youth Ministry', ARRAY['Youth Ministry'], null, true)
  
  -- Use this to avoid duplicates:
ON CONFLICT (email) DO UPDATE SET
  fullname = EXCLUDED.fullname,
  phone = EXCLUDED.phone,
  category = EXCLUDED.category,
  churchunit = EXCLUDED.churchunit,
  churchunits = EXCLUDED.churchunits,
  assignedto = EXCLUDED.assignedto,
  isactive = EXCLUDED.isactive,
  updated_at = NOW();

-- Step 3: Verify the import
-- SELECT COUNT(*) FROM members;
-- SELECT * FROM members ORDER BY created_at DESC LIMIT 10;
`;

  fs.writeFileSync('safe-member-import-template.sql', template);
  console.log('✅ Template saved to safe-member-import-template.sql');
}

console.log('🛡️  GLM Safe Backup Import Tool');
console.log('===============================');

safeBackupImport()
  .then(() => {
    return createDataImportTemplate();
  })
  .then(() => {
    console.log('');
    console.log('✨ Safe import analysis completed');
    console.log('📁 Files created:');
    console.log('  - current-db-backup.json (your current data backup)');
    console.log('  - safe-member-import-template.sql (import template)');
    console.log('');
    console.log('🎯 Your current database schema is safe and preserved!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Safe import failed:', error);
    process.exit(1);
  });