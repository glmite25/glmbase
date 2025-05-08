# GLMCMS API Server

This is the API server for the Gospel Labour Ministry Church Management System. It provides secure server-side operations that require the Supabase service role key, such as user-member synchronization.

## Local Development

1. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to add your Supabase credentials.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The server will be available at http://localhost:3000.

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/users/sync-all` - Synchronize all users to members
- `POST /api/users/sync-by-email` - Synchronize a specific user by email

## Deployment

This API server can be deployed separately from the frontend. See the [deployment guide](../server-deployment-guide.md) for instructions.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Port to run the server on | No (default: 3000) |
| NODE_ENV | Environment (development/production) | No (default: development) |
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_ANON_KEY | Supabase anonymous key | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | Yes |
| ALLOWED_ORIGINS | Comma-separated list of allowed CORS origins | No (default: http://localhost:8080) |

## Security Considerations

- The service role key has admin privileges. Never expose it to the client-side code.
- Only use it in server-side code that runs in a secure environment.
- Regularly rotate your Supabase keys for better security.
