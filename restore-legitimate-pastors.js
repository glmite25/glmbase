#!/usr/bin/env node

/**
 * Restore legitimate pastors to Pastor category
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

const LEGITIMATE_PASTORS = [
    'ojidelawrence@gmail.com',
    'admin@gospellabourministry.com'
];

async function restoreLegitimateP pastors() {
    console.log('🔧 Restoring Legitimate Pastors...\n');

    try {
        // Check if legitimate pastors exist in the system
        console.log('1. Checking for legitimate pastor accounts...');
        
        for (const email of LEGITIMATE_PASTORS) {
            const { data: user, error: userError } = await serviceClient
                .from('members_enhanced')
                .select('id, fullname, email, category')
                .eq('email', email)
                .single();

            if (userError) {
                console.log(`   - ${email}: ❌ Not found or error: ${userError.message}`);
            } else if (user) {
                console.log(`   - ${user.fullname} (${email}): Found, currently ${user.category}`);
                
                if (user.category !== 'Pastors') {
                    console.log(`     🔄 Updating to Pastor category...`);
                    
                    // Update members table
                    const { error: updateMembersError } = await serviceClient
                        .from('members')
                        .update({ category: 'Pastors' })
                        .eq('email', email);

                    // Update members_enhanced table
                    const { error: updateEnhancedError } = await serviceClient
                        .from('members_enhanced')
                        .update({ category: 'Pastors' })
                        .eq('email', email);

                    if (updateMembersError || updateEnhancedError) {
                        console.log(`     ❌ Error updating: ${updateMembersError?.message || updateEnhancedError?.message}`);
                    } else {
                        console.log(`     ✅ Successfully updated to Pastor`);
                    }
                } else {
                    console.log(`     ✅ Already has Pastor category`);
                }
            }
        }

        // Verify final state
        console.log('\n2. Final verification...');
        const { data: finalPastors, error: finalError } = await serviceClient
            .from('members_enhanced')
            .select('id, fullname, email, category')
            .eq('category', 'Pastors');

        if (finalError) {
            console.log('❌ Error in final verification:', finalError.message);
        } else {
            console.log(`\n✅ Final result: ${finalPastors.length} users with Pastor category:`);
            finalPastors.forEach(pastor => {
                console.log(`   - ${pastor.fullname} (${pastor.email})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

restoreLegitimateP pastors().catch(console.error);