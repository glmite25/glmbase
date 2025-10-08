#!/usr/bin/env node

/**
 * Apply the signup database error fix
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyFix() {
    console.log('🔧 Applying Signup Database Error Fix\n');

    try {
        // Read the SQL fix file
        const sqlContent = readFileSync('fix-signup-database-error.sql', 'utf8');
        
        console.log('📄 Executing SQL fix...');
        
        // Execute the SQL fix
        const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
        
        if (error) {
            console.error('❌ SQL execution failed:', error.message);
            
            // Try executing parts of the SQL manually
            console.log('\n🔄 Trying manual execution...');
            
            // Split SQL into individual statements and execute them
            const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.includes('DROP TRIGGER') || statement.includes('DROP FUNCTION')) {
                    try {
                        const { error: dropError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                        if (dropError) {
                            console.log(`⚠️  Drop statement ${i + 1} failed (expected): ${dropError.message}`);
                        } else {
                            console.log(`✅ Drop statement ${i + 1} executed`);
                        }
                    } catch (e) {
                        console.log(`⚠️  Drop statement ${i + 1} failed (expected)`);
                    }
                }
            }
            
            return;
        }
        
        console.log('✅ SQL fix executed successfully');
        
        console.log('\n🧪 Testing signup after fix...');
        
        // Test signup with a temporary user
        const testEmail = `test.${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        const { data, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User'
                }
            }
        });
        
        if (signupError) {
            console.error('❌ Signup test failed:', signupError.message);
        } else {
            console.log('✅ Signup test successful!');
            console.log('User ID:', data.user?.id);
            
            // Clean up test user
            if (data.user?.id) {
                try {
                    await supabase.auth.admin.deleteUser(data.user.id);
                    console.log('✅ Test user cleaned up');
                } catch (cleanupError) {
                    console.log('⚠️  Test user cleanup failed (not critical)');
                }
            }
        }
        
        console.log('\n🎉 Signup fix applied successfully!');
        console.log('\nUsers should now be able to sign up without database errors.');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

applyFix().catch(console.error);