// API Server configuration

// Get the API server URL from environment variables or use a default
export const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3000';

// Check if we're in a production environment
export const isProduction = import.meta.env.PROD || false;

// Function to check if the API server is available
export const checkApiServerAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_SERVER_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout to avoid long waits
      signal: AbortSignal.timeout(5000),
    });
    
    return response.ok;
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
    const response = await fetch(`${API_SERVER_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        url: API_SERVER_URL,
        environment: isProduction ? 'production' : 'development',
        message: data.message || 'Server is running',
      };
    }
    
    return {
      available: false,
      url: API_SERVER_URL,
      environment: isProduction ? 'production' : 'development',
      message: `Server returned status ${response.status}`,
    };
  } catch (error) {
    return {
      available: false,
      url: API_SERVER_URL,
      environment: isProduction ? 'production' : 'development',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
