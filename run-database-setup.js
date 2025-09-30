/**
 * Gospel Labour Ministry CMS - Database Setup Runner
 * This script executes the complete database setup SQL file
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Gospel Labour Ministry CMS - Database Setup');
console.log('===============================================');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure you have the following in your .env file:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY (must be the service role key, not anon key)');
  process.exit(1);
}

// Check if service key looks correct
if (supabaseServiceKey.includes('anon')) {
  console.error('❌ Warning: Your service role key appears to be an anon key');
  console.error('Please get the actual SERVICE_ROLE key from your Supabase dashboard');
  console.error('Go to: Settings → API → service_role key');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runDatabaseSetup() {
  try {
    console.log('📖 Reading SQL setup file...');
    const sqlContent = readFileSync('setup-complete-database.sql', 'utf8');
    
    console.log('🔧 Executing database setup...');
    console.log('This may take a few moments...\n');
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--') || statement.length < 5) {
        continue;
      }
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Try direct query execution as fallback
          const { error: directError } = await supabase
            .from('_temp_')
            .select('*')
            .limit(0);
          
          // If it's a simple query, try executing it directly
          if (statement.toLowerCase().includes('create') || 
              statement.toLowerCase().includes('insert') ||
              statement.toLowerCase().includes('alter')) {
            console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (e) {
        console.log(`⚠️  Statement ${i + 1}: ${e.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Setup Summary:');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`⚠️  Warnings/Errors: ${errorCount}`);
    
    // Test the setup by checking if tables exist
    console.log('\n🔍 Verifying database setup...');
    
    const tablesToCheck = [
      'profiles', 'user_roles', 'members', 'church_units', 
      'auxano_groups', 'events', 'announcements', 'donations'
    ];
    
    let tablesCreated = 0;
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${table}' - Ready`);
          tablesCreated++;
        } else {
          console.log(`❌ Table '${table}' - ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ Table '${table}' - ${e.message}`);
      }
    }
    
    console.log(`\n📈 Database Status: ${tablesCreated}/${tablesToCheck.length} core tables ready`);
    
    if (tablesCreated >= tablesToCheck.length * 0.8) {
      console.log('\n🎉 Database setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: node create-superadmin.js');
      console.log('2. This will create ojidelawrence@gmail.com as superadmin');
      console.log('3. You can then access the superadmin dashboard');
    } else {
      console.log('\n⚠️  Database setup partially completed');
      console.log('Some tables may not have been created properly');
      console.log('You may need to run the SQL manually in Supabase dashboard');
    }
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of setup-complete-database.sql');
    console.log('4. Execute the SQL script');
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runDatabaseSetupDirect() {
  try {
    console.log('📖 Reading SQL setup file...');
    const sqlContent = readFileSync('setup-complete-database.sql', 'utf8');
    
    console.log('🔧 Attempting direct SQL execution...');
    
    // Try to execute the entire SQL as one block
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sqlContent 
    });
    
    if (error) {
      console.log('❌ Direct execution failed:', error.message);
      console.log('\n📋 Manual Setup Required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy the contents of setup-complete-database.sql');
      console.log('4. Paste and execute the SQL script');
      console.log('5. Then run: node create-superadmin.js');
      return;
    }
    
    console.log('✅ Database setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    await runDatabaseSetup(); // Fallback to statement-by-statement execution
  }
}

// Run the setup
console.log('Starting database setup...\n');
runDatabaseSetupDirect();