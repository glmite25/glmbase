# Update Your .env File

Replace these lines in your .env file:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYmRud2tpcGF3cmVmdGl4dmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTgzMjQsImV4cCI6MjA3NDY5NDMyNH0.I_ftWDaf6RA2IOGqV_gzp0l9Tew_WYAk483Rbesoc3o
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYmRud2tpcGF3cmVmdGl4dmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTgzMjQsImV4cCI6MjA3NDY5NDMyNH0.I_ftWDaf6RA2IOGqV_gzp0l9Tew_WYAk483Rbesoc3o
```

With:

```
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

## After updating the service role key, run:

```bash
node check-superusers-simple.js
```

This will:
1. Show you how many superusers you currently have
2. Make ojidelawrence@gmail.com a superadmin
3. Give access to the superadmin dashboard