#!/usr/bin/env node

// Simple script to run the database fix using the Supabase client
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jaicfvakzxfeijtuogir.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required');
  console.log('Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runDatabaseFix() {
  console.log('🚀 Running database fix for admin authentication...\n');

  try {
    // Read the SQL file
    const sql = readFileSync('./fix-admin-authentication.sql', 'utf8');
    
    // Split into individual statements and filter out comments
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} completed`);
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} error:`, err.message);
      }
    }

    console.log('\n🎉 Database fix completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Try logging in as an admin user');
    console.log('2. Check the browser console for any errors');
    console.log('3. Verify the admin dashboard loads properly');

  } catch (error) {
    console.error('❌ Failed to run database fix:', error.message);
    process.exit(1);
  }
}

runDatabaseFix();
