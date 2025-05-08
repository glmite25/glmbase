# Deploying the API Server to Vercel

This guide explains how to deploy the API server to Vercel to work with your frontend at glmcms.vercel.app.

## Prerequisites

- A Vercel account (the same one used for your frontend)
- Your Supabase project credentials
- Git repository with your code

## Deployment Steps

### 1. Prepare Your Repository

Make sure your repository structure has the server code in a separate folder (e.g., `/server`).

### 2. Create a New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure the project:
   - Set the root directory to `server`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 3. Set Environment Variables

Add the following environment variables in the Vercel project settings:

```
SUPABASE_URL=https://wnxclsslqgonczgtiwav.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueGNsc3NscWdvbmN6Z3Rpd2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMjc1MDksImV4cCI6MjA2MDkwMzUwOX0.AF2JNk8B1pYeA7hYjm-ZLCGbq0W4iOQXxv93x1LTmFc
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-goes-here
ALLOWED_ORIGINS=https://glmcms.vercel.app,http://localhost:8080
```

**Important**: Make sure to use your actual Supabase service role key. This is different from the anon key and has admin privileges.

### 4. Deploy

Click "Deploy" and wait for the deployment to complete.

### 5. Configure Your Frontend

Update your frontend to use the new API server URL:

1. Go to your frontend project in Vercel
2. Add an environment variable:
   ```
   VITE_API_SERVER_URL=https://your-api-server-url.vercel.app
   ```
3. Redeploy your frontend

## Testing the Deployment

After deployment, test the API server by visiting:

```
https://your-api-server-url.vercel.app/api/health
```

You should see a JSON response: `{"status":"ok","message":"Server is running"}`

## Troubleshooting

If you encounter issues:

1. Check the Vercel deployment logs
2. Verify all environment variables are set correctly
3. Make sure the Supabase service role key has the necessary permissions
4. Check if CORS is configured correctly to allow requests from your frontend

## Security Considerations

- The service role key has admin privileges. Never expose it to the client-side code.
- Only use it in server-side code that runs in a secure environment.
- Regularly rotate your Supabase keys for better security.
