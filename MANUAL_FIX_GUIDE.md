# Manual Fix Guide for Ojide Lawrence Authentication

## Problem Summary
Ojide Lawrence cannot sign in due to "Database error granting user" - this indicates an issue with the Supabase Auth system or RLS policies.

## Current Status
- ✅ Profile record exists with correct role (superuser)
- ✅ Member record exists and is active
- ✅ User_roles record exists with superuser role
- ❌ Authentication fails with "Database error granting user"

## Manual Fix Steps

### Step 1: Supabase Dashboard - Auth Section
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Look for user with email: `ojidelawrence@gmail.com`

**If user exists:**
- Check if email is confirmed (should show green checkmark)
- If not confirmed, click the user and manually confirm the email
- Reset the password to: `Fa-#8rC6DRTkd$5`
- Ensure the user is not disabled

**If user doesn't exist:**
- Click "Add user" 
- Email: `ojidelawrence@gmail.com`
- Password: `Fa-#8rC6DRTkd$5`
- Confirm email: ✅ (checked)
- User ID: `47c693aa-e85c-4450-8d35-250aa4c61587` (if possible to set)

### Step 2: Check RLS Policies
1. Go to **Database > Policies**
2. Check policies for these tables:
   - `profiles`
   - `members` 
   - `user_roles`

**Required policies for each table:**
```sql
-- For profiles table
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Superusers can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'superuser'
        )
    );

-- Similar policies needed for members and user_roles tables
```

### Step 3: SQL Console Fix
Go to **SQL Editor** and run this query:

```sql
-- Ensure the user record is properly linked
UPDATE profiles 
SET id = '47c693aa-e85c-4450-8d35-250aa4c61587'
WHERE email = 'ojidelawrence@gmail.com';

UPDATE members 
SET user_id = '47c693aa-e85c-4450-8d35-250aa4c61587'
WHERE email = 'ojidelawrence@gmail.com';

UPDATE user_roles 
SET user_id = '47c693aa-e85c-4450-8d35-250aa4c61587'
WHERE user_id IN (
    SELECT id FROM profiles WHERE email = 'ojidelawrence@gmail.com'
);

-- Verify the setup
SELECT 'Profile' as table_name, * FROM profiles WHERE email = 'ojidelawrence@gmail.com'
UNION ALL
SELECT 'Member' as table_name, email, fullname, category::text, isactive::text, user_id::text, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null FROM members WHERE email = 'ojidelawrence@gmail.com'
UNION ALL  
SELECT 'Role' as table_name, user_id::text, role, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null FROM user_roles WHERE user_id = '47c693aa-e85c-4450-8d35-250aa4c61587';
```

### Step 4: Alternative - Create New User
If the above doesn't work, create a completely new user:

1. In **Authentication > Users**, delete the existing user
2. Create new user:
   - Email: `ojidelawrence@gmail.com`
   - Password: `Fa-#8rC6DRTkd$5`
   - Confirm email: ✅
3. Note the new User ID
4. Run this SQL with the new User ID:

```sql
-- Replace NEW_USER_ID with the actual ID from step 3
INSERT INTO profiles (id, email, full_name, role, church_unit, country, join_date, membership_status, preferred_contact_method)
VALUES ('NEW_USER_ID', 'ojidelawrence@gmail.com', 'Ojide Lawrence', 'superuser', 'Administration', 'Nigeria', CURRENT_DATE, 'active', 'email')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role;

INSERT INTO members (user_id, email, fullname, category, isactive)
VALUES ('NEW_USER_ID', 'ojidelawrence@gmail.com', 'Ojide Lawrence', 'Pastors', true)
ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    isactive = EXCLUDED.isactive;

INSERT INTO user_roles (user_id, role)
VALUES ('NEW_USER_ID', 'superuser')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 5: Test Authentication
After completing the manual steps:

1. Try signing in with:
   - Email: `ojidelawrence@gmail.com`
   - Password: `Fa-#8rC6DRTkd$5`

2. Or run the test script:
```bash
node test-ojide-signin.js
```

## Common Issues and Solutions

### "Email not confirmed"
- Go to Auth > Users, click the user, and manually confirm the email

### "Invalid login credentials"
- Reset password in Supabase dashboard
- Ensure the password is exactly: `Fa-#8rC6DRTkd$5`

### "Database error granting user"
- This usually indicates RLS policy issues
- Temporarily disable RLS on the tables, test, then re-enable with proper policies

### "User not found"
- The user might have been deleted from auth.users
- Create a new user following Step 4 above

## Final Verification
Once authentication works, verify:
- ✅ Can sign in successfully
- ✅ Can access profile data
- ✅ Can access members data  
- ✅ Can access user_roles data
- ✅ Has superuser permissions

## Contact Information
If manual fixes don't work, the issue might be:
1. Supabase project configuration
2. Environment variables
3. Network/firewall issues
4. Supabase service outage

Check Supabase status page and project logs for more details.