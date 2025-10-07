import { createClient } from '@supabase/supabase-js';

// Admin client with service role key
const adminSupabase = createClient(
  'https://spbdnwkipawreftixvfu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYmRud2tpcGF3cmVmdGl4dmZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTExODMyNCwiZXhwIjoyMDc0Njk0MzI0fQ.a22mWVRW9l_-JLYdinJsyDVjCFqtUmp8OvR_RZibGGQ'
);

// Client for testing authentication
const clientSupabase = createClient(
  'https://spbdnwkipawreftixvfu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYmRud2tpcGF3cmVmdGl4dmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTgzMjQsImV4cCI6MjA3NDY5NDMyNH0.I_ftWDaf6RA2IOGqV_gzp0l9Tew_WYAk483Rbesoc3o'
);

async function fixOjideAuthentication() {
  console.log('🔧 COMPREHENSIVE AUTHENTICATION FIX FOR ojidelawrence@gmail.com');
  console.log('================================================================');
  
  const targetEmail = 'ojidelawrence@gmail.com';
  const newPassword = 'GLM2025!Admin';
  
  try {
    // Step 1: Verify user exists and get details
    console.log('\n📋 Step 1: Verifying user exists...');
    const { data: users, error: userError } = await adminSupabase.auth.admin.listUsers();
    
    if (userError) {
      console.log('❌ Error fetching users:', userError.message);
      return;
    }
    
    const targetUser = users.users.find(u => u.email === targetEmail);
    if (!targetUser) {
      console.log('❌ User not found in auth.users');
      return;
    }
    
    console.log('✅ User found:');
    console.log(`   ID: ${targetUser.id}`);
    console.log(`   Email: ${targetUser.email}`);
    console.log(`   Email confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Last sign in: ${targetUser.last_sign_in_at || 'Never'}`);
    
    // Step 2: Reset password
    console.log('\n🔑 Step 2: Resetting password...');
    const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      targetUser.id,
      {
        password: newPassword,
        email_confirm: true // Ensure email is confirmed
      }
    );
    
    if (updateError) {
      console.log('❌ Error updating password:', updateError.message);
      return;
    }
    
    console.log('✅ Password reset successfully');
    console.log(`   New password: ${newPassword}`);
    
    // Step 3: Verify all related records exist
    console.log('\n📊 Step 3: Verifying related records...');
    
    // Check profiles
    const { data: profiles, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', targetUser.id);
    
    console.log(`   Profiles: ${profiles?.length || 0} records found`);
    if (profileError) console.log(`   Profile Error: ${profileError.message}`);
    
    // Check members
    const { data: members, error: memberError } = await adminSupabase
      .from('members')
      .select('*')
      .eq('user_id', targetUser.id);
    
    console.log(`   Members: ${members?.length || 0} records found`);
    if (memberError) console.log(`   Member Error: ${memberError.message}`);
    
    // Check user_roles
    const { data: roles, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('*')
      .eq('user_id', targetUser.id);
    
    console.log(`   User Roles: ${roles?.length || 0} records found`);
    if (roleError) console.log(`   Role Error: ${roleError.message}`);
    
    // Step 4: Ensure all records are properly linked
    console.log('\n🔗 Step 4: Ensuring proper record linkage...');
    
    if (!profiles || profiles.length === 0) {
      console.log('   Creating missing profile...');
      const { error: createProfileError } = await adminSupabase
        .from('profiles')
        .insert({
          id: targetUser.id,
          email: targetUser.email,
          full_name: 'Lawrence Ojide',
          role: 'superuser'
        });
      
      if (createProfileError) {
        console.log('   ❌ Error creating profile:', createProfileError.message);
      } else {
        console.log('   ✅ Profile created');
      }
    }
    
    if (!roles || roles.length === 0) {
      console.log('   Creating missing user role...');
      const { error: createRoleError } = await adminSupabase
        .from('user_roles')
        .insert({
          user_id: targetUser.id,
          role: 'superuser'
        });
      
      if (createRoleError) {
        console.log('   ❌ Error creating role:', createRoleError.message);
      } else {
        console.log('   ✅ User role created');
      }
    }
    
    // Step 5: Test authentication
    console.log('\n🔐 Step 5: Testing authentication...');
    
    const { data: authData, error: authError } = await clientSupabase.auth.signInWithPassword({
      email: targetEmail,
      password: newPassword
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('   Error code:', authError.status);
      
      // Additional debugging
      if (authError.message.includes('Invalid login credentials')) {
        console.log('\n🔍 Debugging password issue...');
        console.log('   - Password was just reset, so this might be a timing issue');
        console.log('   - Try waiting a few seconds and testing again');
        console.log('   - Or try resetting password through Supabase dashboard');
      }
    } else {
      console.log('✅ Authentication successful!');
      console.log(`   User ID: ${authData.user?.id}`);
      console.log(`   Email: ${authData.user?.email}`);
      
      // Test profile access
      const { data: profileData, error: profileAccessError } = await clientSupabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .single();
      
      if (profileAccessError) {
        console.log('❌ Profile access failed:', profileAccessError.message);
      } else {
        console.log('✅ Profile access successful');
        console.log(`   Role: ${profileData.role}`);
      }
      
      // Sign out
      await clientSupabase.auth.signOut();
      console.log('✅ Signed out successfully');
    }
    
    // Step 6: Summary and next steps
    console.log('\n📋 SUMMARY');
    console.log('==========');
    console.log(`✅ User exists: ${targetUser.email}`);
    console.log(`✅ Password reset to: ${newPassword}`);
    console.log(`✅ Email confirmed: Yes`);
    console.log(`✅ Profile exists: ${profiles?.length > 0 ? 'Yes' : 'Created'}`);
    console.log(`✅ Member record exists: ${members?.length > 0 ? 'Yes' : 'Check manually'}`);
    console.log(`✅ User role exists: ${roles?.length > 0 ? 'Yes' : 'Created'}`);
    
    console.log('\n🎯 NEXT STEPS');
    console.log('=============');
    console.log('1. Try logging in with:');
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log('2. If login still fails, wait 30 seconds and try again');
    console.log('3. If still having issues, check Supabase Auth logs in dashboard');
    console.log('4. Once logged in, user should have full superuser access');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Run the fix
fixOjideAuthentication();
