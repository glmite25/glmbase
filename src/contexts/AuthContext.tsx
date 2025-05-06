import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkSuperUserStatus, setSuperUserStatus, clearSuperUserStatus } from "@/utils/superuser-fix";
import { checkAndNotifyDatabaseTriggers } from "@/utils/checkDatabaseTriggers";

export type UserRole = 'user' | 'admin' | 'superuser';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  updated_at: string | null;
  church_unit: string | null;
  assigned_pastor: string | null;
  phone: string | null;
  genotype: string | null;
  address: string | null;
  role?: UserRole;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperUser: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  isSuperUser: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);

  // Function to clear all auth-related storage
  const clearAuthStorage = () => {
    console.log("Clearing all auth storage");

    // Clear Supabase auth tokens
    localStorage.removeItem('glm-auth-token');
    localStorage.removeItem('supabase.auth.token');

    // Clear any other auth-related items
    localStorage.removeItem('supabase.auth.refreshToken');
    localStorage.removeItem('supabase.auth.accessToken');

    // Clear any session cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear session storage items too
    sessionStorage.removeItem('glm-auth-token');
    sessionStorage.removeItem('supabase.auth.token');
  };

  useEffect(() => {
    // Add a safety timeout to prevent infinite loading
    const authTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("[AuthContext] Auth initialization timed out after 10 seconds");
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    const initializeAuth = async () => {
      try {
        // Check if database triggers are properly installed
        await checkAndNotifyDatabaseTriggers();

        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          setIsSuperUser(true);
        }
        console.log("[AuthContext] Initial superuser check from localStorage:", storedSuperUserStatus);

        // Add timeout for Supabase session fetch
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session fetch timeout")), 5000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        console.log("[AuthContext] Initial session check:", session ? "Session exists" : "No session", session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          if (storedSuperUserStatus) {
            console.log("[AuthContext] No session but superuser status found in localStorage");
            setIsSuperUser(true);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[AuthContext] Error initializing auth:", error);
        // Ensure we're not stuck in loading state
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth state changed:", event, session ? "Session exists" : "No session", session);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          await fetchProfile(session.user.id);
        } catch (error) {
          console.error("[AuthContext] Error in auth state change handler:", error);
          setIsLoading(false);
        }
      } else {
        console.log("[AuthContext] User logged out or session expired");
        setProfile(null);
        setIsAdmin(false);
        setIsSuperUser(false);
        setIsLoading(false);

        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          console.log(`[AuthContext] ${event} event detected, clearing state`);
          clearSuperUserStatus();
          clearAuthStorage();
        }
      }
    });

    return () => {
      clearTimeout(authTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    // Add a safety timeout for the entire profile fetch operation
    const profileFetchTimeout = setTimeout(() => {
      console.warn('[AuthContext] Profile fetch timed out after 8 seconds');
      setIsLoading(false);
    }, 8000);

    try {
      console.log('[AuthContext] Fetching profile for user ID:', userId);

      // Add timeout for profile fetch
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('[AuthContext] Error fetching profile data:', error);
        // Don't throw, continue with partial data if possible
        // If we have a stored superuser status, we can still proceed
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          console.log('[AuthContext] Using stored superuser status due to profile fetch error');
          setIsSuperUser(true);
          setIsAdmin(true);
          setIsLoading(false);
          clearTimeout(profileFetchTimeout);
          return;
        }
        throw error;
      }

      console.log('[AuthContext] Profile data retrieved:', data);

      // Get user data with timeout
      let userData = null;
      try {
        const userDataPromise = supabase.auth.getUser();
        const { data: userDataResult, error: userError } = await Promise.race([
          userDataPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("User data fetch timeout")), 3000))
        ]) as any;

        if (userError) {
          console.error('[AuthContext] Error fetching user data:', userError);
        } else {
          userData = userDataResult;
        }
      } catch (userDataError) {
        console.error('[AuthContext] Exception fetching user data:', userDataError);
      }

      // Create profile data with what we have
      const profileData: Profile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        updated_at: data.updated_at,
        church_unit: userData?.user?.user_metadata?.church_unit || null,
        assigned_pastor: userData?.user?.user_metadata?.assigned_pastor || null,
        phone: (data as any).phone || null,
        genotype: (data as any).genotype || null,
        address: (data as any).address || null,
        role: (data as any).role
      };
      setProfile(profileData);

      // Fetch role data with timeout
      let roleData = [];
      try {
        const rolePromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const { data: roleDataResult, error } = await Promise.race([
          rolePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Role data fetch timeout")), 3000))
        ]) as any;

        if (error) {
          console.error('[AuthContext] Error fetching role data:', error);
        } else {
          roleData = roleDataResult || [];
        }
      } catch (roleError) {
        console.error('[AuthContext] Exception fetching role data:', roleError);
      }

      console.log('[AuthContext] Role data retrieved:', roleData);

      // Determine admin status
      const isUserAdmin = roleData.some(r => r.role === 'admin');

      // Check superuser status
      const userEmail = data.email?.toLowerCase() || userData?.user?.email?.toLowerCase() || '';
      console.log('[AuthContext] Checking superuser status for email:', userEmail);
      const isSuperAdmin = checkSuperUserStatus(userEmail);
      const forceSuperAdmin = false;
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
      const finalSuperUserStatus = isSuperAdmin || forceSuperAdmin || storedSuperUserStatus;

      if (finalSuperUserStatus) {
        console.log('[AuthContext] User is a superadmin!');
        setSuperUserStatus(true);
      } else {
        clearSuperUserStatus();
      }

      console.log('[AuthContext] User authorization determined:', {
        email: userEmail,
        isAdmin: isUserAdmin,
        isSuperAdmin,
        storedSuperUserStatus,
        forceSuperAdmin,
        finalIsSuperUser: finalSuperUserStatus,
        finalIsAdmin: isUserAdmin || finalSuperUserStatus
      });

      setIsAdmin(isUserAdmin || finalSuperUserStatus);
      setIsSuperUser(finalSuperUserStatus);
    } catch (error) {
      console.error('[AuthContext] Error in fetchProfile:', error);
      setIsAdmin(false);
      setIsSuperUser(false);
    } finally {
      clearTimeout(profileFetchTimeout);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, isAdmin, isSuperUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
