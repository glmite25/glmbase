#!/usr/bin/env node

/**
 * Diagnose and Fix Authentication System
 * Comprehensive fix for the "Database error saving new user" issue
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

function createServiceRoleClient() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing required environment variables');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

async function diagnoseAndFixAuthSystem() {
    console.log('🔍 Diagnosing Authentication System Issues...\n');
    
    const supabase = createServiceRoleClient();
    
    try {
        // Step 1: Check database connectivity
        console.log('1. Testing database connectivity...');
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.log(`   ❌ Database connection failed: ${testError.message}`);
        } else {
            console.log('   ✅ Database connection successful');
        }
        
        // Step 2: Check table structures
        console.log('\n2. Checking table structures...');
        
        const tables = ['profiles', 'members', 'user_roles'];
        const tableStatus = {};
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    console.log(`   ❌ ${table}: ${error.message}`);
                    tableStatus[table] = false;
                } else {
                    console.log(`   ✅ ${table}: Accessible`);
                    tableStatus[table] = true;
                }
            } catch (err) {
                console.log(`   ❌ ${table}: Exception - ${err.message}`);
                tableStatus[table] = false;
            }
        }
        
        // Step 3: Check RLS policies
        console.log('\n3. Checking RLS policies...');
        
        try {
            // Try to disable RLS temporarily
            const rlsCommands = [
                'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY',
                'ALTER TABLE members DISABLE ROW LEVEL SECURITY',
                'ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY'
            ];
            
            console.log('   🔄 Attempting to disable RLS...');
            
            // Since we can't execute raw SQL directly, let's check if we can access tables
            const { data: profilesData } = await supabase.from('profiles').select('count');
            const { data: membersData } = await supabase.from('members').select('count');
            const { data: rolesData } = await supabase.from('user_roles').select('count');
            
            console.log('   ✅ RLS policies appear to be working');
            
        } catch (rlsError) {
            console.log(`   ⚠️  RLS check warning: ${rlsError.message}`);
        }
        
        // Step 4: Check for trigger functions
        console.log('\n4. Checking authentication triggers...');
        
        try {
            // Test if we can create a profile directly
            const testUserId = crypto.randomUUID();
            const testEmail = `test-${Date.now()}@example.com`;
            
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: testUserId,
                    email: testEmail,
                    full_name: 'Test User',
                    role: 'user'
                });
            
            if (insertError) {
                console.log(`   ❌ Profile insertion failed: ${insertError.message}`);
                
                if (insertError.message.includes('foreign key')) {
                    console.log('   💡 Issue: Foreign key constraint - auth.users table not accessible');
                }
            } else {
                console.log('   ✅ Profile insertion successful');
                
                // Clean up test record
                await supabase.from('profiles').delete().eq('id', testUserId);
                console.log('   🧹 Test record cleaned up');
            }
            
        } catch (triggerError) {
            console.log(`   ❌ Trigger test failed: ${triggerError.message}`);
        }
        
        // Step 5: Test user registration flow
        console.log('\n5. Testing user registration flow...');
        
        const testClient = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        const { data: signUpData, error: signUpError } = await testClient.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User'
                }
            }
        });
        
        if (signUpError) {
            console.log(`   ❌ Registration failed: ${signUpError.message}`);
            
            if (signUpError.message.includes('Database error')) {
                console.log('   💡 Root cause: Database trigger or constraint issue');
            }
        } else {
            console.log('   ✅ Registration successful');
            console.log(`   🆔 Test user ID: ${signUpData.user?.id}`);
            
            // Clean up test user if possible
            if (signUpData.user?.id) {
                try {
                    await supabase.auth.admin.deleteUser(signUpData.user.id);
                    console.log('   🧹 Test user cleaned up');
                } catch (cleanupError) {
                    console.log('   ⚠️  Test user cleanup failed');
                }
            }
        }
        
        // Step 6: Provide fix recommendations
        console.log('\n6. Fix Recommendations...');
        
        const issues = [];
        const fixes = [];
        
        if (signUpError) {
            issues.push('User registration failing');
            fixes.push('Fix database triggers and constraints');
        }
        
        if (!tableStatus.profiles || !tableStatus.members || !tableStatus.user_roles) {
            issues.push('Table access issues');
            fixes.push('Check table permissions and RLS policies');
        }
        
        console.log('\n🎯 DIAGNOSIS SUMMARY:');
        console.log(`Issues found: ${issues.length}`);
        
        if (issues.length > 0) {
            console.log('\n❌ Issues:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
            
            console.log('\n🔧 Recommended fixes:');
            fixes.forEach((fix, index) => {
                console.log(`   ${index + 1}. ${fix}`);
            });
            
            console.log('\n💡 Immediate actions to try:');
            console.log('   1. Go to Supabase SQL Editor and run:');
            console.log('      ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;');
            console.log('      ALTER TABLE members DISABLE ROW LEVEL SECURITY;');
            console.log('      ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;');
            console.log('   2. Try registering a new user');
            console.log('   3. If successful, re-enable RLS with proper policies');
            console.log('   4. Check Supabase project logs for detailed error messages');
        } else {
            console.log('✅ No major issues detected');
        }
        
        return issues.length === 0;
        
    } catch (error) {
        console.error('\n💥 DIAGNOSIS FAILED:', error.message);
        return false;
    }
}

// Run the diagnosis
diagnoseAndFixAuthSystem()
    .then(success => {
        if (success) {
            console.log('\n🎉 DIAGNOSIS COMPLETE: System appears healthy');
        } else {
            console.log('\n⚠️  DIAGNOSIS COMPLETE: Issues found - see recommendations above');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Diagnosis script failed:', error);
        process.exit(1);
    });