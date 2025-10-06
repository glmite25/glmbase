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

async function extractAndImportMembers() {
  console.log('👥 Extracting Members from Backup (Schema-Safe)');
  console.log('===============================================');
  
  try {
    // Check if we have pg_restore available
    let hasPgRestore = false;
    try {
      execSync('pg_restore --version', { stdio: 'ignore' });
      hasPgRestore = true;
      console.log('✅ pg_restore found - can extract data directly');
    } catch (error) {
      console.log('⚠️  pg_restore not found - will provide manual instructions');
    }
    
    const backupFile = 'supabase/db_cluster-05-06-2025@13-22-03.backup';
    
    if (!fs.existsSync(backupFile)) {
      console.error('❌ Backup file not found:', backupFile);
      return;
    }
    
    if (hasPgRestore) {
      console.log('🔧 Extracting member data from backup...');
      
      try {
        // Extract only members table data
        const extractCommand = `pg_restore --data-only --table=members --no-owner --no-privileges "${backupFile}"`;
        const memberData = execSync(extractCommand, { encoding: 'utf8' });
        
        // Save extracted SQL
        fs.writeFileSync('extracted-members.sql', memberData);
        console.log('✅ Member data extracted to extracted-members.sql');
        
        // Parse the SQL to understand the data structure
        console.log('📊 Analyzing extracted data...');
        const lines = memberData.split('\n');
        const insertLines = lines.filter(line => line.trim().startsWith('INSERT INTO'));
        
        console.log(`📈 Found ${insertLines.length} INSERT statements`);
        
        if (insertLines.length > 0) {
          console.log('📋 Sample data structure:');
          console.log(insertLines[0].substring(0, 200) + '...');
        }
        
        // Ask user if they want to proceed with import
        console.log('');
        console.log('🤔 Do you want to import this data? (This is safe - it won\'t affect your schema)');
        console.log('   The import will use ON CONFLICT to avoid duplicates');
        console.log('');
        console.log('   To proceed manually:');
        console.log('   1. Review extracted-members.sql');
        console.log('   2. Copy the INSERT statements');
        console.log('   3. Add "ON CONFLICT (email) DO NOTHING" to avoid duplicates');
        console.log('   4. Run in Supabase Dashboard SQL Editor');
        
      } catch (error) {
        console.error('❌ Failed to extract data:', error.message);
        console.log('💡 Trying alternative approach...');
        await manualExtractionInstructions();
      }
    } else {
      await manualExtractionInstructions();
    }
    
  } catch (error) {
    console.error('💥 Extraction failed:', error);
  }
}

async function manualExtractionInstructions() {
  console.log('📋 MANUAL EXTRACTION INSTRUCTIONS');
  console.log('=================================');
  console.log('');
  console.log('Since pg_restore is not available, here are alternative methods:');
  console.log('');
  console.log('METHOD 1: Using Supabase CLI');
  console.log('----------------------------');
  console.log('1. Install Supabase CLI: npm install -g supabase');
  console.log('2. Login: supabase login');
  console.log('3. Link project: supabase link --project-ref spbdnwkipawreftixvfu');
  console.log('4. Use supabase db dump to extract data');
  console.log('');
  console.log('METHOD 2: Manual Database Inspection');
  console.log('------------------------------------');
  console.log('1. Create a temporary Supabase project');
  console.log('2. Restore the backup there');
  console.log('3. Export members table as CSV');
  console.log('4. Import CSV to your current database');
  console.log('');
  console.log('METHOD 3: PostgreSQL Tools Installation');
  console.log('---------------------------------------');
  console.log('Windows: Download PostgreSQL from postgresql.org');
  console.log('Mac: brew install postgresql');
  console.log('Linux: sudo apt-get install postgresql-client');
  console.log('');
  console.log('After installation, run this script again.');
}

async function createSafeImportScript() {
  console.log('📝 Creating safe import script...');
  
  const script = `
-- Safe Member Import Script
-- This preserves your current schema and adds members safely

-- Step 1: Check current member count
SELECT 'Current members:' as info, COUNT(*) as count FROM members;

-- Step 2: Import members from backup (replace with actual data)
-- IMPORTANT: Replace the VALUES section with data from your backup

INSERT INTO public.members (
  id, fullname, email, phone, category, churchunit, churchunits, assignedto, isactive, created_at
) VALUES
  -- Paste your member data here from the backup
  -- Example format:
  -- ('uuid-here', 'John Doe', 'john@example.com', '1234567890', 'Members', 'Main Church', ARRAY['Main Church'], null, true, '2024-01-01T00:00:00Z'),
  
  -- Add more rows as needed...
  
-- Use this to handle conflicts (keeps existing data, adds new ones)
ON CONFLICT (email) DO NOTHING;

-- Step 3: Verify the import
SELECT 'After import:' as info, COUNT(*) as count FROM members;
SELECT 'New members added:' as info, COUNT(*) as count FROM members WHERE created_at > NOW() - INTERVAL '1 hour';

-- Step 4: Check for any issues
SELECT fullname, email, category, churchunit 
FROM members 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
`;

  fs.writeFileSync('safe-member-import.sql', script);
  console.log('✅ Safe import script saved to safe-member-import.sql');
}

console.log('👥 GLM Member Data Extractor');
console.log('============================');

extractAndImportMembers()
  .then(() => {
    return createSafeImportScript();
  })
  .then(() => {
    console.log('');
    console.log('✨ Extraction process completed');
    console.log('');
    console.log('🛡️  YOUR CURRENT DATABASE IS SAFE!');
    console.log('   - Schema preserved');
    console.log('   - Current members intact');
    console.log('   - Admin users preserved');
    console.log('');
    console.log('📁 Files created for safe import:');
    console.log('   - extracted-members.sql (if pg_restore worked)');
    console.log('   - safe-member-import.sql (template for manual import)');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Extraction failed:', error);
    process.exit(1);
  });