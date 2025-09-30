// This file uses environment variables for Supabase configuration.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase credentials from environment variables
// Handle both VITE_ prefixed and non-prefixed variables for compatibility
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    envKeys: Object.keys(import.meta.env).filter(key => key.includes('SUPABASE'))
  });
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Create a more efficient Supabase client with better timeout handling
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
      // Reduce auth operation timeouts
      storageOptions: {
        // Set a shorter expiry time for the session to force more frequent refreshes
        expiryMargin: 60 * 15 // 15 minutes in seconds
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'glmcms-web-app',
        // Add cache control headers globally
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      fetch: (url, options = {}) => {
        // Add retry logic with better timeout handling
        const fetchWithRetry = async (attempt = 1, maxAttempts = 3) => {
          // Create an AbortController for this fetch attempt
          const controller = new AbortController();

          // Set a timeout appropriate to the type of request
          const isAuthRequest = url.toString().includes('/auth/');
          const isProfileRequest = url.toString().includes('/profiles');

          // Shorter timeouts for subsequent attempts
          const timeoutMs = isAuthRequest
            ? Math.min(15000, 20000 / attempt) // Auth requests: 20s, 10s, 6.7s
            : isProfileRequest
              ? Math.min(10000, 15000 / attempt) // Profile requests: 15s, 7.5s, 5s
              : Math.min(8000, 12000 / attempt); // Other requests: 12s, 6s, 4s

          // Set the timeout
          const timeoutId = setTimeout(() => {
            console.warn(`Supabase fetch timeout after ${timeoutMs}ms (attempt ${attempt}/${maxAttempts})`);
            controller.abort();
          }, timeoutMs);

          try {
            // Add cache-busting for non-auth requests only
            if (!url.toString().includes('/auth/')) {
              const urlObj = new URL(url.toString());
              urlObj.searchParams.append('_cb', Date.now().toString());
              url = urlObj.toString() as any;
            }

            // Add the signal to the options
            const fetchOptions = {
              ...options,
              signal: controller.signal
            };

            // Execute the fetch
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            return response;
          } catch (error: any) {
            clearTimeout(timeoutId);

            // Check if this was an abort error (timeout)
            const isAbortError = error.name === 'AbortError';
            console.warn(
              `Supabase fetch ${isAbortError ? 'timeout' : 'error'} (attempt ${attempt}/${maxAttempts}):`,
              isAbortError ? `Request timed out after ${timeoutMs}ms` : error
            );

            if (attempt < maxAttempts) {
              // Exponential backoff with jitter
              const baseDelay = Math.pow(2, attempt - 1) * 500; // Start with 500ms
              const jitter = Math.random() * 300; // Add up to 300ms of jitter
              const delay = baseDelay + jitter;

              console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchWithRetry(attempt + 1, maxAttempts);
            }

            // If we've exhausted all retries, throw a more informative error
            if (isAbortError) {
              throw new Error(`Request timed out after ${attempt} attempts`);
            }
            throw error;
          }
        };

        return fetchWithRetry();
      },
    },
    // Reduce realtime timeout
    realtime: {
      timeout: 30000, // 30 seconds
    }
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