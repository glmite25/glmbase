import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔐 Testing Supabase Authentication');
console.log('==================================');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Create a simple client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  try {
    console.log('🧪 Testing basic connection...');
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth connection failed:', error.message);
      return;
    }
    
    console.log('✅ Auth connection successful');
    console.log('Current session:', data.session ? 'Active' : 'None');
    
    // Test database connection
    console.log('🗄️  Testing database connection...');
    
    const { data: profiles, error: dbError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test members table
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    
    if (membersError) {
      console.error('❌ Members table error:', membersError.message);
    } else {
      console.log('✅ Members table accessible');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testAuth()
  .then(() => {
    console.log('✨ Authentication test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });