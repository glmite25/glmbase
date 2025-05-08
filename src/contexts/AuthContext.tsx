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
        console.warn("[AuthContext] Auth initialization timed out after 30 seconds");
        setIsLoading(false);
      }
    }, 30000); // 30 second timeout

    const initializeAuth = async () => {
      try {
        // Check if we can access Supabase
        try {
          // Simple test to see if Supabase is accessible
          if (!supabase || !supabase.auth) {
            throw new Error("Supabase client is not properly initialized");
          }
        } catch (supabaseError) {
          console.error("[AuthContext] Supabase client error:", supabaseError);
          // Allow the app to load even if Supabase is not available
          setIsLoading(false);
          return;
        }

        // Check if database triggers are properly installed
        try {
          await checkAndNotifyDatabaseTriggers();
        } catch (triggerError) {
          console.error("[AuthContext] Error checking database triggers:", triggerError);
          // Continue even if this fails
        }

        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          setIsSuperUser(true);
        }
        console.log("[AuthContext] Initial superuser check from localStorage:", storedSuperUserStatus);

        // Add timeout for Supabase session fetch
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Session fetch timeout")), 15000)
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
        } catch (sessionError) {
          console.error("[AuthContext] Error fetching session:", sessionError);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[AuthContext] Error initializing auth:", error);
        // Ensure we're not stuck in loading state
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener with error handling
    let subscription = { unsubscribe: () => {} };

    try {
      const authStateChange = supabase.auth.onAuthStateChange(async (event, session) => {
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

      subscription = authStateChange.data.subscription;
    } catch (error) {
      console.error("[AuthContext] Error setting up auth state change listener:", error);
      setIsLoading(false);
    }

    return () => {
      clearTimeout(authTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    // Add a safety timeout for the entire profile fetch operation
    const profileFetchTimeout = setTimeout(() => {
      console.warn('[AuthContext] Profile fetch timed out after 20 seconds');
      setIsLoading(false);
    }, 20000); // Increased from 15 seconds to 20 seconds

    try {
      console.log('[AuthContext] Fetching profile for user ID:', userId);

      // Implement retry logic for profile fetch
      let profileData = null;
      let profileError = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !profileData) {
        attempts++;
        console.log(`[AuthContext] Profile fetch attempt ${attempts}/${maxAttempts}`);

        try {
          // Add timeout for profile fetch
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Profile fetch timeout (attempt ${attempts})`)), 15000) // Increased from 10 seconds to 15 seconds
          );

          const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

          if (error) {
            console.error(`[AuthContext] Error fetching profile data (attempt ${attempts}):`, error);
            profileError = error;

            // If not the last attempt, wait before retrying
            if (attempts < maxAttempts) {
              const delay = Math.min(1000 * attempts, 3000); // Exponential backoff with max 3 seconds
              console.log(`[AuthContext] Retrying profile fetch in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } else if (data) {
            console.log(`[AuthContext] Profile data retrieved on attempt ${attempts}:`, data);
            profileData = data;
            break; // Exit the retry loop if successful
          }
        } catch (fetchError) {
          console.error(`[AuthContext] Exception in profile fetch (attempt ${attempts}):`, fetchError);
          profileError = fetchError;

          // If not the last attempt, wait before retrying
          if (attempts < maxAttempts) {
            const delay = Math.min(1000 * attempts, 3000);
            console.log(`[AuthContext] Retrying profile fetch in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // After all attempts, check if we have data or need to use fallback
      if (!profileData) {
        // If we have a stored superuser status, we can still proceed with limited functionality
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          console.log('[AuthContext] Using stored superuser status due to profile fetch error');
          setIsSuperUser(true);
          setIsAdmin(true);
          setIsLoading(false);
          clearTimeout(profileFetchTimeout);
          return;
        }

        // If we reached here, all attempts failed and we have no fallback
        if (profileError) {
          throw profileError;
        } else {
          throw new Error("Failed to fetch profile after multiple attempts");
        }
      }

      // Use the successfully retrieved profile data
      const data = profileData;
      console.log('[AuthContext] Using profile data:', data);

      // Get user data with timeout and retry logic
      let userData = null;
      let userDataAttempts = 0;
      const maxUserDataAttempts = 2;

      while (userDataAttempts < maxUserDataAttempts && !userData) {
        userDataAttempts++;
        try {
          console.log(`[AuthContext] User data fetch attempt ${userDataAttempts}/${maxUserDataAttempts}`);

          const userDataPromise = supabase.auth.getUser();
          const { data: userDataResult, error: userError } = await Promise.race([
            userDataPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`User data fetch timeout (attempt ${userDataAttempts})`)), 10000)) // Increased from 8 seconds to 10 seconds
          ]) as any;

          if (userError) {
            console.error(`[AuthContext] Error fetching user data (attempt ${userDataAttempts}):`, userError);

            // If not the last attempt, wait before retrying
            if (userDataAttempts < maxUserDataAttempts) {
              const delay = 1000; // Simple 1 second delay between attempts
              console.log(`[AuthContext] Retrying user data fetch in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } else {
            userData = userDataResult;
            console.log(`[AuthContext] User data retrieved on attempt ${userDataAttempts}:`, userData);
          }
        } catch (userDataError) {
          console.error(`[AuthContext] Exception fetching user data (attempt ${userDataAttempts}):`, userDataError);

          // If not the last attempt, wait before retrying
          if (userDataAttempts < maxUserDataAttempts) {
            const delay = 1000;
            console.log(`[AuthContext] Retrying user data fetch in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Create profile data with what we have
      const userProfile: Profile = {
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
      setProfile(userProfile);

      // Fetch role data with timeout and retry logic
      let roleData = [];
      let roleDataAttempts = 0;
      const maxRoleDataAttempts = 2;

      while (roleDataAttempts < maxRoleDataAttempts) {
        roleDataAttempts++;
        try {
          console.log(`[AuthContext] Role data fetch attempt ${roleDataAttempts}/${maxRoleDataAttempts}`);

          const rolePromise = supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

          const { data: roleDataResult, error } = await Promise.race([
            rolePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Role data fetch timeout (attempt ${roleDataAttempts})`)), 10000)) // Increased from 8 seconds to 10 seconds
          ]) as any;

          if (error) {
            console.error(`[AuthContext] Error fetching role data (attempt ${roleDataAttempts}):`, error);

            // If not the last attempt, wait before retrying
            if (roleDataAttempts < maxRoleDataAttempts) {
              const delay = 1000; // Simple 1 second delay between attempts
              console.log(`[AuthContext] Retrying role data fetch in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } else {
            roleData = roleDataResult || [];
            console.log(`[AuthContext] Role data retrieved on attempt ${roleDataAttempts}:`, roleData);
            break; // Exit the retry loop if successful
          }
        } catch (roleError) {
          console.error(`[AuthContext] Exception fetching role data (attempt ${roleDataAttempts}):`, roleError);

          // If not the last attempt, wait before retrying
          if (roleDataAttempts < maxRoleDataAttempts) {
            const delay = 1000;
            console.log(`[AuthContext] Retrying role data fetch in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      console.log('[AuthContext] Role data retrieved:', roleData);

      // Determine admin and superuser status from database roles
      const isUserAdmin = roleData.some(r => r.role === 'admin');
      const isUserSuperAdmin = roleData.some(r => r.role === 'superuser');

      // Also check superuser status by email (legacy method)
      const userEmail = data.email?.toLowerCase() || userData?.user?.email?.toLowerCase() || '';
      console.log('[AuthContext] Checking superuser status for email:', userEmail);
      const isSuperAdminByEmail = checkSuperUserStatus(userEmail);
      const forceSuperAdmin = false;
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';

      // User is a superuser if they have the role in the database OR they're in the email list OR they have it in localStorage
      const finalSuperUserStatus = isUserSuperAdmin || isSuperAdminByEmail || forceSuperAdmin || storedSuperUserStatus;

      if (finalSuperUserStatus) {
        console.log('[AuthContext] User is a superadmin!');
        setSuperUserStatus(true);
      } else {
        clearSuperUserStatus();
      }

      console.log('[AuthContext] User authorization determined:', {
        email: userEmail,
        isAdmin: isUserAdmin,
        isSuperAdminByEmail,
        isUserSuperAdmin,
        storedSuperUserStatus,
        forceSuperAdmin,
        finalIsSuperUser: finalSuperUserStatus,
        finalIsAdmin: isUserAdmin || finalSuperUserStatus
      });

      setIsAdmin(isUserAdmin || finalSuperUserStatus);
      setIsSuperUser(finalSuperUserStatus);
    } catch (error) {
      console.error('[AuthContext] Error in fetchProfile:', error);

      // Check if we have a stored superuser status as a fallback
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
      if (storedSuperUserStatus) {
        console.log('[AuthContext] Using stored superuser status due to profile fetch error in catch block');
        setIsSuperUser(true);
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setIsSuperUser(false);
      }

      // Create a minimal profile with user ID if we have it
      if (userId) {
        console.log('[AuthContext] Creating minimal profile with user ID:', userId);
        setProfile({
          id: userId,
          email: null,
          full_name: null,
          updated_at: null,
          church_unit: null,
          assigned_pastor: null,
          phone: null,
          genotype: null,
          address: null
        });
      }
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
