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
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(`Supabase connection error: ${error.message}`);
    }
    
    // Return success response
    return res.status(200).json({
      status: 'ok',
      message: 'API server is running',
      available: true
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: `Error: ${error.message}`,
      available: false
    });
  }
}
