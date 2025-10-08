# Signup Database Error Fix Instructions

## Problem
New users are unable to sign up and receive the error: "Database error saving new user. This could be due to: A temporary database connection issue. The email address is already in use. Required fields are missing. Please try again or use a different email address."

## Root Cause
The issue is caused by problematic database triggers on the `auth.users` table that are failing when new users are created. These triggers were likely created during previous database setup attempts and are now interfering with the signup process.

## Solution

### Step 1: Apply the Database Fix

**Option A: Manual SQL Execution (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `MANUAL_SIGNUP_FIX.sql`
5. Click "Run" to execute the SQL

**Option B: Using the Script**
```bash
# If you have the service role key configured
node simple-signup-fix.js
```

### Step 2: Test the Fix

After applying the fix, test the signup process:

1. Go to your website's signup page
2. Try creating a new account with a test email
3. The signup should now work without database errors

### Step 3: Verify the Fix

Run the test script to verify everything is working:
```bash
node test-signup-process.js
```

## What the Fix Does

1. **Removes Problematic Triggers**: Drops all database triggers on `auth.users` that were causing the signup failures
2. **Fixes Table Permissions**: Updates RLS policies on `profiles` and `members` tables to allow new user creation
3. **Creates Safe Helper Function**: Adds a `create_user_profile_safe` function that can be used to create user profiles without triggers
4. **Grants Proper Permissions**: Ensures both authenticated and anonymous users can create the necessary records during signup

## Files Modified

- `src/utils/createUserProfile.ts` - Updated to use the new safe helper function
- `MANUAL_SIGNUP_FIX.sql` - SQL script to fix the database issues
- `simple-signup-fix.js` - Automated fix script
- `test-signup-process.js` - Test script to verify the fix

## Expected Results

After applying this fix:
- ✅ New users can sign up without database errors
- ✅ User profiles are created properly
- ✅ Member records are created automatically
- ✅ Existing functionality remains intact

## Troubleshooting

If signup still fails after applying the fix:

1. **Check Supabase Logs**: Go to Supabase Dashboard > Logs to see detailed error messages
2. **Verify Environment Variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
3. **Check Network**: Ensure your application can connect to Supabase
4. **Test with Different Email**: Try with a completely new email address

## Prevention

To prevent this issue in the future:
- Avoid creating complex triggers on `auth.users` table
- Use RPC functions instead of triggers for user creation logic
- Test signup functionality after any database schema changes

## Support

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Review Supabase dashboard logs
3. Ensure all environment variables are properly configured
4. Contact support with specific error messages and steps to reproduce