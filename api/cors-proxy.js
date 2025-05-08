// API endpoint to handle CORS for specific resources
// This acts as a CORS proxy for resources like 'en' and 'prompts'

// Set CORS headers
const setCorsHeaders = (res) => {
  // Allow requests from any origin with credentials
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Allow the following HTTP methods
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  // Allow the following headers
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
};

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(204).end();
  }
  
  // Set CORS headers for all responses
  setCorsHeaders(res);
  
  // Get the resource path from the query parameters
  const { resource } = req.query;
  
  if (!resource) {
    return res.status(400).json({
      error: 'Missing resource parameter',
      message: 'Please provide a resource parameter'
    });
  }
  
  try {
    // Log the request for debugging
    console.log(`CORS proxy handling request for resource: ${resource}`);
    
    // Fetch the resource
    const response = await fetch(resource);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch resource: ${resource}`,
        status: response.status,
        statusText: response.statusText
      });
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type');
    
    // Set the content type in the response
    res.setHeader('Content-Type', contentType || 'application/json');
    
    // If it's JSON, parse and return it
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(200).json(data);
    }
    
    // For other content types, return the raw data
    const data = await response.text();
    return res.status(200).send(data);
    
  } catch (error) {
    console.error('Error in CORS proxy:', error);
    return res.status(500).json({
      error: 'Error fetching resource',
      message: error.message
    });
  }
}
