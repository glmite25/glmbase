# Manual Setup Guide for ojidelawrence@gmail.com

If the automated scripts don't work, follow these manual steps:

## Step 1: Check Your .env File

Make sure your `.env` file has the correct keys:

```env
VITE_SUPABASE_URL=https://spbdnwkipawreftixvfu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key, NOT the anon key.

## Step 2: Create User Account in Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Authentication → Users**
4. Click **"Add user"**
5. Fill in:
   - **Email:** `ojidelawrence@gmail.com`
   - **Password:** `Fa-#8rC6DRTkd$5`
   - **Auto Confirm User:** ✅ Yes
6. Click **"Create user"**

## Step 3: Create Database Tables

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy and paste this SQL:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  phone text,
  address text,
  church_unit text,
  assigned_pastor text,
  genotype text,
  role text DEFAULT 'user',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fullname text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  address text,
  category text NOT NULL DEFAULT 'Members',
  title text,
  assignedto uuid,
  churchunit text,
  churchunits text[],
  auxanogroup text,
  joindate date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  isactive boolean NOT NULL DEFAULT true,
  userid uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for members
CREATE POLICY "Members can view active members" ON public.members
  FOR SELECT USING (isactive = true);
```

4. Click **"Run"** to execute the SQL

## Step 4: Add Profile Record

1. Still in SQL Editor, run this query:

```sql
-- Get the user ID for ojidelawrence@gmail.com
-- (Replace 'USER_ID_HERE' with the actual ID from the auth.users table)

INSERT INTO public.profiles (id, email, full_name, role, church_unit)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'ojidelawrence@gmail.com'),
  'ojidelawrence@gmail.com',
  'Lawrence Ojide',
  'superuser',
  'Administration'
);
```

## Step 5: Add Member Record

```sql
INSERT INTO public.members (fullname, email, category, title, churchunit, isactive, userid)
VALUES (
  'Lawrence Ojide',
  'ojidelawrence@gmail.com',
  'Pastors',
  'System Administrator',
  'Administration',
  true,
  (SELECT id FROM auth.users WHERE email = 'ojidelawrence@gmail.com')
);
```

## Step 6: Test Sign-in

1. Go to your website
2. Click **"Login"**
3. Enter:
   - **Email:** `ojidelawrence@gmail.com`
   - **Password:** `Fa-#8rC6DRTkd$5`
4. You should now be able to sign in and see admin features

## Troubleshooting

### If you get "Invalid login credentials":
- Check that the user exists in Authentication → Users
- Verify the email is confirmed (should show a checkmark)
- Make sure you're using the exact password: `Fa-#8rC6DRTkd$5`

### If you get "Bad Request" errors:
- Make sure the tables were created successfully
- Check that the SQL queries ran without errors
- Verify the table names are correct (profiles, members)

### If admin features don't show:
- Check that the profile record exists with role = 'superuser'
- Verify the member record exists with category = 'Pastors'
- Clear your browser cache and try again

## Quick Verification Queries

To check if everything is set up correctly:

```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'ojidelawrence@gmail.com';

-- Check profile
SELECT * FROM public.profiles WHERE email = 'ojidelawrence@gmail.com';

-- Check member record
SELECT * FROM public.members WHERE email = 'ojidelawrence@gmail.com';
```

All three queries should return data for the setup to be complete.