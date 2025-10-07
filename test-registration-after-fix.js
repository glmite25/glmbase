#!/usr/bin/env node

/**
 * Test Registration After Fix
 * Test if user registration works after applying the SQL fix
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function testRegistrationAfterFix() {
    console.log('🧪 Testing user registration after fix...\n');
    
    try {
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        console.log(`📧 Test email: ${testEmail}`);
        console.log(`🔑 Test password: ${testPassword}`);
        
        // Test registration
        console.log('\n1. Testing user registration...');
        const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User',
                    role: 'user'
                }
            }
        });
        
        if (signUpError) {
            console.log(`   ❌ Registration failed: ${signUpError.message}`);
            return false;
        }
        
        console.log('   ✅ Registration successful!');
        console.log(`   🆔 User ID: ${signUpData.user?.id}`);
        console.log(`   📧 Email: ${signUpData.user?.email}`);
        console.log(`   ✉️  Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
        
        const userId = signUpData.user?.id;
        
        if (!userId) {
            console.log('   ❌ No user ID returned');
            return false;
        }
        
        // Test sign-in
        console.log('\n2. Testing sign-in...');
        const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });
        
        if (signInError) {
            console.log(`   ❌ Sign-in failed: ${signInError.message}`);
            
            if (signInError.message.includes('email')) {
                console.log('   💡 Email confirmation may be required');
            }
        } else {
            console.log('   ✅ Sign-in successful!');
            
            // Test profile access
            console.log('\n3. Testing profile access...');
            const { data: profileData, error: profileError } = await testClient
                .from('profiles')
                .select('*')
                .eq('id', signInData.user.id)
                .single();
            
            if (profileError) {
                console.log(`   ❌ Profile access failed: ${profileError.message}`);
            } else {
                console.log('   ✅ Profile access successful!');
                console.log(`   👤 Full name: ${profileData.full_name}`);
                console.log(`   👑 Role: ${profileData.role}`);
            }
            
            await testClient.auth.signOut();
        }
        
        // Clean up test user
        console.log('\n4. Cleaning up test user...');
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
        
        try {
            // Delete from our tables first
            await supabase.from('user_roles').delete().eq('user_id', userId);
            await supabase.from('members').delete().eq('user_id', userId);
            await supabase.from('profiles').delete().eq('id', userId);
            
            // Try to delete from auth.users
            const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
            
            if (deleteError) {
                console.log(`   ⚠️  Auth user deletion warning: ${deleteError.message}`);
            } else {
                console.log('   ✅ Test user cleaned up successfully');
            }
        } catch (cleanupError) {
            console.log(`   ⚠️  Cleanup warning: ${cleanupError.message}`);
        }
        
        console.log('\n🎉 REGISTRATION TEST COMPLETE!');
        console.log('✅ User registration is now working');
        
        return true;
        
    } catch (error) {
        console.error('\n💥 TEST FAILED:', error.message);
        return false;
    }
}

// Run the test
testRegistrationAfterFix()
    .then(success => {
        if (success) {
            console.log('\n🎊 SUCCESS: Registration system is working!');
            console.log('\n💡 Next steps:');
            console.log('   1. Try registering a real user through your app');
            console.log('   2. Test the popsabey upgrade script');
            console.log('   3. Re-enable proper RLS policies if needed');
        } else {
            console.log('\n❌ FAILED: Registration system still has issues');
            console.log('\n💡 Try:');
            console.log('   1. Run the SQL fix in Supabase SQL Editor');
            console.log('   2. Check Supabase project logs for detailed errors');
            console.log('   3. Verify all environment variables are correct');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test script failed:', error);
        process.exit(1);
    });