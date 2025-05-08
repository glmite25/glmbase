# API Server Deployment Guide

This guide explains how to deploy the API server for the GLMCMS application.

## Prerequisites

- Node.js 16+ installed on the server
- Access to Supabase project credentials
- Git repository access

## Environment Variables

The following environment variables must be set in your deployment environment:

```
PORT=3000 (or any port your hosting provider uses)
NODE_ENV=production
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

## Deployment Options

### Option 1: Vercel

1. Connect your GitHub repository to Vercel
2. Set the following settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. Add all environment variables in the Vercel dashboard
4. Deploy

### Option 2: Render

1. Create a new Web Service in Render
2. Connect to your GitHub repository
3. Set the following settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add all environment variables
5. Deploy

### Option 3: Heroku

1. Create a new Heroku app
2. Connect to your GitHub repository or use Heroku CLI to deploy
3. Add all environment variables in the Heroku dashboard
4. Deploy with: `git push heroku main`

## Verifying Deployment

After deployment, test the API server by making a request to:

```
https://your-deployed-api.com/api/health
```

You should receive a 200 OK response with a JSON message indicating the server is running.

## Troubleshooting

If you encounter issues:

1. Check the logs in your deployment platform
2. Verify all environment variables are set correctly
3. Ensure the Supabase service role key has the necessary permissions
4. Check if the allowed origins are configured correctly for CORS
