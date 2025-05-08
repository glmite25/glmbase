# API Server Deployment Guide

## Option 1: Deploy API Server to Vercel (Recommended)

1. **Create a new Vercel project**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" > "Project"
   - Import your existing Git repository

2. **Configure the project**:
   - Set the root directory to `server`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set environment variables**:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ALLOWED_ORIGINS=https://glmcms.vercel.app,http://localhost:8080
   ```

4. **Deploy the API server**:
   - Click "Deploy"
   - Note the URL of your deployed API server (e.g., `https://glmcms-api.vercel.app`)

5. **Update your frontend environment variables**:
   - Go to your frontend project in Vercel
   - Add/update the environment variable:
   ```
   VITE_API_SERVER_URL=https://glmcms-api.vercel.app/api
   ```
   - Redeploy your frontend

## Option 2: Deploy API Server to Render.com

1. **Create a new Web Service in Render**:
   - Sign up/login to [Render](https://render.com)
   - Click "New" > "Web Service"
   - Connect to your GitHub repository

2. **Configure the service**:
   - Set the root directory to `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Set environment variables** (same as Vercel)

4. **Deploy and update frontend** (same as Vercel)

## Option 3: Run API Server Locally (Development Only)

For development purposes, you can run the API server locally:

```bash
# In one terminal
cd server
npm install
npm run dev

# In another terminal
npm run dev
```

Then set your frontend to use `http://localhost:3000/api` as the API server URL.
