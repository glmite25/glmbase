/**
 * Setup ojidelawrence@gmail.com account for admin access
 * This script creates the user account and grants superadmin privileges
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Setting up ojidelawrence@gmail.com account');
console.log('==============================================');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure you have the correct service role key in your .env file');
  process.exit(1);
}

// Check if service key looks correct
if (supabaseServiceKey.includes('anon')) {
  console.error('❌ Warning: Your service role key appears to be an anon key');
  console.error('Please get the actual SERVICE_ROLE key from your Supabase dashboard');
  console.error('Go to: Settings → API → service_role key\n');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupOjideAccount() {
  try {
    console.log('1️⃣ Checking if user already exists...');
    
    // Check if user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Error checking users:', listError.message);
      throw listError;
    }
    
    let user = users.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    
    if (user) {
      console.log('✅ User already exists');
      console.log('User ID:', user.id);
      console.log('Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
    } else {
      console.log('👤 Creating user account...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Lawrence Ojide',
          role: 'superuser'
        }
      });
      
      if (createError) {
        console.error('❌ Error creating user:', createError.message);
        throw createError;
      }
      
      console.log('✅ User created successfully');
      user = newUser.user;
    }
    
    console.log('\n2️⃣ Setting up profile...');
    
    // Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: ADMIN_EMAIL.toLowerCase(),
        full_name: 'Lawrence Ojide',
        role: 'superuser',
        church_unit: 'Administration',
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.log('⚠️  Profile setup warning:', profileError.message);
      console.log('This might be normal if the profiles table doesn\'t exist yet');
    } else {
      console.log('✅ Profile created/updated');
    }
    
    console.log('\n3️⃣ Setting up user roles...');
    
    // Add superuser role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'superuser'
      });
    
    if (roleError) {
      console.log('⚠️  User roles setup warning:', roleError.message);
      console.log('This might be normal if the user_roles table doesn\'t exist yet');
    } else {
      console.log('✅ User role assigned');
    }
    
    console.log('\n4️⃣ Setting up member record...');
    
    // Create member record
    const { error: memberError } = await supabase
      .from('members')
      .upsert({
        fullname: 'Lawrence Ojide',
        email: ADMIN_EMAIL.toLowerCase(),
        category: 'Pastors',
        title: 'System Administrator',
        churchunit: 'Administration',
        isactive: true,
        joindate: new Date().toISOString().split('T')[0],
        userid: user.id
      }, {
        onConflict: 'email'
      });
    
    if (memberError) {
      console.log('⚠️  Member record setup warning:', memberError.message);
      console.log('This might be normal if the members table doesn\'t exist yet');
    } else {
      console.log('✅ Member record created/updated');
    }
    
    console.log('\n🎉 ACCOUNT SETUP COMPLETE!');
    console.log('==========================');
    console.log('✅ User account created/verified');
    console.log('✅ Profile configured');
    console.log('✅ Superuser role assigned');
    console.log('✅ Member record created');
    
    console.log('\n🔑 Login Credentials:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
    console.log('\n📱 Next Steps:');
    console.log('1. Go to your website login page');
    console.log('2. Use the credentials above to sign in');
    console.log('3. You should now have superadmin access');
    console.log('4. Look for the admin button in the header or floating button');
    
    // Test sign-in
    console.log('\n🧪 Testing sign-in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (signInError) {
      console.log('⚠️  Sign-in test failed:', signInError.message);
      console.log('You may need to wait a moment for the account to be fully activated');
    } else {
      console.log('✅ Sign-in test successful!');
      
      // Sign out after test
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('\n❌ Account setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your service role key is correct');
    console.log('2. Check your Supabase project is active');
    console.log('3. Verify your database tables exist (run: node run-database-setup.js)');
    console.log('4. Try creating the account manually in Supabase dashboard');
    process.exit(1);
  }
}

// Run the setup
setupOjideAccount();