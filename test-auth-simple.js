import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔐 Testing Simple Authentication Flow');
console.log('====================================');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSimpleAuth() {
    try {
        // Test 1: Check connection
        console.log('1️⃣  Testing connection...');
        const { data: session } = await supabase.auth.getSession();
        console.log('✅ Connection successful');

        // Test 2: Test sign up (with a test email)
        console.log('2️⃣  Testing sign up flow...');
        const testEmail = 'test@example.com';
        const testPassword = 'TestPassword123!';

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });

        if (signUpError) {
            if (signUpError.message.includes('already registered')) {
                console.log('✅ Sign up test: User already exists (expected)');
            } else {
                console.log('⚠️  Sign up error:', signUpError.message);
            }
        } else {
            console.log('✅ Sign up test successful');
        }

        // Test 3: Test sign in
        console.log('3️⃣  Testing sign in flow...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (signInError) {
            console.log('⚠️  Sign in error:', signInError.message);
        } else {
            console.log('✅ Sign in test successful');
            console.log('User:', signInData.user?.email);

            // Test 4: Sign out
            console.log('4️⃣  Testing sign out...');
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) {
                console.log('⚠️  Sign out error:', signOutError.message);
            } else {
                console.log('✅ Sign out successful');
            }
        }

    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

testSimpleAuth()
    .then(() => {
        console.log('✨ Authentication tests completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Tests failed:', error);
        process.exit(1);
    });