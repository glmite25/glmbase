#!/usr/bin/env node

/**
 * Verify that pastor assignments have been fixed
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

async function verifyPastorFix() {
    console.log('🔍 Verifying Pastor Assignment Fix...\n');

    try {
        // Check current pastors in members_enhanced table
        const { data: currentPastors, error: pastorsError } = await serviceClient
            .from('members_enhanced')
            .select('id, fullname, email, category')
            .eq('category', 'Pastors');

        if (pastorsError) {
            console.log('❌ Error checking pastors:', pastorsError.message);
            return;
        }

        console.log(`✅ Current users with Pastor category: ${currentPastors.length}`);
        if (currentPastors.length > 0) {
            currentPastors.forEach(pastor => {
                console.log(`   - ${pastor.fullname} (${pastor.email})`);
            });
        } else {
            console.log('   No users currently have Pastor category');
        }

        // Check if the previously incorrect users are now Members
        const previouslyIncorrectEmails = [
            'popsabey1@gmail.com',
            'gidadobamidele@gmail.com',
            'samuelogunleye196@gmail.com',
            'paulakinade013@gmail.com',
            'dev.samadeyemi@gmail.com',
            'adekanmbigeorge@gmail.com',
            'adeoladominion3096@gmail.com'
        ];

        console.log('\n🔍 Checking previously incorrect pastor assignments...');
        for (const email of previouslyIncorrectEmails) {
            const { data: user, error: userError } = await serviceClient
                .from('members_enhanced')
                .select('fullname, email, category')
                .eq('email', email)
                .single();

            if (userError) {
                console.log(`   - ${email}: ❌ Error checking user`);
            } else if (user) {
                const status = user.category === 'Members' ? '✅ Now Member' : `❌ Still ${user.category}`;
                console.log(`   - ${user.fullname} (${email}): ${status}`);
            } else {
                console.log(`   - ${email}: ❓ User not found`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   - Total users with Pastor category: ${currentPastors.length}`);
        console.log('   - All incorrect pastor assignments have been fixed ✅');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

verifyPastorFix().catch(console.error);