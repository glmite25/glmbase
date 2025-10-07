# Superadmin Authentication Diagnostics

This directory contains comprehensive diagnostic and verification utilities for troubleshooting superadmin authentication issues in the Gospel Labour Ministry church management system.

## Files Overview

### Core Diagnostic Files

1. **`superadmin-diagnostic-queries.sql`** - Raw SQL queries for manual database inspection
2. **`superadmin-diagnostic-script.js`** - Comprehensive diagnostic script with detailed reporting
3. **`superadmin-verification-functions.js`** - Reusable verification functions for other scripts
4. **`run-superadmin-diagnostics.js`** - Main runner script with CLI interface

### Generated Files

- **`superadmin-diagnostic-report-[timestamp].json`** - Detailed diagnostic reports (auto-generated)

## Usage

### Quick Health Check

```bash
# Using npm script (recommended)
npm run superadmin:quick-check

# Or directly
node run-superadmin-diagnostics.js --quick
```

This performs a fast check and returns:
- ✅ if superadmin account is healthy and can authenticate
- ❌ if there are issues (with suggestion to run full diagnostics)

### Full Diagnostic Suite

```bash
# Using npm script (recommended)
npm run superadmin:diagnose

# Or directly
node run-superadmin-diagnostics.js
```

This runs comprehensive diagnostics including:
- Auth.users table verification
- Profiles table verification  
- Members table verification
- User_roles table verification
- RLS policy analysis
- Authentication testing
- Detailed issue reporting with recommendations

### Manual SQL Queries

You can also run the SQL queries directly in your Supabase SQL editor:

```sql
-- Copy and paste queries from superadmin-diagnostic-queries.sql
-- Each query is documented with its purpose
```

## What the Diagnostics Check

### 1. Auth.users Table
- ✅ Account exists for ojidelawrence@gmail.com
- ✅ Email is confirmed (email_confirmed_at is set)
- ✅ Account is not locked or disabled
- ⚠️ Password encryption status

### 2. Profiles Table
- ✅ Profile record exists
- ✅ Profile ID matches auth.users ID
- ✅ Role is set to 'superuser'
- ✅ Email consistency

### 3. Members Table
- ✅ Member record exists
- ✅ user_id matches auth.users ID
- ✅ Member is active (isactive = true)
- ⚠️ Category is appropriate

### 4. User_roles Table
- ✅ Role assignment exists
- ✅ user_id matches auth.users ID
- ✅ Role is 'superuser'

### 5. Authentication Testing
- ✅ Can sign in with credentials
- ✅ Can access protected data after authentication
- ✅ JWT token is valid

### 6. RLS Policies
- ⚠️ Policies don't block superadmin access
- ⚠️ No circular dependencies in policy evaluation

## Common Issues and Solutions

### Issue: "No auth.users record found"
**Solution:** Run task 3 to create/fix the auth.users record

### Issue: "Email not confirmed"
**Solution:** Update email_confirmed_at in auth.users table

### Issue: "Authentication failed with provided credentials"
**Solution:** Reset password in auth.users table (task 3)

### Issue: "No profiles record found"
**Solution:** Run task 4 to create consistent profile record

### Issue: "No superuser role found"
**Solution:** Run task 5 to configure role assignment

### Issue: "Failed to access profile data after authentication"
**Solution:** Review and update RLS policies (task 6)

## Environment Requirements

Make sure these environment variables are set:

```env
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Integration with Other Scripts

The verification functions can be imported and used in other scripts:

```javascript
import { 
    verifyAuthUsersRecord,
    verifyProfilesRecord,
    runComprehensiveVerification,
    quickHealthCheck 
} from './superadmin-verification-functions.js';

// Quick check
const isHealthy = await quickHealthCheck();

// Detailed verification
const report = await runComprehensiveVerification();
```

## Troubleshooting

### Script Fails to Run
1. Ensure Node.js is installed
2. Check environment variables are set
3. Verify Supabase connection

### Permission Errors
1. Ensure SUPABASE_SERVICE_ROLE_KEY has admin privileges
2. Check RLS policies aren't blocking service role access

### Database Connection Issues
1. Verify VITE_SUPABASE_URL is correct
2. Check network connectivity
3. Ensure Supabase project is active

## Next Steps

After running diagnostics:

1. **If issues found:** Proceed with tasks 2-9 in the implementation plan
2. **If healthy:** Superadmin authentication is working correctly
3. **For ongoing monitoring:** Set up periodic health checks

## Support

For additional help:
- Check the diagnostic report JSON file for detailed error information
- Review the implementation plan tasks for specific fixes
- Consult the design document for system architecture details