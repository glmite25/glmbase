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
            await fetchUserProfile(session.user.id);
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

    const fetchUserProfile = async (userId: string) => {
      try {
        console.log('[AuthContext] Fetching profile for:', userId);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.warn('[AuthContext] Profile fetch error:', profileError.message);
          return;
        }

        if (mounted && profileData) {
          setProfile(profileData);
          console.log('[AuthContext] Profile loaded:', profileData.email);
        }

        // Check user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (rolesError) {
          console.warn('[AuthContext] Roles fetch error:', rolesError.message);
          return;
        }

        if (mounted && rolesData) {
          const roles = rolesData.map(r => r.role);
          setIsAdmin(roles.includes('admin'));
          setIsSuperUser(roles.includes('admin')); // For now, admin = super user
          console.log('[AuthContext] User roles:', roles);
        }

        // Check localStorage for stored admin status
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        const storedAdminStatus = localStorage.getItem('glm-is-admin') === 'true';
        
        if (storedSuperUserStatus || storedAdminStatus) {
          setIsAdmin(true);
          setIsSuperUser(storedSuperUserStatus);
          console.log('[AuthContext] Using stored admin status');
        }

      } catch (error) {
        console.error('[AuthContext] Profile fetch error:', error);
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
            await fetchUserProfile(session.user.id);
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