/**
 * Create superadmin user and check existing superusers
 * Run this after database setup is complete
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

async function createSuperAdmin() {
  console.log('👑 Gospel Labour Ministry CMS - Superadmin Setup');
  console.log('=================================================\n');
  
  try {
    // Step 1: Check existing superusers
    console.log('1️⃣ Checking existing superusers...');
    
    const { data: existingSuperusers, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'superuser');
    
    if (checkError) {
      console.log('⚠️  Could not check existing superusers:', checkError.message);
    } else {
      console.log(`📊 Current superusers: ${existingSuperusers?.length || 0}`);
      
      if (existingSuperusers && existingSuperusers.length > 0) {
        console.log('\nExisting superusers:');
        existingSuperusers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.full_name || 'No name'} (${user.email})`);
        });
      }
      
      // Check if ojidelawrence is already a superuser
      const isAlreadySuperuser = existingSuperusers?.some(
        user => user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
      );
      
      if (isAlreadySuperuser) {
        console.log(`\n✅ ${SUPERADMIN_EMAIL} is already a superuser!`);
        console.log('\nLogin credentials:');
        console.log(`Email: ${SUPERADMIN_EMAIL}`);
        console.log(`Password: ${SUPERADMIN_PASSWORD}`);
        return;
      }
    }
    
    // Step 2: Check if user exists in auth
    console.log('\n2️⃣ Checking auth system...');
    
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
    
    // Step 3: Create/update profile
    console.log('\n3️⃣ Setting up profile...');
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: SUPERADMIN_EMAIL.toLowerCase(),
        full_name: 'Lawrence Ojide',
        role: 'superuser',
        church_unit: 'Administration',
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message);
      throw profileError;
    }
    
    console.log('✅ Profile created/updated');
    
    // Step 4: Add user role
    console.log('\n4️⃣ Setting up user roles...');
    
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'superuser'
      });
    
    if (roleError) {
      console.error('❌ Error setting user role:', roleError.message);
      throw roleError;
    }
    
    console.log('✅ User role assigned');
    
    // Step 5: Create member record
    console.log('\n5️⃣ Creating member record...');
    
    const { error: memberError } = await supabase
      .from('members')
      .upsert({
        fullname: 'Lawrence Ojide',
        email: SUPERADMIN_EMAIL.toLowerCase(),
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
      console.error('❌ Error creating member record:', memberError.message);
      throw memberError;
    }
    
    console.log('✅ Member record created');
    
    // Step 6: Final verification
    console.log('\n6️⃣ Verifying setup...');
    
    const { data: finalCheck } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', SUPERADMIN_EMAIL.toLowerCase())
      .single();
    
    if (finalCheck && finalCheck.role === 'superuser') {
      console.log('✅ Verification successful');
    } else {
      console.log('⚠️  Verification failed - please check manually');
    }
    
    // Success summary
    console.log('\n🎉 SUPERADMIN SETUP COMPLETE!');
    console.log('=============================');
    console.log(`✅ ${SUPERADMIN_EMAIL} now has superadmin access`);
    console.log('\n🔑 Login Credentials:');
    console.log(`Email: ${SUPERADMIN_EMAIL}`);
    console.log(`Password: ${SUPERADMIN_PASSWORD}`);
    console.log('\n🚀 Access Level: Superuser (Full administrative privileges)');
    console.log('📊 Can access: Superadmin dashboard, all management features');
    
    // Final count
    const { data: totalSuperusers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'superuser');
    
    console.log(`\n📈 Total superusers in system: ${totalSuperusers?.length || 1}`);
    
  } catch (error) {
    console.error('\n❌ Superadmin setup failed:', error.message);
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Authentication → Users');
    console.log('3. Create a new user with email: ojidelawrence@gmail.com');
    console.log('4. Go to SQL Editor and run:');
    console.log(`   INSERT INTO profiles (id, email, full_name, role) VALUES`);
    console.log(`   ('user_id_here', '${SUPERADMIN_EMAIL}', 'Lawrence Ojide', 'superuser');`);
    process.exit(1);
  }
}

// Run the setup
createSuperAdmin();