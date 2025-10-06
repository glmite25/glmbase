import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperUser: boolean;
  profile: any;
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
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...');
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Session error:', error.message);
        }

        if (mounted) {
          if (session?.user) {
            console.log('[AuthContext] User found:', session.user.email);
            setUser(session.user);
            await fetchUserProfile(session.user.id, session.user);
          } else {
            console.log('[AuthContext] No active session');
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Init error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const fetchUserProfile = async (userId: string, user?: any) => {
      try {
        console.log('[AuthContext] Fetching profile for:', userId);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.warn('[AuthContext] Profile fetch error:', profileError.message);
        }

        if (mounted && profileData) {
          setProfile(profileData);
          console.log('[AuthContext] Profile loaded:', profileData.email);
        }

        // Check user roles from database first
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        let hasAdminRole = false;
        let hasSuperUserRole = false;

        if (!rolesError && rolesData && rolesData.length > 0) {
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
          
          if (profileData?.email && adminEmails.includes(profileData.email.toLowerCase())) {
            hasAdminRole = true;
            hasSuperUserRole = profileData.email.toLowerCase() === 'ojidelawrence@gmail.com';
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
        
        // Emergency fallback for critical admin email
        if (mounted && user?.email === 'ojidelawrence@gmail.com') {
          setIsAdmin(true);
          setIsSuperUser(true);
          localStorage.setItem('glm-is-admin', 'true');
          localStorage.setItem('glm-is-superuser', 'true');
          console.log('[AuthContext] Emergency admin access granted');
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
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
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