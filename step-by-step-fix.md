# 🚨 Step-by-Step Superadmin Access Fix

## **The Problem**
You're getting the script content as an error, which means the SQL isn't executing properly in Supabase.

## 🔧 **Manual Fix - Copy & Paste Each Section**

### **Step 1: Check Current Status**
Copy and paste this into Supabase SQL Editor:

```sql
-- Check if superadmin exists in auth.users
SELECT 
    'Superadmin in auth.users:' as info,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'ojidelawrence@gmail.com';
```

### **Step 2: Check Member Record**
```sql
-- Check if superadmin exists in members table
SELECT 
    'Superadmin in members:' as info,
    id,
    user_id,
    email,
    fullname,
    category,
    isactive
FROM public.members 
WHERE email = 'ojidelawrence@gmail.com';
```

### **Step 3: Check Roles**
```sql
-- Check superadmin roles
SELECT 
    'Superadmin roles:' as info,
    ur.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'ojidelawrence@gmail.com';
```

### **Step 4: Disable RLS (Emergency Access)**
```sql
-- Temporarily disable RLS for emergency access
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
```

### **Step 5: Confirm Email**
```sql
-- Confirm email for superadmin
UPDATE auth.users 
SET 
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'ojidelawrence@gmail.com' 
AND email_confirmed_at IS NULL;
```

### **Step 6: Reset Password (If Needed)**
```sql
-- Reset password for superadmin
UPDATE auth.users 
SET 
    encrypted_password = crypt('NewPassword123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'ojidelawrence@gmail.com';
```

### **Step 7: Ensure Superuser Role**
```sql
-- Add superuser role if missing
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT u.id, 'superuser', NOW()
FROM auth.users u
WHERE u.email = 'ojidelawrence@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### **Step 8: Final Verification**
```sql
-- Verify everything is set up correctly
SELECT 
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    m.category as member_category,
    m.isactive as is_active,
    ur.role as user_role
FROM auth.users u
LEFT JOIN public.members m ON u.id = m.user_id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ojidelawrence@gmail.com';
```

## 🎯 **After Running These Steps**

**Try signing in with:**
- Email: `ojidelawrence@gmail.com`
- Password: `NewPassword123!` (if you ran step 6)

## ⚠️ **Important Notes**

1. **Run each section separately** - Don't copy the entire thing at once
2. **Check the results** of each step before proceeding
3. **RLS is disabled** - Your data is temporarily unprotected
4. **Change the password** to something secure after gaining access

## 🚀 **Alternative: Supabase Dashboard Fix**

If SQL doesn't work, try this:

1. **Go to Supabase Dashboard**
2. **Authentication > Users**
3. **Find ojidelawrence@gmail.com**
4. **Click "Send magic link"** or **"Reset password"**
5. **Or manually confirm the email** in the dashboard

## 📞 **If Nothing Works**

1. **Contact Supabase Support** directly
2. **Check Supabase Status** page for outages
3. **Try accessing from different browser/network**

**Start with Step 1 and let me know what results you get!**