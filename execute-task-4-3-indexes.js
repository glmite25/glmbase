// Execute Task 4.3: Database Index Optimization
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeIndexOptimization() {
  console.log('📊 Executing Task 4.3: Database Index Optimization...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('task-4-3-optimize-enhanced-indexes.sql', 'utf8');
    
    // Split SQL into individual statements (rough split by semicolon)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      try {
        // Use raw SQL execution
        const { data, error } = await supabase
          .from('pg_stat_activity')
          .select('*')
          .limit(0); // This is just to test connection
          
        // For actual SQL execution, we need to use a different approach
        // Let's try using the SQL editor approach
        const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (response.ok) {
          successCount++;
          if (i % 10 === 0) {
            console.log(`✅ Executed ${i + 1}/${statements.length} statements...`);
          }
        } else {
          errorCount++;
          const errorText = await response.text();
          console.log(`⚠️ Statement ${i + 1} failed: ${errorText.substring(0, 100)}...`);
        }
        
      } catch (err) {
        errorCount++;
        console.log(`❌ Error executing statement ${i + 1}:`, err.message.substring(0, 100));
      }
    }
    
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);
    
  } catch (error) {
    console.error('❌ Failed to execute index optimization:', error);
  }
}

executeIndexOptimization();