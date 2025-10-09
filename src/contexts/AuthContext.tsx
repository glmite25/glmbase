import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/member';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperUser: boolean;
  profile: Profile | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  isSuperUser: false,
  profile: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...');

        // Set a timeout to prevent infinite loading
        authTimeout = setTimeout(() => {
          if (mounted && isLoading) {
            console.warn('[AuthContext] Auth initialization timed out, forcing completion');
            setIsLoading(false);
          }
        }, 10000); // 10 second timeout

        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        let session = null;
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
          session = result.data?.session;
        } catch {
          console.warn('[AuthContext] Session fetch timed out, checking localStorage fallback');
          // Check localStorage for stored admin status as fallback
          const storedAdminStatus = localStorage.getItem('glm-is-admin') === 'true';
          const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';

          if (storedAdminStatus || storedSuperUserStatus) {
            console.log('[AuthContext] Using stored admin status as fallback');
            setIsAdmin(storedAdminStatus);
            setIsSuperUser(storedSuperUserStatus);
          }

          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          if (session?.user) {
            console.log('[AuthContext] User found:', session.user.email);
            setUser(session.user);
            await fetchUserProfile(session.user.id, session.user);
          } else {
            console.log('[AuthContext] No active session');
            // Check localStorage for stored admin status
            const storedAdminStatus = localStorage.getItem('glm-is-admin') === 'true';
            const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';

            if (storedAdminStatus || storedSuperUserStatus) {
              console.log('[AuthContext] Using stored admin status');
              setIsAdmin(storedAdminStatus);
              setIsSuperUser(storedSuperUserStatus);
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Init error:', error);
        if (mounted) {
          // Emergency fallback for critical admin emails
          const storedAdminStatus = localStorage.getItem('glm-is-admin') === 'true';
          const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';

          if (storedAdminStatus || storedSuperUserStatus) {
            console.log('[AuthContext] Using stored admin status after error');
            setIsAdmin(storedAdminStatus);
            setIsSuperUser(storedSuperUserStatus);
          }

          setIsLoading(false);
        }
      }
    };

    const fetchUserProfile = async (userId: string, user?: any) => {
      try {
        console.log('[AuthContext] Fetching profile for:', userId);

        // Add timeout for profile fetch
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );

        let profileData = null;
        try {
          const result = await Promise.race([profilePromise, timeoutPromise]) as any;
          profileData = result.data;

          if (result.error) {
            console.warn('[AuthContext] Profile fetch error:', result.error.message);
          }
        } catch {
          console.warn('[AuthContext] Profile fetch timed out');
        }

        if (mounted && profileData) {
          setProfile(profileData);
          console.log('[AuthContext] Profile loaded:', profileData.email);
        }

        // Check user roles from database with timeout
        let rolesData = null;
        try {
          const rolesPromise = supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

          const rolesTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Roles fetch timeout')), 3000)
          );

          const rolesResult = await Promise.race([rolesPromise, rolesTimeoutPromise]) as any;
          rolesData = rolesResult.data;

          if (rolesResult.error) {
            console.warn('[AuthContext] Roles fetch error:', rolesResult.error.message);
          }
        } catch (rolesError) {
          console.warn('[AuthContext] Roles fetch failed or timed out:', rolesError);
        }

        let hasAdminRole = false;
        let hasSuperUserRole = false;

        if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map(r => r.role);
          hasAdminRole = roles.includes('admin') || roles.includes('superuser' as any);
          hasSuperUserRole = roles.includes('superuser' as any);
          console.log('[AuthContext] Database roles found:', roles);
        } else {
          console.log('[AuthContext] No database roles found, checking fallback methods');

          // Fallback: Check if user is in a predefined admin list
          const adminEmails = [
            'ojidelawrence@gmail.com',
            'admin@gospellabourministry.com',
            'superadmin@gospellabourministry.com'
          ];

          const userEmail = profileData?.email || user?.email;
          if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
            hasAdminRole = true;
            hasSuperUserRole = userEmail.toLowerCase() === 'ojidelawrence@gmail.com';
            console.log('[AuthContext] Admin access granted via email whitelist');

            // Store in localStorage for persistence
            localStorage.setItem('glm-is-admin', 'true');
            if (hasSuperUserRole) {
              localStorage.setItem('glm-is-superuser', 'true');
            }
          }
        }

        if (mounted) {
          setIsAdmin(hasAdminRole);
          setIsSuperUser(hasSuperUserRole);
          console.log('[AuthContext] Final admin status:', { hasAdminRole, hasSuperUserRole });
        }

      } catch (error) {
        console.error('[AuthContext] Profile fetch error:', error);

        // Emergency fallback for critical admin emails
        const adminEmails = [
          'ojidelawrence@gmail.com',
          'admin@gospellabourministry.com',
          'superadmin@gospellabourministry.com'
        ];

        const userEmail = user?.email;
        if (mounted && userEmail && adminEmails.includes(userEmail.toLowerCase())) {
          const isSuperUser = userEmail.toLowerCase() === 'ojidelawrence@gmail.com';
          setIsAdmin(true);
          setIsSuperUser(isSuperUser);
          localStorage.setItem('glm-is-admin', 'true');
          if (isSuperUser) {
            localStorage.setItem('glm-is-superuser', 'true');
          }
          console.log('[AuthContext] Emergency admin access granted for:', userEmail);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchUserProfile(session.user.id, session.user);
          } else {
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
            setIsSuperUser(false);
            // Clear stored admin status on sign out
            localStorage.removeItem('glm-is-admin');
            localStorage.removeItem('glm-is-superuser');
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isLoading,
    isAdmin,
    isSuperUser,
    profile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};