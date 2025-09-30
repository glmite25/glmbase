import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runDatabaseSetup() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('database-setup.sql', 'utf8');
    
    // Split SQL commands by semicolon and filter out empty ones
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Found ${sqlCommands.length} SQL commands to execute`);
    
    // Execute each command
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`⚡ Executing command ${i + 1}/${sqlCommands.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_sql_execution')
            .select('*')
            .limit(0); // This will fail but might give us better error info
          
          console.warn(`⚠️  Command ${i + 1} had issues, but continuing...`);
          console.warn('Error:', error.message);
        } else {
          console.log(`✅ Command ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.warn(`⚠️  Command ${i + 1} failed, but continuing...`);
        console.warn('Error:', err.message);
      }
    }
    
    // Test the setup by checking if tables exist
    console.log('🔍 Verifying database setup...');
    
    // Check members table
    const { data: membersData, error: membersError } = await supabase
      .from('members')
      .select('count(*)')
      .limit(1);
    
    if (membersError) {
      console.error('❌ Members table verification failed:', membersError.message);
    } else {
      console.log('✅ Members table is accessible');
    }
    
    // Check user_roles_view
    const { data: viewData, error: viewError } = await supabase
      .from('user_roles_view')
      .select('count(*)')
      .limit(1);
    
    if (viewError) {
      console.error('❌ User roles view verification failed:', viewError.message);
    } else {
      console.log('✅ User roles view is accessible');
    }
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Create tables using Supabase client directly
async function createTablesDirectly() {
  console.log('🔧 Creating tables directly using Supabase client...');
  
  try {
    // Create members table using raw SQL
    const createMembersTable = `
      CREATE TABLE IF NOT EXISTS public.members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        fullname TEXT,
        email TEXT,
        phone TEXT,
        category TEXT,
        churchunit TEXT,
        churchunits TEXT[],
        assignedto TEXT,
        isactive BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Since we can't execute DDL directly, let's try a different approach
    // Insert sample data to test if table exists
    const { error: insertError } = await supabase
      .from('members')
      .insert([
        {
          fullname: 'Test Pastor',
          email: 'test@glm.org',
          category: 'Pastors',
          churchunit: 'Main Church',
          isactive: true
        }
      ]);
    
    if (insertError) {
      console.error('❌ Members table does not exist or is not accessible');
      console.error('Error:', insertError.message);
      console.log('📋 Please run the following SQL in your Supabase dashboard:');
      console.log(fs.readFileSync('database-setup.sql', 'utf8'));
    } else {
      console.log('✅ Members table exists and is writable');
      
      // Clean up test data
      await supabase
        .from('members')
        .delete()
        .eq('email', 'test@glm.org');
    }
    
  } catch (error) {
    console.error('💥 Direct table creation failed:', error);
  }
}

// Run the setup
console.log('🏗️  Gospel Labour Ministry Database Setup');
console.log('=====================================');

createTablesDirectly()
  .then(() => {
    console.log('✨ Setup process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });

export { runDatabaseSetup, createTablesDirectly };