// This file uses environment variables for Supabase configuration.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL as string,
  SUPABASE_ANON_KEY as string,
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true, // Changed to true to enable session persistence
    detectSessionInUrl: true,
    storageKey: 'glm-auth-token',
    flowType: 'pkce',
  },
});

// Log Supabase initialization for debugging
console.log('Supabase client initialized with URL:', SUPABASE_URL);

// Add a warning if we're in development mode and using production credentials
if (import.meta.env.DEV && SUPABASE_URL?.includes('wnxclsslqgonczgtiwav')) {
  console.warn(
    'You are using production Supabase credentials in development mode. ' +
    'Consider using a development project for local development.'
  );
}