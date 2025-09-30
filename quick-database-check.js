/**
 * Quick database check to see what's set up and what's missing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Quick Database Check');
console.log('=======================');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function quickCheck() {
  console.log('📊 Database Status:');
  console.log('-------------------');
  
  // Check auth users
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.log('❌ Auth system:', error.message);
    } else {
      console.log(`✅ Auth system: ${users.users.length} users found`);
      
      const ojideUser = users.users.find(u => u.email === 'ojidelawrence@gmail.com');
      if (ojideUser) {
        console.log('  👤 ojidelawrence@gmail.com: EXISTS');
        console.log(`     - Confirmed: ${ojideUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`     - Created: ${new Date(ojideUser.created_at).toLocaleDateString()}`);
      } else {
        console.log('  ❌ ojidelawrence@gmail.com: NOT FOUND');
      }
    }
  } catch (e) {
    console.log('❌ Auth system: Connection failed');
  }
  
  // Check tables
  const tables = ['profiles', 'user_roles', 'members'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': Accessible`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': Error - ${e.message}`);
    }
  }
  
  console.log('\n🔧 Recommended Actions:');
  console.log('------------------------');
  
  // Check if ojide user exists
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const ojideExists = users.users.some(u => u.email === 'ojidelawrence@gmail.com');
    
    if (!ojideExists) {
      console.log('1. ⚡ Create ojide account: node setup-ojide-account.js');
    } else {
      console.log('1. ✅ Ojide account exists');
    }
  } catch (e) {
    console.log('1. ❌ Cannot check users - fix service role key first');
  }
  
  // Check if tables exist
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('2. ⚡ Setup database: node run-database-setup.js');
    } else {
      console.log('2. ✅ Database tables exist');
    }
  } catch (e) {
    console.log('2. ⚡ Setup database: node run-database-setup.js');
  }
  
  console.log('3. ⚡ Fix superadmin functions: node complete-superadmin-fix.js');
  console.log('4. 🌐 Try signing in at your website');
  
  console.log('\n💡 Quick Fix Order:');
  console.log('1. node run-database-setup.js');
  console.log('2. node setup-ojide-account.js');
  console.log('3. node complete-superadmin-fix.js');
  console.log('4. Try signing in with ojidelawrence@gmail.com');
}

quickCheck();