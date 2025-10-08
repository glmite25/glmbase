#!/usr/bin/env node

/**
 * Remove users incorrectly assigned as pastors
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceKey);

// Define the legitimate pastors (update these emails as needed)
const LEGITIMATE_PASTORS = [
    'ojidelawrence@gmail.com',
    'admin@gospellabourministry.com'
];

async function removeIncorrectPastors() {
    console.log('🔍 Checking for incorrectly assigned pastors...\n');

    try {
        // First, check current pastors in both tables
        console.log('1. Checking members table...');
        const { data: membersWithPastorCategory, error: membersError } = await serviceClient
            .from('members')
            .select('id, fullname, email, category')
            .eq('category', 'Pastors');

        if (membersError) {
            console.log('❌ Error checking members table:', membersError.message);
        } else {
            console.log(`Found ${membersWithPastorCategory.length} users with Pastor category in members table:`);
            membersWithPastorCategory.forEach(member => {
                const isLegitimate = LEGITIMATE_PASTORS.includes(member.email);
                console.log(`   - ${member.fullname} (${member.email}) ${isLegitimate ? '✅ LEGITIMATE' : '❌ INCORRECT'}`);
            });
        }

        // Check members_enhanced table
        console.log('\n2. Checking members_enhanced table...');
        const { data: enhancedWithPastorCategory, error: enhancedError } = await serviceClient
            .from('members_enhanced')
            .select('id, fullname, email, category')
            .eq('category', 'Pastors');

        if (enhancedError) {
            console.log('❌ Error checking members_enhanced table:', enhancedError.message);
        } else {
            console.log(`Found ${enhancedWithPastorCategory.length} users with Pastor category in members_enhanced table:`);
            enhancedWithPastorCategory.forEach(member => {
                const isLegitimate = LEGITIMATE_PASTORS.includes(member.email);
                console.log(`   - ${member.fullname} (${member.email}) ${isLegitimate ? '✅ LEGITIMATE' : '❌ INCORRECT'}`);
            });
        }

        // Ask for confirmation before proceeding
        console.log('\n⚠️  READY TO REMOVE INCORRECT PASTOR ASSIGNMENTS');
        console.log('This will change the category from "Pastors" to "Members" for users not in the legitimate pastors list.');
        console.log('\nLegitimate pastors (will NOT be changed):');
        LEGITIMATE_PASTORS.forEach(email => console.log(`   - ${email}`));

        // For now, let's just show what would be changed
        console.log('\n📋 USERS THAT WOULD BE CHANGED:');
        
        if (membersWithPastorCategory) {
            const incorrectInMembers = membersWithPastorCategory.filter(member => 
                !LEGITIMATE_PASTORS.includes(member.email)
            );
            
            if (incorrectInMembers.length > 0) {
                console.log('\nIn members table:');
                incorrectInMembers.forEach(member => {
                    console.log(`   - ${member.fullname} (${member.email})`);
                });
            }
        }

        if (enhancedWithPastorCategory) {
            const incorrectInEnhanced = enhancedWithPastorCategory.filter(member => 
                !LEGITIMATE_PASTORS.includes(member.email)
            );
            
            if (incorrectInEnhanced.length > 0) {
                console.log('\nIn members_enhanced table:');
                incorrectInEnhanced.forEach(member => {
                    console.log(`   - ${member.fullname} (${member.email})`);
                });
            }
        }

        console.log('\n🔧 To proceed with the fix, uncomment the update sections below and run again.');

        // UNCOMMENT THESE SECTIONS TO ACTUALLY PERFORM THE UPDATES:
        
        /*
        // Update members table
        if (membersWithPastorCategory) {
            const incorrectEmails = membersWithPastorCategory
                .filter(member => !LEGITIMATE_PASTORS.includes(member.email))
                .map(member => member.email);
            
            if (incorrectEmails.length > 0) {
                console.log('\n3. Updating members table...');
                const { error: updateMembersError } = await serviceClient
                    .from('members')
                    .update({ category: 'Members' })
                    .in('email', incorrectEmails);
                
                if (updateMembersError) {
                    console.log('❌ Error updating members table:', updateMembersError.message);
                } else {
                    console.log(`✅ Updated ${incorrectEmails.length} users in members table`);
                }
            }
        }

        // Update members_enhanced table
        if (enhancedWithPastorCategory) {
            const incorrectEmails = enhancedWithPastorCategory
                .filter(member => !LEGITIMATE_PASTORS.includes(member.email))
                .map(member => member.email);
            
            if (incorrectEmails.length > 0) {
                console.log('\n4. Updating members_enhanced table...');
                const { error: updateEnhancedError } = await serviceClient
                    .from('members_enhanced')
                    .update({ category: 'Members' })
                    .in('email', incorrectEmails);
                
                if (updateEnhancedError) {
                    console.log('❌ Error updating members_enhanced table:', updateEnhancedError.message);
                } else {
                    console.log(`✅ Updated ${incorrectEmails.length} users in members_enhanced table`);
                }
            }
        }
        */

    } catch (error) {
        console.error('Error:', error);
    }
}

removeIncorrectPastors().catch(console.error);