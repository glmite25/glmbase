#!/usr/bin/env node

/**
 * Create Ojide Lawrence Auth User
 * This script creates the user in auth.users table using signup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';
const SUPERADMIN_PASSWORD = 'Fa-#8rC6DRTkd$5';
const EXPECTED_USER_ID = '47c693aa-e85c-4450-8d35-250aa4c61587';

async function createAuthUser() {
    console.log('👤 Creating Ojide Lawrence auth user...\n');
    
    try {
        // Create regular client for signup
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );
        
        