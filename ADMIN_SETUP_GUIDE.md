# Complete Admin System Setup Guide

This guide explains the complete admin system for Gospel Labour Ministry, including user-member synchronization and all admin features.

## 🚀 Quick Setup

### 1. Run the Complete Admin Setup
```bash
node run-admin-setup.js
```

This will automatically:
- Set up the complete database schema
- Create the admin user in Supabase Auth
- Set up user profiles and member records
- Enable automatic user-member synchronization
- Clean up any mock data
- Configure all admin roles and permissions

### 2. Login as Admin
- Go to `/auth` or click "Login" 
- Use email: `ojidelawrence@gmail.com`
- Use password: `AdminPassword123!` (change this on first login)

## 🛡️ Admin Features

### Admin Access Points
1. **Header Admin Button** - Prominent button visible when logged in as admin
2. **Floating Admin Button** - Available on all non-admin pages
3. **User Avatar Dropdown** - Contains admin dashboard link
4. **Direct URL Access** - Navigate to `/admin` directly

### Admin Roles
- **Admin**: Can manage members, events, sermons, testimonies, prayer requests, visitors
- **Super Admin**: Full system access including user management, financial records, analytics, system settings

### New Admin Features
- **Real-time Statistics Dashboard** - Live stats on members, events, donations, sermons
- **Advanced Members Management** - Full CRUD operations with auth synchronization
- **Sermons Management** - Upload, organize, and manage sermon content
- **User-Member Synchronization** - Automatic sync between auth users and members table
- **Comprehensive Analytics** - Detailed insights and reporting
- **Financial Management** - Track donations, expenses, and financial records
- **Visitor Management** - Track and follow up with church visitors
- **Communication Tools** - Manage member communications and outreach

## 🔧 How It Works

### Authentication Flow
1. User logs in normally
2. System checks for admin roles in database
3. Fallback to email whitelist for emergency access
4. Admin status stored in localStorage for performance

### Admin Email Whitelist
These emails automatically get admin access:
- `ojidelawrence@gmail.com` (Super Admin)
- `admin@gospellabourministry.com` (Admin)
- `superadmin@gospellabourministry.com` (Super Admin)

### Database Tables
- `profiles` - User profile information
- `user_roles` - Role assignments (admin, superuser)
- `members` - Church members (synced with auth users)
- `sermons` - Sermon content and metadata
- `testimonies` - Member testimonies
- `prayer_requests` - Prayer requests from members
- `financial_records` - Donations and financial transactions
- `visitors` - Church visitor records
- `communication_logs` - Member communication history
- `system_settings` - Application configuration
- `audit_logs` - System activity tracking

### User-Member Synchronization
- **Automatic Sync**: All new user registrations automatically create member records
- **Real-time Updates**: Profile changes sync between auth and members tables
- **Data Integrity**: Triggers ensure consistency between systems
- **Mock Data Cleanup**: Removes any test data not linked to real users

## 🎯 Admin Dashboard Features

### Navigation
- **Dashboard** - Overview with real-time statistics
- **Analytics** - Detailed reports and insights (Super Admin)
- **Members Management** - Complete member database with auth sync
- **Pastors Management** - Manage pastoral staff
- **Events Management** - Create and manage church events
- **Sermons Management** - Upload, organize, and manage sermons
- **Testimonies** - Approve and manage member testimonies
- **Prayer Requests** - Manage and respond to prayer requests
- **Financial Records** - Track donations and expenses (Super Admin)
- **Visitors** - Manage visitor records and follow-ups
- **Communications** - Member outreach and messaging
- **User Management** - Manage user accounts and roles (Super Admin)
- **System Settings** - Configure application settings (Super Admin)

### Church Units Management
- 3H Media
- 3H Music  
- 3H Movies
- 3H Security
- Discipleship
- Praise Feet
- Cloven Tongues
- Auxano Group

## 🔒 Security Features

### Multi-Layer Authentication
1. **Database Role Check** - Primary method
2. **Email Whitelist** - Fallback for critical users
3. **localStorage Persistence** - Performance optimization
4. **Emergency Access** - Fail-safe for main admin

### Access Control
- Admin routes protected by authentication
- Role-based feature access
- Automatic redirects for unauthorized users

## 🛠️ Troubleshooting

### Admin Access Issues
1. **Clear browser cache and localStorage**
2. **Run the setup script again**
3. **Check database connectivity**
4. **Verify environment variables**

### Common Problems
- **"Not authorized"** - Run setup script or check email whitelist
- **"Loading forever"** - Clear localStorage and refresh
- **"Database error"** - Check Supabase connection

### Manual Admin Setup
If the script fails, manually:
1. Create user in Supabase Auth dashboard
2. Add record to `profiles` table
3. Add record to `user_roles` table with role 'superuser'

## 📱 Mobile Support

The admin interface is fully responsive:
- Mobile-friendly sidebar
- Touch-optimized controls
- Responsive admin buttons
- Mobile navigation menu

## 🔄 User-Member Synchronization

### How It Works
1. **New Registration**: When a user registers, a member record is automatically created
2. **Profile Updates**: Changes to user profiles sync to member records
3. **Data Consistency**: Database triggers ensure data stays in sync
4. **Mock Data Removal**: Setup script removes any test data not linked to real users

### Sync Features
- **Automatic Creation**: All auth users get member records
- **Real-time Updates**: Profile changes immediately sync
- **Category Assignment**: Admin emails automatically get "Pastors" category
- **Status Management**: Active/inactive status based on auth status
- **Data Validation**: Ensures email consistency between systems

### Manual Sync
If sync gets out of alignment, use the admin dashboard:
1. Go to Members Management
2. Click "Sync with Auth" button
3. System will reconcile any differences

## 🔄 Updates and Maintenance

### Adding New Admins
1. Add email to whitelist in `AuthContext.tsx`
2. Or use the admin dashboard to assign roles
3. Or run setup script with different email

### Removing Admin Access
1. Delete from `user_roles` table
2. Remove from email whitelist
3. Clear user's localStorage

### Database Maintenance
- **Regular Backups**: System creates automatic backups
- **Audit Logs**: All admin actions are logged
- **Performance Monitoring**: Built-in query optimization

## 📞 Support

For admin setup issues:
1. Check the browser console for errors
2. Verify Supabase connection
3. Run diagnostics: `node check-admin-setup.js`
4. Contact system administrator

---

## 🎉 Success Indicators

When admin setup is working correctly, you should see:
- ✅ Admin button in header (when logged in)
- ✅ Floating admin button on pages
- ✅ Admin option in user avatar dropdown
- ✅ Access to `/admin` dashboard
- ✅ No authentication errors in console

The admin system is now enterprise-ready with seamless login and robust access control!