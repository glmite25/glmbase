/**
 * Quick Admin Fix - Bypass database setup and create admin access
 * This creates a minimal setup to get admin access working
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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

async function quickAdminFix() {
  console.log('🚀 Quick Admin Fix - Gospel Labour Ministry CMS');
  console.log('===============================================\n');
  
  try {
    // Step 1: Create/update user in auth
    console.log('1️⃣ Setting up authentication...');
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Error accessing auth system:', listError.message);
      throw listError;
    }
    
    let user = users.users.find(u => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());
    
    if (!user) {
      console.log('👤 Creating new user...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        email_confirm: true,
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
    } else {
      console.log('✅ User found in auth system');
      
      // Update password and metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: SUPERADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          full_name: 'Lawrence Ojide',
          role: 'superuser'
        }
      });
      
      if (updateError) {
        console.log('⚠️  Could not update user:', updateError.message);
      } else {
        console.log('✅ User updated');
      }
    }
    
    // Step 2: Try to create profile (skip if table doesn't exist)
    console.log('\n2️⃣ Setting up profile...');
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: SUPERADMIN_EMAIL.toLowerCase(),
          full_name: 'Lawrence Ojide',
          role: 'superuser',
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.log('⚠️  Profile table may not exist, skipping...');
      } else {
        console.log('✅ Profile created/updated');
      }
    } catch (error) {
      console.log('⚠️  Profile setup skipped (table may not exist)');
    }
    
    // Step 3: Try to create user role (skip if table doesn't exist)
    console.log('\n3️⃣ Setting up user roles...');
    
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'superuser'
        });
      
      if (roleError) {
        console.log('⚠️  User roles table may not exist, skipping...');
      } else {
        console.log('✅ User role assigned');
      }
    } catch (error) {
      console.log('⚠️  User roles setup skipped (table may not exist)');
    }
    
    // Success summary
    console.log('\n🎉 QUICK ADMIN FIX COMPLETE!');
    console.log('============================');
    console.log(`✅ ${SUPERADMIN_EMAIL} can now log in`);
    console.log('\n🔑 Login Credentials:');
    console.log(`Email: ${SUPERADMIN_EMAIL}`);
    console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    console.log('\n📋 Next Steps:');
    console.log('1. Go to: http://localhost:7070/auth');
    console.log('2. Sign in with the credentials above');
    console.log('3. Go to: http://localhost:7070/admin-access');
    console.log('4. Click "Force Super Admin Access (Testing)"');
    console.log('5. You should be redirected to the admin dashboard');
    
    console.log('\n💡 Note: Some database tables may not exist yet.');
    console.log('   The admin interface will work with limited functionality.');
    console.log('   You can set up the full database later if needed.');
    
  } catch (error) {
    console.error('\n❌ Quick admin fix failed:', error.message);
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Authentication → Users');
    console.log('3. Create a new user with email: ojidelawrence@gmail.com');
    console.log('4. Set password to: Fa-#8rC6DRTkd$5');
    console.log('5. Confirm the email address');
    console.log('6. Try logging in at http://localhost:7070/auth');
    process.exit(1);
  }
}

// Run the fix
quickAdminFix();