// This file uses environment variables for Supabase configuration.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase credentials from environment variables
// Use hardcoded values as fallback if environment variables are not available
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wnxclsslqgonczgtiwav.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueGNsc3NscWdvbmN6Z3Rpd2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMjc1MDksImV4cCI6MjA2MDkwMzUwOX0.AF2JNk8B1pYeA7hYjm-ZLCGbq0W4iOQXxv93x1LTmFc';

// Log environment variable status
console.log('Environment variables loaded:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Found' : 'Not found',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Found' : 'Not found'
});

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Using fallback values.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Create the Supabase client with error handling
let supabase;
try {
  supabase = createClient<Database>(
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
    }
  );
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  // Create a dummy client that will show a clear error message when used
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: new Error('Supabase client failed to initialize') }),
      onAuthStateChange: () => ({ unsubscribe: () => {} }),
    },
    from: () => ({
      select: () => ({ error: new Error('Supabase client failed to initialize') }),
    }),
  } as any;
}

export { supabase };

// Log Supabase initialization for debugging
console.log('Supabase client initialized with URL:', SUPABASE_URL);

// Add a warning if we're in development mode and using production credentials
if (import.meta.env.DEV && SUPABASE_URL?.includes('wnxclsslqgonczgtiwav')) {
  console.warn(
    'You are using production Supabase credentials in development mode. ' +
    'Consider using a development project for local development.'
  );
}