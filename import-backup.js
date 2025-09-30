import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
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

async function importBackup(backupFilePath) {
  try {
    console.log('📂 Reading backup file:', backupFilePath);
    
    if (!fs.existsSync(backupFilePath)) {
      console.error('❌ Backup file not found:', backupFilePath);
      return;
    }
    
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    console.log(`📊 Backup file size: ${(backupContent.length / 1024).toFixed(2)} KB`);
    
    // If it's a JSON backup (common for Supabase exports)
    if (backupFilePath.endsWith('.json')) {
      try {
        const backupData = JSON.parse(backupContent);
        console.log('📋 JSON backup detected');
        console.log('Available tables:', Object.keys(backupData));
        
        // Import members if available
        if (backupData.members && Array.isArray(backupData.members)) {
          console.log(`👥 Importing ${backupData.members.length} members...`);
          
          // Process in batches to avoid timeout
          const batchSize = 50;
          for (let i = 0; i < backupData.members.length; i += batchSize) {
            const batch = backupData.members.slice(i, i + batchSize);
            console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(backupData.members.length/batchSize)}`);
            
            const { data, error } = await supabase
              .from('members')
              .upsert(batch, { onConflict: 'email' });
            
            if (error) {
              console.warn(`⚠️  Batch ${Math.floor(i/batchSize) + 1} had issues:`, error.message);
            } else {
              console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} imported successfully`);
            }
          }
        }
        
        // Import other tables if available
        for (const [tableName, tableData] of Object.entries(backupData)) {
          if (tableName !== 'members' && Array.isArray(tableData) && tableData.length > 0) {
            console.log(`📊 Found ${tableData.length} records for table: ${tableName}`);
            // You can add specific import logic for other tables here
          }
        }
        
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON backup:', jsonError.message);
      }
    }
    
    // If it's a SQL backup
    else if (backupFilePath.endsWith('.sql')) {
      console.log('🗃️  SQL backup detected');
      console.log('📋 Please run this SQL in your Supabase dashboard SQL editor:');
      console.log('=====================================');
      console.log(backupContent.substring(0, 1000) + '...');
      console.log('=====================================');
      console.log('💡 Copy the full content and paste it in Supabase Dashboard > SQL Editor');
    }
    
    // If it's a CSV backup
    else if (backupFilePath.endsWith('.csv')) {
      console.log('📊 CSV backup detected');
      const lines = backupContent.split('\n');
      const headers = lines[0].split(',');
      console.log('CSV headers:', headers);
      console.log(`CSV rows: ${lines.length - 1}`);
      
      // Convert CSV to JSON for import
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim();
          });
          csvData.push(row);
        }
      }
      
      if (csvData.length > 0) {
        console.log(`📦 Importing ${csvData.length} records from CSV...`);
        const { data, error } = await supabase
          .from('members')
          .upsert(csvData, { onConflict: 'email' });
        
        if (error) {
          console.error('❌ CSV import failed:', error.message);
        } else {
          console.log('✅ CSV import successful');
        }
      }
    }
    
    else {
      console.log('❓ Unknown backup format. Showing first 500 characters:');
      console.log(backupContent.substring(0, 500));
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  }
}

// Usage
const backupFile = process.argv[2];
if (!backupFile) {
  console.log('📖 Usage: node import-backup.js <backup-file-path>');
  console.log('📖 Example: node import-backup.js ./backup.json');
  console.log('📖 Supported formats: .json, .sql, .csv');
  process.exit(1);
}

console.log('📥 GLM Database Backup Import');
console.log('============================');

importBackup(backupFile)
  .then(() => {
    console.log('✨ Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });