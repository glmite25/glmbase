/**
 * Superadmin Verification Functions
 * Reusable functions to verify superadmin account status across all tables
 */

import { createClient } from '@supabase/supabase-js';

const SUPERADMIN_EMAIL = 'ojidelawrence@gmail.com';

/**
 * Create Supabase client with service role for admin operations
 */
export function createServiceRoleClient() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing required environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Verify auth.users record exists and is properly configured
 */
export async function verifyAuthUsersRecord(supabase = null) {
    const client = supabase || createServiceRoleClient();
    
    try {
        const { data: authUser, error } = await client.auth.admin.getUserByEmail(SUPERADMIN_EMAIL);
        
        if (error) {
            return {
                exists: false,
                error: error.message,
                issues: ['Failed to query auth.users table']
            };
        }

        if (!authUser.user) {
            return {
                exists: false,
                issues: ['No auth.users record found']
            };
        }

        const user = authUser.user;
        const issues = [];

        if (!user.email_confirmed_at) {
            issues.push('Email not confirmed');
        }

        if (!user.last_sign_in_at) {
            issues.push('User has never signed in');
        }

        return {
            exists: true,
            user: user,
            issues: issues,
            isHealthy: issues.length === 0
        };
    } catch (err) {
        return {
            exists: false,
            error: err.message,
            issues: ['Exception checking auth.users']
        };
    }
}

/**
 * Verify profiles record exists and has correct role
 */
export async function verifyProfilesRecord(userId = null, supabase = null) {
    const client = supabase || createServiceRoleClient();
    
    try {
        const { data: profile, error } = await client
            .from('profiles')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();

        if (error && error.code !== 'PGRST116') {
            return {
                exists: false,
                error: error.message,
                issues: ['Failed to query profiles table']
            };
        }

        if (!profile) {
            return {
                exists: false,
                issues: ['No profiles record found']
            };
        }

        const issues = [];

        if (userId && profile.id !== userId) {
            issues.push('Profile ID does not match auth.users ID');
        }

        if (profile.role !== 'superuser') {
            issues.push(`Profile role is '${profile.role}', expected 'superuser'`);
        }

        return {
            exists: true,
            profile: profile,
            issues: issues,
            isHealthy: issues.length === 0
        };
    } catch (err) {
        return {
            exists: false,
            error: err.message,
            issues: ['Exception checking profiles table']
        };
    }
}/**

 * Verify members record exists and is properly configured
 */
export async function verifyMembersRecord(userId = null, supabase = null) {
    const client = supabase || createServiceRoleClient();
    
    try {
        const { data: member, error } = await client
            .from('members')
            .select('*')
            .eq('email', SUPERADMIN_EMAIL)
            .single();

        if (error && error.code !== 'PGRST116') {
            return {
                exists: false,
                error: error.message,
                issues: ['Failed to query members table']
            };
        }

        if (!member) {
            return {
                exists: false,
                issues: ['No members record found']
            };
        }

        const issues = [];

        if (userId && member.user_id !== userId) {
            issues.push('Member user_id does not match auth.users ID');
        }

        if (!member.isactive) {
            issues.push('Member record is marked as inactive');
        }

        if (!member.category || !['Pastors', 'Members', 'MINT'].includes(member.category)) {
            issues.push(`Member category '${member.category}' may need adjustment`);
        }

        return {
            exists: true,
            member: member,
            issues: issues,
            isHealthy: issues.length === 0
        };
    } catch (err) {
        return {
            exists: false,
            error: err.message,
            issues: ['Exception checking members table']
        };
    }
}

/**
 * Verify user_roles record exists with superuser role
 */
export async function verifyUserRolesRecord(userId, supabase = null) {
    const client = supabase || createServiceRoleClient();
    
    if (!userId) {
        return {
            exists: false,
            issues: ['No user ID provided for user_roles check']
        };
    }
    
    try {
        const { data: userRoles, error } = await client
            .from('user_roles')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            return {
                exists: false,
                error: error.message,
                issues: ['Failed to query user_roles table']
            };
        }

        if (!userRoles || userRoles.length === 0) {
            return {
                exists: false,
                issues: ['No user_roles records found']
            };
        }

        const issues = [];
        const superuserRole = userRoles.find(role => role.role === 'superuser');
        
        if (!superuserRole) {
            issues.push('No superuser role found in user_roles');
        }

        return {
            exists: true,
            userRoles: userRoles,
            hasSuperuserRole: !!superuserRole,
            issues: issues,
            isHealthy: issues.length === 0
        };
    } catch (err) {
        return {
            exists: false,
            error: err.message,
            issues: ['Exception checking user_roles table']
        };
    }
}/**

 * Test authentication with superadmin credentials
 */
export async function testSuperadminAuthentication(supabase = null) {
    try {
        // Create a regular client for testing authentication
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !anonKey) {
            return {
                success: false,
                error: 'Missing environment variables for authentication test',
                issues: ['VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set']
            };
        }

        const testClient = createClient(supabaseUrl, anonKey);
        
        const { data, error } = await testClient.auth.signInWithPassword({
            email: SUPERADMIN_EMAIL,
            password: 'Fa-#8rC6DRTkd$5'
        });

        if (error) {
            return {
                success: false,
                error: error.message,
                issues: ['Authentication failed with provided credentials']
            };
        }

        if (!data.user) {
            return {
                success: false,
                issues: ['Authentication returned no user data']
            };
        }

        // Test accessing protected data
        const { data: profileData, error: profileError } = await testClient
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        const issues = [];
        if (profileError) {
            issues.push(`Failed to access profile data: ${profileError.message}`);
        }

        // Clean up - sign out
        await testClient.auth.signOut();

        return {
            success: true,
            user: data.user,
            canAccessProfile: !profileError,
            issues: issues,
            isHealthy: issues.length === 0
        };
    } catch (err) {
        return {
            success: false,
            error: err.message,
            issues: ['Exception during authentication test']
        };
    }
}

/**
 * Run comprehensive verification of all superadmin components
 */
export async function runComprehensiveVerification(supabase = null) {
    const client = supabase || createServiceRoleClient();
    
    console.log('🔍 Running comprehensive superadmin verification...');
    
    // Check auth.users
    const authCheck = await verifyAuthUsersRecord(client);
    console.log(`Auth Users: ${authCheck.exists ? '✅' : '❌'} ${authCheck.issues.join(', ')}`);
    
    const userId = authCheck.user?.id;
    
    // Check profiles
    const profileCheck = await verifyProfilesRecord(userId, client);
    console.log(`Profiles: ${profileCheck.exists ? '✅' : '❌'} ${profileCheck.issues.join(', ')}`);
    
    // Check members
    const memberCheck = await verifyMembersRecord(userId, client);
    console.log(`Members: ${memberCheck.exists ? '✅' : '❌'} ${memberCheck.issues.join(', ')}`);
    
    // Check user_roles
    const rolesCheck = await verifyUserRolesRecord(userId, client);
    console.log(`User Roles: ${rolesCheck.exists ? '✅' : '❌'} ${rolesCheck.issues.join(', ')}`);
    
    // Test authentication
    const authTest = await testSuperadminAuthentication();
    console.log(`Authentication: ${authTest.success ? '✅' : '❌'} ${authTest.issues.join(', ')}`);
    
    const allIssues = [
        ...authCheck.issues,
        ...profileCheck.issues,
        ...memberCheck.issues,
        ...rolesCheck.issues,
        ...authTest.issues
    ];
    
    return {
        timestamp: new Date().toISOString(),
        email: SUPERADMIN_EMAIL,
        userId: userId,
        checks: {
            authUsers: authCheck,
            profiles: profileCheck,
            members: memberCheck,
            userRoles: rolesCheck,
            authentication: authTest
        },
        summary: {
            totalIssues: allIssues.length,
            isHealthy: allIssues.length === 0,
            allRecordsExist: authCheck.exists && profileCheck.exists && memberCheck.exists && rolesCheck.exists,
            canAuthenticate: authTest.success
        },
        allIssues: allIssues
    };
}

/**
 * Quick health check - returns boolean for overall superadmin health
 */
export async function quickHealthCheck(supabase = null) {
    try {
        const verification = await runComprehensiveVerification(supabase);
        return verification.summary.isHealthy && verification.summary.canAuthenticate;
    } catch (err) {
        console.error('Health check failed:', err);
        return false;
    }
}