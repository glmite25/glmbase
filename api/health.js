// Health check endpoint for Vercel Serverless Functions
import { createClient } from '@supabase/supabase-js';

// Set CORS headers
const setCorsHeaders = (res) => {
  // Allow requests from any origin with credentials
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Allow the following HTTP methods
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  // Allow the following headers
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  setCorsHeaders(res);

  try {
    // Check if Supabase credentials are available
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase configuration is missing',
        available: false
      });
    }

    // Create a Supabase client to test the connection
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test the connection by making a simple query
    console.log('Testing Supabase connection...');
    const startTime = Date.now();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
        .timeout(8000); // 8 second timeout

      const responseTime = Date.now() - startTime;

      if (error) {
        console.error('Supabase connection error:', error);
        throw new Error(`Supabase connection error: ${error.message}`);
      }

      console.log(`Supabase connection successful (${responseTime}ms)`);

      // Return success response with detailed information
      return res.status(200).json({
        status: 'ok',
        message: 'API server is running and Supabase connection is healthy',
        available: true,
        diagnostics: {
          responseTime: `${responseTime}ms`,
          supabaseUrl: supabaseUrl.replace(/^(https?:\/\/[^\/]+).*$/, '$1'), // Only show the domain for security
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown'
        }
      });
    } catch (queryError) {
      const responseTime = Date.now() - startTime;
      console.error('Supabase query error:', queryError);

      return res.status(500).json({
        status: 'error',
        message: `Supabase query error: ${queryError.message}`,
        available: false,
        diagnostics: {
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown'
        }
      });
    }
  } catch (error) {
    console.error('Health check error:', error);

    return res.status(500).json({
      status: 'error',
      message: `Error: ${error.message}`,
      available: false,
      diagnostics: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        errorType: error.name || 'Unknown',
        errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}
