#!/usr/bin/env node

/**
 * Fix pastor assignments - remove incorrect pastors and set them as members
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

// Define the legitimate pastors
const LEGITIMATE_PASTORS = [
    'ojidelawrence@gmail.com',
    'admin@gospellabourministry.com'
];

async function fixPastorAssignments() {
    console.log('🔧 Fixing Pastor Assignments...\n');

    try {
        // Get all current pastors
        const { data: currentPastors, error: pastorsError } = await serviceClient
            .from('members_enhanced')
            .select('id, fullname, email, category')
            .eq('category', 'Pastors');

        if (pastorsError) {
            console.log('❌ Error getting current pastors:', pastorsError.message);
            return;
        }

        console.log(`Found ${currentPastors.length} users currently assigned as pastors:`);
        currentPastors.forEach(pastor => {
            const isLegitimate = LEGITIMATE_PASTORS.includes(pastor.email);
            console.log(`   - ${pastor.fullname} (${pastor.email}) ${isLegitimate ? '✅' : '❌'}`);
        });

        // Get emails of users to demote
        const emailsToUpdate = currentPastors
            .filter(pastor => !LEGITIMATE_PASTORS.includes(pastor.email))
            .map(pastor => pastor.email);

        if (emailsToUpdate.length === 0) {
            console.log('\n✅ No incorrect pastor assignments found!');
            return;
        }

        console.log(`\n🔄 Updating ${emailsToUpdate.length} users from "Pastors" to "Members"...`);

        // Update members table
        console.log('\n1. Updating members table...');
        const { error: updateMembersError } = await serviceClient
            .from('members')
            .update({ category: 'Members' })
            .in('email', emailsToUpdate);

        if (updateMembersError) {
            console.log('❌ Error updating members table:', updateMembersError.message);
        } else {
            console.log('✅ Successfully updated members table');
        }

        // Update members_enhanced table
        console.log('\n2. Updating members_enhanced table...');
        const { error: updateEnhancedError } = await serviceClient
            .from('members_enhanced')
            .update({ category: 'Members' })
            .in('email', emailsToUpdate);

        if (updateEnhancedError) {
            console.log('❌ Error updating members_enhanced table:', updateEnhancedError.message);
        } else {
            console.log('✅ Successfully updated members_enhanced table');
        }

        // Verify the changes
        console.log('\n3. Verifying changes...');
        const { data: remainingPastors, error: verifyError } = await serviceClient
            .from('members_enhanced')
            .select('id, fullname, email, category')
            .eq('category', 'Pastors');

        if (verifyError) {
            console.log('❌ Error verifying changes:', verifyError.message);
        } else {
            console.log(`\n✅ Verification complete! Now ${remainingPastors.length} users have Pastor category:`);
            remainingPastors.forEach(pastor => {
                console.log(`   - ${pastor.fullname} (${pastor.email})`);
            });
        }

        console.log('\n🎉 Pastor assignment fix completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Demoted ${emailsToUpdate.length} users from Pastor to Member`);
        console.log(`   - ${remainingPastors.length} legitimate pastors remain`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixPastorAssignments().catch(console.error);