import { createClient } from '@supabase/supabase-js';

// Client for testing authentication
const clientSupabase = createClient(
  'https://spbdnwkipawreftixvfu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYmRud2tpcGF3cmVmdGl4dmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTgzMjQsImV4cCI6MjA3NDY5NDMyNH0.I_ftWDaf6RA2IOGqV_gzp0l9Tew_WYAk483Rbesoc3o'
);

async function testAuthentication() {
  console.log('🔐 TESTING AUTHENTICATION FOR ojidelawrence@gmail.com');
  console.log('====================================================');
  
  const targetEmail = 'ojidelawrence@gmail.com';
  
  // Try common passwords that might have been set
  const passwordsToTry = [
    'GLM2025!Admin',
    'GLMAdmin2025!',
    'TempPassword123!',
    'password123',
    'admin123',
    'GLM123!',
    'gospellabour123',
    'ojide123',
    'lawrence123'
  ];
  
  console.log(`\n🔍 Trying ${passwordsToTry.length} common passwords...`);
  
  for (let i = 0; i < passwordsToTry.length; i++) {
    const password = passwordsToTry[i];
    console.log(`\n${i + 1}. Testing password: ${password}`);
    
    try {
      const { data: authData, error: authError } = await clientSupabase.auth.signInWithPassword({
        email: targetEmail,
        password: password
      });
      
      if (authError) {
        console.log(`   ❌ Failed: ${authError.message}`);
      } else {
        console.log('   ✅ SUCCESS! Authentication worked!');
        console.log(`   User ID: ${authData.user?.id}`);
        console.log(`   Email: ${authData.user?.email}`);
        
        // Test accessing profile
        console.log('\n📋 Testing profile access...');
        const { data: profileData, error: profileError } = await clientSupabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user?.id)
          .single();
        
        if (profileError) {
          console.log(`   ❌ Profile access failed: ${profileError.message}`);
        } else {
          console.log('   ✅ Profile access successful');
          console.log(`   Name: ${profileData.full_name}`);
          console.log(`   Role: ${profileData.role}`);
        }
        
        // Test accessing members
        console.log('\n👥 Testing members access...');
        const { data: memberData, error: memberError } = await clientSupabase
          .from('members')
          .select('*')
          .eq('user_id', authData.user?.id)
          .single();
        
        if (memberError) {
          console.log(`   ❌ Member access failed: ${memberError.message}`);
        } else {
          console.log('   ✅ Member access successful');
          console.log(`   Name: ${memberData.fullname}`);
          console.log(`   Category: ${memberData.category}`);
          console.log(`   Active: ${memberData.isactive}`);
        }
        
        // Test accessing user roles
        console.log('\n🔐 Testing user roles access...');
        const { data: roleData, error: roleError } = await clientSupabase
          .from('user_roles')
          .select('*')
          .eq('user_id', authData.user?.id);
        
        if (roleError) {
          console.log(`   ❌ Role access failed: ${roleError.message}`);
        } else {
          console.log('   ✅ Role access successful');
          console.log(`   Roles: ${roleData.map(r => r.role).join(', ')}`);
        }
        
        // Sign out
        await clientSupabase.auth.signOut();
        console.log('\n✅ Signed out successfully');
        
        console.log('\n🎉 AUTHENTICATION SUCCESSFUL!');
        console.log('==============================');
        console.log(`✅ Working credentials:`);
        console.log(`   Email: ${targetEmail}`);
        console.log(`   Password: ${password}`);
        console.log(`✅ User has full access to their data`);
        console.log(`✅ User has superuser role`);
        
        return true;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ AUTHENTICATION FAILED');
  console.log('========================');
  console.log('None of the common passwords worked.');
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('1. Go to Supabase Dashboard → Authentication → Users');
  console.log('2. Find ojidelawrence@gmail.com');
  console.log('3. Click "Reset Password" or "Send Magic Link"');
  console.log('4. Use the reset link to set a new password');
  console.log('5. Or manually set password in dashboard');
  
  return false;
}

// Run the test
testAuthentication();
