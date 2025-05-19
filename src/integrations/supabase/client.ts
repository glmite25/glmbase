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
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'glm-auth-token',
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'glmcms-web-app',
        // Add cache control headers globally
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      fetch: (url, options = {}) => {
        // Add retry logic for fetch operations
        const fetchWithRetry = async (attempt = 1, maxAttempts = 5) => {
          try {
            // Add cache-busting for auth-related requests
            const isAuthRequest = url.toString().includes('/auth/');

            if (isAuthRequest) {
              // For auth requests, add cache-busting parameters
              const urlObj = new URL(url.toString());
              urlObj.searchParams.append('_cb', Date.now().toString());
              url = urlObj.toString() as any;
            }

            return await fetch(url, options);
          } catch (error: any) {
            console.warn(`Supabase fetch error (attempt ${attempt}/${maxAttempts}):`, error);

            if (attempt < maxAttempts) {
              // Exponential backoff: 1s, 2s, 4s, etc.
              const delay = Math.pow(2, attempt - 1) * 1000;
              console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchWithRetry(attempt + 1, maxAttempts);
            }
            throw error;
          }
        };

        return fetchWithRetry();
      },
    },
  }
);

// Log Supabase initialization for debugging
console.log('Supabase client initialized with URL:', SUPABASE_URL);

// Add a warning if we're in development mode and using production credentials
if (import.meta.env.DEV && SUPABASE_URL?.includes('wnxclsslqgonczgtiwav')) {
  console.warn(
    'You are using production Supabase credentials in development mode. ' +
    'Consider using a development project for local development.'
  );
}