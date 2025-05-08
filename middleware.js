// Middleware to handle CORS for all requests
export default function middleware(request) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '*';

  // Get the pathname from the URL
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Log the request for debugging
  console.log(`Middleware handling request for: ${pathname} from origin: ${origin}`);

  // Check if this is a preflight request (OPTIONS)
  if (request.method === 'OPTIONS') {
    // Handle CORS preflight request
    const headers = new Headers({
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,DELETE,PATCH',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    });

    // Return a 204 No Content response for preflight requests
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  // For non-OPTIONS requests, we need to forward the request and add CORS headers to the response
  // Create a headers object to be added to the response
  const responseHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,DELETE,PATCH',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };

  // Continue with the request, but add our CORS headers to the response
  return Response.next({
    headers: responseHeaders,
  });
}

// Configure the middleware to run for specific paths
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match the specific resources that are having CORS issues
    '/en',
    '/en/:path*',
    '/prompts',
    '/prompts/:path*',
    // Match any path that ends with these extensions (common static assets)
    '/(.*).json',
    '/(.*).js',
    '/(.*).css',
    // Match any path that might be a static asset
    '/assets/:path*',
    '/static/:path*',
    '/public/:path*',
    // Match any path that might be a data file
    '/data/:path*',
    '/locales/:path*',
    '/i18n/:path*',
  ],
};
