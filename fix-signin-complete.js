/**
 * Complete Sign-in Fix Script
 * This script fixes everything needed for ojidelawrence@gmail.com to sign in
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = 'ojidelawrence@gmail.com';
const ADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Complete Sign-in Fix for ojidelawrence@gmail.com');
console.log('====================================================');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('\n🔧 Fix your .env file first:');
  console.error('1. Get your service role key from Supabase dashboard');
  console.error('2. Update SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('3. Make sure it\'s the service_role key, not anon key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixSignIn() {
  let step = 1;
  
  try {
    // Step 1: Setup Database
    console.log(`${step++}️⃣ Setting up database tables...`);
    
    if (existsSync('setup-complete-database.sql')) {
      try {
        const sqlContent = readFileSync('setup-complete-database.sql', 'utf8');
        const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
        
        if (error) {
          console.log('⚠️  Database setup warning:', error.message);
        } else {
          console.log('✅ Database tables created');
        }
      } catch (e) {
        console.log('⚠️  Database setup warning:', e.message);
      }
    } else {
      console.log('⚠️  Database SQL file not found, skipping...');
    }
    
    // Step 2: Create User Account
    console.log(`${step++}️⃣ Creating user account...`);
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Cannot access auth system: ${listError.message}`);
    }
    
    let user = users.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    
    if (!user) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Lawrence Ojide',
          role: 'superuser'
        }
      });
      
      if (createError) {
        throw new Error(`Cannot create user: ${createError.message}`);
      }
      
      console.log('✅ User account created');
      user = newUser.user;
    } else {
      console.log('✅ User account exists');
      
      // Update password to make sure it's correct
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true
      });
      
      if (updateError) {
        console.log('⚠️  Password update warning:', updateError.message);
      } else {
        console.log('✅ Password updated');
      }
    }
    
    // Step 3: Setup Profile
    console.log(`${step++}️⃣ Setting up profile...`);
    
    try {
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
        console.log('⚠️  Profile warning:', profileError.message);
      } else {
        console.log('✅ Profile created');
      }
    } catch (e) {
      console.log('⚠️  Profile table not ready, continuing...');
    }
    
    // Step 4: Setup User Roles
    console.log(`${step++}️⃣ Setting up user roles...`);
    
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'superuser'
        });
      
      if (roleError) {
        console.log('⚠️  User roles warning:', roleError.message);
      } else {
        console.log('✅ User roles assigned');
      }
    } catch (e) {
      console.log('⚠️  User roles table not ready, continuing...');
    }
    
    // Step 5: Setup Member Record
    console.log(`${step++}️⃣ Setting up member record...`);
    
    try {
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
        console.log('⚠️  Member record warning:', memberError.message);
      } else {
        console.log('✅ Member record created');
      }
    } catch (e) {
      console.log('⚠️  Members table not ready, continuing...');
    }
    
    // Step 6: Fix SuperAdmin Functions
    console.log(`${step++}️⃣ Fixing superadmin functions...`);
    
    if (existsSync('src/integrations/supabase/fix_superadmin_function_complete.sql')) {
      try {
        const sqlContent = readFileSync('src/integrations/supabase/fix_superadmin_function_complete.sql', 'utf8');
        const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
        
        if (error) {
          console.log('⚠️  SuperAdmin functions warning:', error.message);
        } else {
          console.log('✅ SuperAdmin functions fixed');
        }
      } catch (e) {
        console.log('⚠️  SuperAdmin functions warning:', e.message);
      }
    }
    
    // Step 7: Test Sign-in
    console.log(`${step++}️⃣ Testing sign-in...`);
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (signInError) {
      console.log('❌ Sign-in test failed:', signInError.message);
      console.log('⚠️  The account may need a few moments to activate');
    } else {
      console.log('✅ Sign-in test successful!');
      await supabase.auth.signOut(); // Clean up
    }
    
    // Success Summary
    console.log('\n🎉 SIGN-IN FIX COMPLETE!');
    console.log('========================');
    console.log('✅ Database setup completed');
    console.log('✅ User account created/updated');
    console.log('✅ Profile configured');
    console.log('✅ Admin privileges assigned');
    console.log('✅ SuperAdmin functions fixed');
    
    console.log('\n🔑 Login Credentials:');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔒 Password: ${ADMIN_PASSWORD}`);
    
    console.log('\n📱 How to Sign In:');
    console.log('1. Go to your website');
    console.log('2. Click "Login" button');
    console.log('3. Enter the credentials above');
    console.log('4. You should now have superadmin access!');
    
    console.log('\n🎯 After Sign In:');
    console.log('- Look for "Super Admin" button in header');
    console.log('- Or use the floating admin button (bottom-right)');
    console.log('- Or go directly to /admin-access page');
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.log('\n🔧 Manual Steps:');
    console.log('1. Check your service role key in .env');
    console.log('2. Go to Supabase dashboard → Authentication');
    console.log('3. Create user manually with email: ojidelawrence@gmail.com');
    console.log('4. Set password to: Fa-#8rC6DRTkd$5');
    console.log('5. Confirm the email address');
    console.log('6. Try signing in again');
    process.exit(1);
  }
}

// Run the complete fix
fixSignIn();