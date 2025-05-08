import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON bodies

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:8080',
  'https://glmcms.vercel.app'
];
console.log('Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`Blocked request from disallowed origin: ${origin}`);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    console.log(`Allowed request from origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true
}));

// Create Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL in .env file. Please add it and restart the server.');
  process.exit(1);
}

if (!supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-goes-here') {
  console.error(`
========================================================================
ERROR: Missing or invalid SUPABASE_SERVICE_ROLE_KEY in .env file.

To get your service role key:
1. Go to your Supabase dashboard: https://app.supabase.com/
2. Select your project
3. Go to Project Settings > API
4. Copy the "service_role" key
5. Add it to your server/.env file as SUPABASE_SERVICE_ROLE_KEY

Example:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc...

Note: Keep this key secure and never commit it to version control!
========================================================================
`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/users', require('./routes/users'));

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
