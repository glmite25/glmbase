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
    
    // Step 3: Test authentication immediately
    console.log('\n🔐 Step 3: Testing authentication...');
    
    const { data: authData, error: authError } = await clientSupabase.auth.signInWithPassword({
      email: targetEmail,
      password: newPassword
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('   Error code:', authError.status);
      
      // Try with a different password format
      console.log('\n🔄 Trying alternative password...');
      const altPassword = 'GLMAdmin2025!';
      
      const { error: altUpdateError } = await adminSupabase.auth.admin.updateUserById(
        targetUser.id,
        { password: altPassword }
      );
      
      if (!altUpdateError) {
        const { data: altAuthData, error: altAuthError } = await clientSupabase.auth.signInWithPassword({
          email: targetEmail,
          password: altPassword
        });
        
        if (altAuthError) {
          console.log('❌ Alternative authentication also failed:', altAuthError.message);
        } else {
          console.log('✅ Authentication successful with alternative password!');
          console.log(`   User ID: ${altAuthData.user?.id}`);
          console.log(`   Email: ${altAuthData.user?.email}`);
          await clientSupabase.auth.signOut();
          console.log(`   Use password: ${altPassword}`);
        }
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
    
    // Step 4: Summary and next steps
    console.log('\n📋 SUMMARY');
    console.log('==========');
    console.log(`✅ User exists: ${targetUser.email}`);
    console.log(`✅ Password reset completed`);
    console.log(`✅ Email confirmed: Yes`);
    
    console.log('\n🎯 NEXT STEPS');
    console.log('=============');
    console.log('1. Try logging in with:');
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: ${newPassword} (or the alternative if mentioned above)`);
    console.log('2. If login still fails, check the browser console for errors');
    console.log('3. User should have full superuser access once logged in');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Run the fix
fixOjideAuthentication();
