#!/usr/bin/env node

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

async function restorePastors() {
    console.log('🔧 Restoring Legitimate Pastors...\n');

    try {
        for (const email of LEGITIMATE_PASTORS) {
            console.log(`Checking ${email}...`);
            
            const { data: user, error: userError } = await serviceClient
                .from('members_enhanced')
                .select('id, fullname, email, category')
                .eq('email', email)
                .single();

            if (userError) {
                console.log(`   ❌ Not found: ${userError.message}`);
                continue;
            }

            console.log(`   Found: ${user.fullname}, currently ${user.category}`);
            
            if (user.category !== 'Pastors') {
                console.log(`   🔄 Updating to Pastor...`);
                
                const { error: updateError } = await serviceClient
                    .from('members_enhanced')
                    .update({ category: 'Pastors' })
                    .eq('email', email);

                if (updateError) {
                    console.log(`   ❌ Error: ${updateError.message}`);
                } else {
                    console.log(`   ✅ Updated successfully`);
                }
            } else {
                console.log(`   ✅ Already a Pastor`);
            }
        }

        // Final check
        const { data: finalPastors } = await serviceClient
            .from('members_enhanced')
            .select('fullname, email, category')
            .eq('category', 'Pastors');

        console.log(`\n✅ Final result: ${finalPastors?.length || 0} pastors:`);
        finalPastors?.forEach(pastor => {
            console.log(`   - ${pastor.fullname} (${pastor.email})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

restorePastors().catch(console.error);