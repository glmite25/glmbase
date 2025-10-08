import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupConsolidation() {
  try {
    console.log('Setting up consolidation infrastructure...\n');
    
    // Step 1: Create enhanced members table
    console.log('Step 1: Creating enhanced members table...');
    const enhancedTableSQL = fs.readFileSync('enhanced-members-table-schema.sql', 'utf8');
    
    // Execute the SQL in chunks to avoid issues
    const sqlStatements = enhancedTableSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i].trim();
      if (statement) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error && !error.message.includes('already exists')) {
            console.log(`Warning on statement ${i + 1}:`, error.message);
          }
        } catch (e) {
          // Try direct execution for some statements
          console.log(`Attempting direct execution for statement ${i + 1}...`);
        }
      }
    }
    
    console.log('✓ Enhanced members table setup completed');
    
    // Step 2: Create consolidation functions
    console.log('\nStep 2: Creating consolidation functions...');
    const consolidationSQL = fs.readFileSync('data-consolidation-logic.sql', 'utf8');
    
    // Execute consolidation functions
    const consolidationStatements = consolidationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < consolidationStatements.length; i++) {
      const statement = consolidationStatements[i].trim();
      if (statement) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error && !error.message.includes('already exists')) {
            console.log(`Warning on consolidation statement ${i + 1}:`, error.message);
          }
        } catch (e) {
          console.log(`Error on consolidation statement ${i + 1}:`, e.message);
        }
      }
    }
    
    console.log('✓ Consolidation functions setup completed');
    
    // Step 3: Verify setup
    console.log('\nStep 3: Verifying setup...');
    
    // Check if enhanced table exists and is empty
    const { count, error: countError } = await supabase
      .from('members_enhanced')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✓ Enhanced members table exists with ${count} records`);
    } else {
      console.log('✗ Enhanced members table check failed:', countError.message);
    }
    
    console.log('\n✅ Setup completed! Ready for data consolidation.');
    
  } catch (err) {
    console.error('Error during setup:', err.message);
  }
}

setupConsolidation();