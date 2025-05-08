// API Server configuration

// Get the base URL for API calls
// In production, this will use the same domain as the frontend (Vercel Serverless Functions)
// In development, it will use the environment variable or localhost
export const API_SERVER_URL = import.meta.env.PROD
  ? '' // Empty string means use the same domain
  : (import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3000');

// Check if we're in a production environment
export const isProduction = import.meta.env.PROD || false;

// Function to check if the API server is available
export const checkApiServerAvailability = async (): Promise<boolean> => {
  try {
    const healthEndpoint = `${API_SERVER_URL}/api/health`;
    console.log(`Checking API server availability at: ${healthEndpoint}`);

    const response = await fetch(healthEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout to avoid long waits
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();
    console.log('API server health check response:', data);

    return response.ok && data.available === true;
  } catch (error) {
    console.error('API server availability check failed:', error);
    return false;
  }
};

// Function to get the API server status with detailed information
export const getApiServerStatus = async (): Promise<{
  available: boolean;
  url: string;
  environment: string;
  message: string;
}> => {
  try {
    const healthEndpoint = `${API_SERVER_URL}/api/health`;
    console.log(`Getting API server status from: ${healthEndpoint}`);

    const response = await fetch(healthEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        available: data.available === true,
        url: isProduction ? window.location.origin : API_SERVER_URL,
        environment: isProduction ? 'production' : 'development',
        message: data.message || 'Server is running',
      };
    }

    return {
      available: false,
      url: isProduction ? window.location.origin : API_SERVER_URL,
      environment: isProduction ? 'production' : 'development',
      message: `Server returned status ${response.status}`,
    };
  } catch (error) {
    return {
      available: false,
      url: isProduction ? window.location.origin : API_SERVER_URL,
      environment: isProduction ? 'production' : 'development',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
