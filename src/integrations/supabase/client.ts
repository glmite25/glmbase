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
      debug: true, // Enable debug mode for auth
    },
    global: {
      headers: {
        'X-Client-Info': 'glmcms-web-app',
      },
      fetch: (url, options = {}) => {
        // Add retry logic for fetch operations with improved error handling
        const fetchWithRetry = async (attempt = 1, maxAttempts = 5) => { // Increased max attempts to 5
          try {
            // Add cache-busting for auth-related requests
            const isAuthRequest = url.toString().includes('/auth/');

            if (isAuthRequest) {
              // For auth requests, add cache-busting parameters
              const urlObj = new URL(url.toString());
              urlObj.searchParams.append('_cb', Date.now().toString());

              // Add cache control headers for auth requests
              options.headers = {
                ...options.headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              };

              url = urlObj.toString() as any;
            }

            // Set a longer timeout for auth requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort();
            }, isAuthRequest ? 30000 : 15000); // 30 seconds for auth, 15 for others

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              return response;
            } catch (fetchError) {
              clearTimeout(timeoutId);
              throw fetchError;
            }
          } catch (error: any) {
            // More detailed error logging
            const isAbortError = error.name === 'AbortError';
            const errorType = isAbortError ? 'timeout' : 'network';

            console.warn(
              `Supabase fetch ${errorType} error (attempt ${attempt}/${maxAttempts}):`,
              error,
              `URL: ${url.toString().split('?')[0]}` // Log URL without query params for privacy
            );

            if (attempt < maxAttempts) {
              // Exponential backoff with jitter: 1-2s, 2-4s, 4-8s, etc.
              const baseDelay = Math.pow(2, attempt - 1) * 1000;
              const jitter = Math.random() * 1000; // Add up to 1 second of jitter
              const delay = baseDelay + jitter;

              console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchWithRetry(attempt + 1, maxAttempts);
            }

            // If we've exhausted all retries, throw a more informative error
            if (error.name === 'AbortError') {
              throw new Error(`Request timed out after ${attempt} attempts`);
            }
            throw error;
          }
        };

        return fetchWithRetry();
      },
    },
    // Add debug mode for development
    debug: import.meta.env.DEV,
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