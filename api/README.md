# Vercel Serverless Functions for User-Member Synchronization

This directory contains Vercel Serverless Functions that handle the API endpoints for user-member synchronization in the GLMCMS application.

## API Endpoints

### Health Check
- **Endpoint**: `/api/health`
- **Method**: GET
- **Description**: Checks if the API is available and can connect to Supabase
- **Response**: 
  ```json
  {
    "status": "ok",
    "message": "API server is running",
    "available": true
  }
  ```

### Sync All Users
- **Endpoint**: `/api/users/sync-all`
- **Method**: POST
- **Description**: Synchronizes all users from auth.users to the members table
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Sync completed: X profiles created, Y members created, Z members updated",
    "results": {
      "profilesCreated": 0,
      "membersCreated": 0,
      "membersUpdated": 0,
      "errors": []
    }
  }
  ```

### Sync User by Email
- **Endpoint**: `/api/users/sync-by-email`
- **Method**: POST
- **Body**: 
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Description**: Synchronizes a specific user by email
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Successfully added member with email: user@example.com",
    "member": { ... }
  }
  ```

## Environment Variables

These functions require the following environment variables to be set in your Vercel project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (required for admin operations)

## Security Considerations

- The Supabase service role key has admin privileges. It is securely stored as an environment variable in Vercel and only used in server-side code.
- CORS headers are set to allow requests from your frontend domain.
- All API endpoints validate input data before processing.

## Deployment

These functions are automatically deployed with your Vercel project. No separate deployment is needed.

## Local Development

To test these functions locally:

1. Install Vercel CLI:
   ```
   npm i -g vercel
   ```

2. Run the development server:
   ```
   vercel dev
   ```

This will start a local server that simulates the Vercel Functions environment.
