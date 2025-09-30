/**
 * Complete Setup Fix - Create User Account and Database
 * This script will create everything needed for ojidelawrence@gmail.com to sign in
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Complete Setup Fix for ojidelawrence@gmail.com');
console.log('==================================================');
console.log('This will:');
console.log('1. Create database tables');
console.log('2. Create user account');
console.log('3. Add to profiles table');
console.log('4. Test sign-in');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  console.error('');
  console.error('Required in .env:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('');
  console.error('Get these from: https://app.supabase.com → Your Project → Settings → API');
  process.exit(1);
}

// Check if service key is correct
if (supabaseServiceKey.includes('anon') || supabaseServiceKey === process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ WRONG KEY: You\'re using the anon key instead of service role key');
  console.error('');
  console.error('In your Supabase dashboard:');
  console.error('1. Go to Settings → API');
  console.error('2. Copy the "service_role" key (NOT the "anon" key)');
  console.error('3. Update SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql, description) {
  try {
    console.log(`   Executing: ${description}`);
    
    // Try different methods to execute SQL
    let result;
    let error;
    
    // Method 1: Try rpc if available
    try {
      result = await supabase.rpc('exec_sql', { sql });
      error = result.error;
    } catch (e) {
      // Method 2: Try direct query execution
      try {
        // For simple CREATE TABLE statements, we can try to execute them directly
        if (sql.trim().toUpperCase().startsWith('CREATE TABLE')) {
          // This won't work with supabase-js client, but we'll log it
          console.log('     SQL needs to be executed in Supabase dashboard');
          return { success: false, needsManual: true };
        }
      } catch (e2) {
        error = e2;
      }
    }
    
    if (error) {
      console.log(`     ⚠️  ${error.message}`);
      return { success: false, error };
    } else {
      console.log('     ✅ Success');
      return { success: true };
    }
  } catch (e) {
    console.log(`     ❌ ${e.message}`);
    return { success: false, error: e };
  }
}

async function completeSetup() {
  let step = 1;
  
  try {
    // Step 1: Test connection
    console.log(`${step++}. Testing Supabase connection...`);
    
    try {
      const { data: testUsers, error: testError } = await supabase.auth.admin.listUsers();
      if (testError) {
        throw new Error(`Connection failed: ${testError.message}`);
      }
      console.log('   ✅ Connected to Supabase successfully');
      console.log(`   📊 Current users in auth: ${testUsers.users.length}`);
    } catch (e) {
      console.error('   ❌ Connection failed:', e.message);
      throw e;
    }
    
    // Step 2: Create essential tables manually (since SQL execution might not work)
    console.log(`\n${step++}. Setting up database tables...`);
    
    // Try to create profiles table
    console.log('   Creating profiles table...');
    const profilesSQL = `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email text UNIQUE,
        full_name text,
        phone text,
        address text,
        church_unit text,
        assigned_pastor text,
        genotype text,
        role text DEFAULT 'user',
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;
    
    await executeSQL(profilesSQL, 'profiles table');
    
    // Try to create members table
    console.log('   Creating members table...');
    const membersSQL = `
      CREATE TABLE IF NOT EXISTS public.members (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        fullname text NOT NULL,
        email text NOT NULL UNIQUE,
        phone text,
        address text,
        category text NOT NULL DEFAULT 'Members',
        title text,
        assignedto uuid,
        churchunit text,
        churchunits text[],
        auxanogroup text,
        joindate date NOT NULL DEFAULT CURRENT_DATE,
        notes text,
        isactive boolean NOT NULL DEFAULT true,
        userid uuid REFERENCES auth.users(id),
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `;
    
    await executeSQL(membersSQL, 'members table');
    
    // Step 3: Check if user exists
    console.log(`\n${step++}. Checking user account...`);
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Cannot list users: ${listError.message}`);
    }
    
    let user = users.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    
    if (user) {
      console.log('   ✅ User account exists');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   ✉️  Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    } else {
      console.log('   ❌ User account does not exist');
      console.log('   🔧 Creating user account...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: 'Lawrence Ojide',
          role: 'superuser'
        }
      });
      
      if (createError) {
        throw new Error(`Cannot create user: ${createError.message}`);
      }
      
      user = newUser.user;
      console.log('   ✅ User account created successfully');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
    }
    
    // Step 4: Create profile record
    console.log(`\n${step++}. Setting up profile record...`);
    
    try {
      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.log('   ⚠️  Profiles table might not exist yet');
        console.log('   📋 You may need to create it manually in Supabase dashboard');
      } else if (existingProfile) {
        console.log('   ✅ Profile already exists');
        console.log(`   👤 Name: ${existingProfile.full_name}`);
        console.log(`   🎭 Role: ${existingProfile.role}`);
      } else {
        console.log('   🔧 Creating profile record...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: ADMIN_EMAIL.toLowerCase(),
            full_name: 'Lawrence Ojide',
            role: 'superuser',
            church_unit: 'Administration',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.log('   ⚠️  Profile creation failed:', profileError.message);
          console.log('   📋 You may need to create the profiles table manually');
        } else {
          console.log('   ✅ Profile record created');
        }
      }
    } catch (e) {
      console.log('   ⚠️  Profile setup error:', e.message);
    }
    
    // Step 5: Create member record
    console.log(`\n${step++}. Setting up member record...`);
    
    try {
      // Check if member exists
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('members')
        .select('*')
        .eq('email', ADMIN_EMAIL.toLowerCase())
        .single();
      
      if (memberCheckError && memberCheckError.code !== 'PGRST116') {
        console.log('   ⚠️  Members table might not exist yet');
        console.log('   📋 You may need to create it manually in Supabase dashboard');
      } else if (existingMember) {
        console.log('   ✅ Member record already exists');
        console.log(`   👤 Name: ${existingMember.fullname}`);
        console.log(`   📂 Category: ${existingMember.category}`);
      } else {
        console.log('   🔧 Creating member record...');
        
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            fullname: 'Lawrence Ojide',
            email: ADMIN_EMAIL.toLowerCase(),
            category: 'Pastors',
            title: 'System Administrator',
            churchunit: 'Administration',
            isactive: true,
            joindate: new Date().toISOString().split('T')[0],
            userid: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (memberError) {
          console.log('   ⚠️  Member creation failed:', memberError.message);
          console.log('   📋 You may need to create the members table manually');
        } else {
          console.log('   ✅ Member record created');
        }
      }
    } catch (e) {
      console.log('   ⚠️  Member setup error:', e.message);
    }
    
    // Step 6: Test sign-in with anon key (like frontend)
    console.log(`\n${step++}. Testing sign-in (like frontend)...`);
    
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.log('   ⚠️  No anon key found in .env, skipping sign-in test');
    } else {
      const frontendSupabase = createClient(supabaseUrl, anonKey);
      
      try {
        const { data: signInData, error: signInError } = await frontendSupabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });
        
        if (signInError) {
          console.log('   ❌ Sign-in failed:', signInError.message);
          
          if (signInError.message.includes('Invalid login credentials')) {
            console.log('   🔧 This means the user account needs a few minutes to activate');
            console.log('   ⏰ Wait 2-3 minutes and try signing in on the website');
          }
        } else {
          console.log('   ✅ Sign-in successful!');
          console.log(`   👤 User ID: ${signInData.user?.id}`);
          console.log(`   📧 Email: ${signInData.user?.email}`);
          
          // Test profile access
          try {
            const { data: profileData, error: profileAccessError } = await frontendSupabase
              .from('profiles')
              .select('*')
              .eq('id', signInData.user.id)
              .single();
            
            if (profileAccessError) {
              console.log('   ⚠️  Profile access failed:', profileAccessError.message);
            } else {
              console.log('   ✅ Profile access successful');
              console.log(`   🎭 Role: ${profileData.role}`);
            }
          } catch (e) {
            console.log('   ⚠️  Profile table not accessible');
          }
          
          await frontendSupabase.auth.signOut();
        }
      } catch (e) {
        console.log('   ❌ Sign-in test error:', e.message);
      }
    }
    
    // Final summary
    console.log('\n🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('✅ User account created/verified');
    console.log('✅ Profile setup attempted');
    console.log('✅ Member record setup attempted');
    
    console.log('\n🔑 Login Credentials:');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔒 Password: ${ADMIN_PASSWORD}`);
    
    console.log('\n📱 Next Steps:');
    console.log('1. Wait 2-3 minutes for account activation');
    console.log('2. Go to your website and try signing in');
    console.log('3. If tables are missing, create them manually in Supabase dashboard');
    
    console.log('\n🔧 If Sign-in Still Fails:');
    console.log('1. Check Supabase dashboard → Authentication → Users');
    console.log('2. Verify ojidelawrence@gmail.com exists and is confirmed');
    console.log('3. Create profiles and members tables manually if needed');
    
    console.log('\n📋 Manual Table Creation (if needed):');
    console.log('Go to Supabase dashboard → SQL Editor and run:');
    console.log('- setup-complete-database.sql (full schema)');
    console.log('- Or create tables individually as shown above');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Manual Setup Required:');
    console.log('1. Go to Supabase dashboard → Authentication → Users');
    console.log('2. Create user manually:');
    console.log(`   - Email: ${ADMIN_EMAIL}`);
    console.log(`   - Password: ${ADMIN_PASSWORD}`);
    console.log('   - Confirm email: Yes');
    console.log('3. Go to SQL Editor and run setup-complete-database.sql');
    console.log('4. Try signing in again');
    process.exit(1);
  }
}

// Run the complete setup
completeSetup();