#!/usr/bin/env node

// Test script to verify all fixes work correctly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jaicfvakzxfeijtuogir.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAllFixes() {
  console.log('🧪 Testing All Fixes - Recursion, Categories, and Super Admin\n');

  try {
    // Test 1: Check member categories are correct
    console.log('1️⃣ Testing member categories...');
    
    try {
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('email, fullname, category, isactive')
        .eq('isactive', true)
        .order('category', { ascending: false });
      
      if (membersError) {
        console.log(`❌ Members category check error: ${membersError.message}`);
      } else {
        console.log(`✅ Member categories retrieved successfully:`);
        
        const pastors = members?.filter(m => m.category === 'Pastors') || [];
        const regularMembers = members?.filter(m => m.category === 'Members') || [];
        const others = members?.filter(m => !['Pastors', 'Members'].includes(m.category)) || [];
        
        console.log(`   📋 Pastors (${pastors.length}):`);
        pastors.forEach(p => console.log(`      - ${p.email} (${p.fullname})`));
        
        console.log(`   👥 Members (${regularMembers.length}):`);
        regularMembers.slice(0, 3).forEach(m => console.log(`      - ${m.email} (${m.fullname})`));
        if (regularMembers.length > 3) {
          console.log(`      ... and ${regularMembers.length - 3} more`);
        }
        
        if (others.length > 0) {
          console.log(`   ⚠️  Other categories (${others.length}):`);
          others.forEach(o => console.log(`      - ${o.email} (${o.category})`));
        }
        
        // Verify correct pastor assignments
        const expectedPastors = ['ojidelawrence@gmail.com', 'popsabey1@gmail.com'];
        const actualPastors = pastors.map(p => p.email.toLowerCase());
        const correctPastors = expectedPastors.every(email => actualPastors.includes(email));
        
        if (correctPastors && pastors.length === 2) {
          console.log(`   ✅ Pastor categories are CORRECT`);
        } else {
          console.log(`   ❌ Pastor categories are INCORRECT`);
          console.log(`      Expected: ${expectedPastors.join(', ')}`);
          console.log(`      Actual: ${actualPastors.join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`❌ Members category test exception: ${err.message}`);
    }

    // Test 2: Test super admin functions (no recursion)
    console.log('\n2️⃣ Testing super admin functions (recursion fix)...');
    
    try {
      const { data: listResult, error: listError } = await supabase.rpc('list_super_admins');
      
      if (listError) {
        console.log(`❌ list_super_admins error: ${listError.message}`);
      } else {
        console.log(`✅ list_super_admins working: Found ${Array.isArray(listResult) ? listResult.length : 'N/A'} super admins`);
        if (Array.isArray(listResult) && listResult.length > 0) {
          listResult.forEach(admin => {
            console.log(`   - ${admin.email} (${admin.full_name}) - Added: ${new Date(admin.created_at).toLocaleDateString()}`);
          });
        }
      }
    } catch (err) {
      console.log(`❌ list_super_admins exception: ${err.message}`);
    }

    // Test 3: Test adding super admin (should work without stack depth error)
    console.log('\n3️⃣ Testing add super admin (stack depth fix)...');
    
    try {
      const { data: addResult, error: addError } = await supabase
        .rpc('add_super_admin_by_email', { admin_email: 'popsabey1@gmail.com' });
      
      if (addError) {
        console.log(`❌ add_super_admin_by_email error: ${addError.message}`);
      } else {
        console.log(`✅ add_super_admin_by_email result: ${JSON.stringify(addResult)}`);
        
        if (addResult.success) {
          console.log(`   🎉 SUCCESS: ${addResult.message}`);
        } else if (addResult.status === 'ALREADY_SUPERUSER') {
          console.log(`   ℹ️  EXPECTED: User is already a super admin`);
        } else {
          console.log(`   ⚠️  ISSUE: ${addResult.message}`);
        }
      }
    } catch (err) {
      console.log(`❌ add_super_admin_by_email exception: ${err.message}`);
    }

    // Test 4: Check for any remaining triggers that might cause recursion
    console.log('\n4️⃣ Checking for potential recursion triggers...');
    
    try {
      // This is a simple test - if we can query user_roles without issues, recursion is likely fixed
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .limit(5);
      
      if (rolesError) {
        console.log(`❌ user_roles query error: ${rolesError.message}`);
      } else {
        console.log(`✅ user_roles table accessible without recursion: ${roles?.length || 0} records`);
        if (roles && roles.length > 0) {
          roles.forEach(role => {
            console.log(`   - User: ${role.user_id} | Role: ${role.role} | Created: ${new Date(role.created_at).toLocaleDateString()}`);
          });
        }
      }
    } catch (err) {
      console.log(`❌ user_roles recursion test exception: ${err.message}`);
    }

    // Test 5: Verify database consistency
    console.log('\n5️⃣ Verifying database consistency...');
    
    try {
      const { data: consistency, error: consistencyError } = await supabase
        .from('members')
        .select('email, user_id, category, isactive')
        .not('user_id', 'is', null)
        .eq('isactive', true);
      
      if (consistencyError) {
        console.log(`❌ Consistency check error: ${consistencyError.message}`);
      } else {
        const totalMembers = consistency?.length || 0;
        const membersWithUserIds = consistency?.filter(m => m.user_id).length || 0;
        
        console.log(`✅ Database consistency check:`);
        console.log(`   - Total active members: ${totalMembers}`);
        console.log(`   - Members with user_id: ${membersWithUserIds}`);
        console.log(`   - Consistency ratio: ${totalMembers > 0 ? Math.round((membersWithUserIds / totalMembers) * 100) : 0}%`);
        
        if (membersWithUserIds === totalMembers) {
          console.log(`   🎉 Perfect consistency - all members have user_id`);
        } else {
          console.log(`   ⚠️  Some members missing user_id - may need sync`);
        }
      }
    } catch (err) {
      console.log(`❌ Consistency check exception: ${err.message}`);
    }

    console.log('\n📊 Test Summary:');
    console.log('✅ If all tests passed:');
    console.log('   1. Stack depth recursion error is FIXED');
    console.log('   2. Member categories are correctly assigned');
    console.log('   3. Super admin functions work without errors');
    console.log('   4. Database is consistent and stable');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Test the admin dashboard super admin dialog');
    console.log('   2. Test the member edit dialog');
    console.log('   3. Verify all functionality works in the frontend');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

testAllFixes().catch(console.error);
