/**
 * Check .env Configuration
 * Verify that your Supabase keys are correct
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Checking .env Configuration');
console.log('==============================');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Current Configuration:');
console.log('--------------------------');

// Check URL
if (supabaseUrl) {
  console.log('✅ SUPABASE_URL: Set');
  console.log(`   ${supabaseUrl}`);
} else {
  console.log('❌ SUPABASE_URL: Missing');
}

// Check Anon Key
if (supabaseAnonKey) {
  console.log('✅ ANON_KEY: Set');
  console.log(`   ${supabaseAnonKey.substring(0, 20)}...`);
  
  // Decode JWT to check role
  try {
    const payload = JSON.parse(atob(supabaseAnonKey.split('.')[1]));
    console.log(`   Role: ${payload.role}`);
    if (payload.role !== 'anon') {
      console.log('   ⚠️  Warning: This should be "anon" role');
    }
  } catch (e) {
    console.log('   ⚠️  Warning: Invalid JWT format');
  }
} else {
  console.log('❌ ANON_KEY: Missing');
}

// Check Service Key
if (supabaseServiceKey) {
  console.log('✅ SERVICE_KEY: Set');
  console.log(`   ${supabaseServiceKey.substring(0, 20)}...`);
  
  // Decode JWT to check role
  try {
    const payload = JSON.parse(atob(supabaseServiceKey.split('.')[1]));
    console.log(`   Role: ${payload.role}`);
    if (payload.role !== 'service_role') {
      console.log('   ❌ ERROR: This should be "service_role", not "' + payload.role + '"');
    }
  } catch (e) {
    console.log('   ⚠️  Warning: Invalid JWT format');
  }
} else {
  console.log('❌ SERVICE_KEY: Missing');
}

// Check if keys are the same (common mistake)
if (supabaseAnonKey && supabaseServiceKey) {
  if (supabaseAnonKey === supabaseServiceKey) {
    console.log('\n❌ CRITICAL ERROR: Anon key and Service key are the same!');
    console.log('You need to get the actual service_role key from Supabase dashboard');
  } else {
    console.log('\n✅ Keys are different (good)');
  }
}

console.log('\n🔍 Validation Results:');
console.log('----------------------');

let allGood = true;

if (!supabaseUrl) {
  console.log('❌ Missing VITE_SUPABASE_URL');
  allGood = false;
}

if (!supabaseAnonKey) {
  console.log('❌ Missing VITE_SUPABASE_ANON_KEY');
  allGood = false;
}

if (!supabaseServiceKey) {
  console.log('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  allGood = false;
}

if (supabaseAnonKey && supabaseServiceKey && supabaseAnonKey === supabaseServiceKey) {
  console.log('❌ Anon key and Service key are identical');
  allGood = false;
}

// Check JWT roles
if (supabaseAnonKey) {
  try {
    const anonPayload = JSON.parse(atob(supabaseAnonKey.split('.')[1]));
    if (anonPayload.role !== 'anon') {
      console.log('❌ Anon key has wrong role: ' + anonPayload.role);
      allGood = false;
    }
  } catch (e) {
    console.log('❌ Anon key is not a valid JWT');
    allGood = false;
  }
}

if (supabaseServiceKey) {
  try {
    const servicePayload = JSON.parse(atob(supabaseServiceKey.split('.')[1]));
    if (servicePayload.role !== 'service_role') {
      console.log('❌ Service key has wrong role: ' + servicePayload.role);
      allGood = false;
    }
  } catch (e) {
    console.log('❌ Service key is not a valid JWT');
    allGood = false;
  }
}

if (allGood) {
  console.log('✅ All configuration looks correct!');
  console.log('\n📱 Next step: Run diagnosis script');
  console.log('node diagnose-and-fix-signin.js');
} else {
  console.log('\n🔧 Configuration Issues Found');
  console.log('=============================');
  console.log('To fix your .env file:');
  console.log('1. Go to https://app.supabase.com');
  console.log('2. Select your project');
  console.log('3. Go to Settings → API');
  console.log('4. Copy the correct keys:');
  console.log('   - Project URL → VITE_SUPABASE_URL');
  console.log('   - anon public → VITE_SUPABASE_ANON_KEY');
  console.log('   - service_role → SUPABASE_SERVICE_ROLE_KEY');
  console.log('5. Make sure they are different keys!');
}

console.log('\n📋 Expected .env format:');
console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
console.log('VITE_SUPABASE_ANON_KEY=eyJ...anon_key_here');
console.log('SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role_key_here');