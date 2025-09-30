import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkSuperUserStatus, setSuperUserStatus, clearSuperUserStatus, getSuperUserStatus } from "@/utils/superuser-fix";
import { checkAndNotifyDatabaseTriggers } from "@/utils/databaseChecks";

// Define the user role type
type UserRole = "admin" | "user" | "superuser";

// Define the Profile interface
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
  date_of_birth: string | null;
  role?: UserRole;
}

// Define the context type
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperUser: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isSuperUser: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user profile with retry mechanism
  const fetchProfile = async (userId: string) => {
    console.log(`[AuthContext] Fetching profile for user ${userId}`);

    // Set a timeout for profile fetching but make it longer
    const profileFetchTimeout = setTimeout(() => {
      console.warn('[AuthContext] Profile fetch timed out after 60 seconds');
      setIsLoading(false);
    }, 60000); // Increased to 60 seconds

    try {
      // Add timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      console.log(`[AuthContext] Fetching profile with timestamp: ${timestamp}`);

      // Try to fetch profile with retry logic
      let profileData = null;
      let profileError = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !profileData) {
        try {
          if (retryCount > 0) {
            console.log(`[AuthContext] Retry attempt ${retryCount} for profile fetch`);
            // Add exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 500));
          }

          const result = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (result.error) {
            profileError = result.error;
            console.warn(`[AuthContext] Profile fetch attempt ${retryCount + 1} failed:`, profileError);
          } else {
            profileData = result.data;
            profileError = null;
            console.log(`[AuthContext] Profile fetch succeeded on attempt ${retryCount + 1}`);
            break;
          }
        } catch (err) {
          profileError = err;
          console.warn(`[AuthContext] Profile fetch attempt ${retryCount + 1} exception:`, err);
        }

        retryCount++;
      }

      // Use the result of our retry attempts
      const data = profileData;
      const error = profileError;

      if (error) {
        console.error("[AuthContext] Error fetching profile:", error);

        // Get user data directly from auth.users as fallback
        console.log("[AuthContext] Trying to get user data directly from auth as fallback");
        let userData = null;
        let userError = null;

        try {
          const result = await supabase.auth.getUser();
          userData = result.data;
          userError = result.error;
        } catch (authError) {
          console.error("[AuthContext] Error fetching user data from auth:", authError);
          userError = authError;
        }

        if (userError) {
          console.error("[AuthContext] Error fetching user data:", userError);
        }

        // Create a minimal profile with user ID if we have it
        if (userId) {
          console.log('[AuthContext] Creating minimal profile with user ID:', userId);

          // Try to get email from auth data if available
          const email = userData?.user?.email || null;

          setProfile({
            id: userId,
            email: email,
            full_name: userData?.user?.user_metadata?.full_name || null,
            updated_at: null,
            church_unit: userData?.user?.user_metadata?.church_unit || null,
            assigned_pastor: userData?.user?.user_metadata?.assigned_pastor || null,
            phone: userData?.user?.user_metadata?.phone || null,
            genotype: null,
            address: userData?.user?.user_metadata?.address || null,
            date_of_birth: null
          });

          // Check superuser status by email if we have it
          if (email) {
            const isSuperAdminByEmail = checkSuperUserStatus(email.toLowerCase());
            if (isSuperAdminByEmail) {
              console.log('[AuthContext] User is a superadmin by email!');
              setSuperUserStatus(true);
              setIsSuperUser(true);
              setIsAdmin(true);
            }
          }
        }

        // Check localStorage for superuser status as a fallback
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          console.log('[AuthContext] Superuser status found in localStorage');
          setIsSuperUser(true);
          setIsAdmin(true);
        }

        setIsLoading(false);
        return;
      }

      console.log("[AuthContext] Profile data retrieved:", data);

      // Get user data to access metadata with error handling
      let userData = null;
      try {
        const result = await supabase.auth.getUser();
        userData = result.data;
        if (result.error) {
          console.error("[AuthContext] Error fetching user data:", result.error);
        }
      } catch (authError) {
        console.error("[AuthContext] Exception fetching user data:", authError);
      }

      // Fetch user roles with error handling
      let roleData = null;
      try {
        const result = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        roleData = result.data;
        if (result.error) {
          console.error("[AuthContext] Error fetching user roles:", result.error);
        }
      } catch (roleError) {
        console.error("[AuthContext] Exception fetching user roles:", roleError);
      }

      console.log('[AuthContext] Role data retrieved:', roleData);

      // Determine admin and superuser status from database roles
      const isUserAdmin = roleData?.some(r => r.role === 'admin');
      const isUserSuperAdmin = roleData?.some(r => r.role === 'superuser');

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
        date_of_birth: (data as any).date_of_birth || null,
        role: (data as any).role
      };

      // Update state with the profile data and authorization status
      setProfile(userProfile);
      setIsAdmin(isUserAdmin || finalSuperUserStatus);
      setIsSuperUser(finalSuperUserStatus);
    } catch (error) {
      console.error("[AuthContext] Error in fetchProfile:", error);

      // Check localStorage for superuser status as a fallback
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
      if (storedSuperUserStatus) {
        console.log('[AuthContext] Error in fetchProfile but superuser status found in localStorage');
        setIsSuperUser(true);
        setIsAdmin(true);
      }
    } finally {
      clearTimeout(profileFetchTimeout);
      setIsLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Add a safety timeout to prevent infinite loading
    const authTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("[AuthContext] Auth initialization timed out after 60 seconds");
        setIsLoading(false);
      }
    }, 60000); // Increased to 60 seconds for better reliability

    const initializeAuth = async () => {
      try {
        // Check if database triggers are properly installed
        try {
          await checkAndNotifyDatabaseTriggers();
        } catch (triggerError) {
          console.warn("[AuthContext] Error checking database triggers:", triggerError);
          // Continue with auth initialization even if trigger check fails
        }

        // Check for stored superuser status early
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          console.log("[AuthContext] Found superuser status in localStorage");
          setIsSuperUser(true);
        }

        // Try to get session with a more efficient approach
        let session = null;
        let sessionError = null;

        try {
          console.log("[AuthContext] Attempting to fetch session...");

          // First, check localStorage for an existing session
          const storedSession = localStorage.getItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
          if (storedSession) {
            console.log("[AuthContext] Found stored session in localStorage");
          }

          // Use a retry mechanism instead of Promise.race
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries && !session) {
            try {
              if (retryCount > 0) {
                console.log(`[AuthContext] Retry attempt ${retryCount} for session fetch`);
                // Add exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
              }

              // Set a shorter timeout for each attempt
              const controller = new AbortController();
              const timeoutId = setTimeout(() => {
                console.warn(`[AuthContext] Session fetch attempt ${retryCount + 1} timed out after 15 seconds`);
                controller.abort();
              }, 15000);

              try {
                // Use a more direct approach with fetch to have better control
                const sessionResult = await supabase.auth.getSession();
                clearTimeout(timeoutId);

                if (sessionResult.error) {
                  console.warn(`[AuthContext] Session fetch attempt ${retryCount + 1} failed:`, sessionResult.error);
                  sessionError = sessionResult.error;
                } else {
                  session = sessionResult.data.session;
                  console.log(`[AuthContext] Session fetch succeeded on attempt ${retryCount + 1}:`,
                    session ? "Session exists" : "No session");
                  sessionError = null;
                  break;
                }
              } catch (fetchError) {
                clearTimeout(timeoutId);
                console.warn(`[AuthContext] Session fetch attempt ${retryCount + 1} exception:`, fetchError);
                sessionError = fetchError;
              }
            } catch (attemptError) {
              console.warn(`[AuthContext] Session fetch retry ${retryCount + 1} outer error:`, attemptError);
              sessionError = attemptError;
            }

            retryCount++;
          }

          // If we still don't have a session after retries, try one last approach
          if (!session && retryCount >= maxRetries) {
            console.log("[AuthContext] All session fetch retries failed, trying alternative approach...");

            // Try to get user directly as a last resort
            try {
              const userResult = await supabase.auth.getUser();
              if (userResult.data?.user) {
                console.log("[AuthContext] Successfully retrieved user without session");
                // We have a user but no session, create a minimal context
                setUser(userResult.data.user);

                // Proceed to fetch profile
                await fetchProfile(userResult.data.user.id);
                return; // Exit early since we've handled everything
              }
            } catch (userError) {
              console.error("[AuthContext] Failed to get user as fallback:", userError);
            }
          }
        } catch (outerError) {
          console.error("[AuthContext] Outer session fetch error:", outerError);
          sessionError = outerError;
        }

        // Process the session result (whether successful or not)
        if (session) {
          console.log("[AuthContext] Using fetched session");
          setSession(session);
          setUser(session.user ?? null);

          if (session.user) {
            await fetchProfile(session.user.id);
          } else {
            setIsLoading(false);
          }
        } else {
          console.log("[AuthContext] No active session - user needs to sign in");

          // If we have a stored superuser status, use that
          if (storedSuperUserStatus) {
            console.log("[AuthContext] No session but superuser status found in localStorage");
            setIsSuperUser(true);
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error("[AuthContext] Error initializing auth:", error);

        // Check for stored superuser status as a fallback
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        if (storedSuperUserStatus) {
          console.log("[AuthContext] Error in auth but superuser status found in localStorage");
          setIsSuperUser(true);
        }

        // Ensure we're not stuck in loading state
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener with error handling
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("[AuthContext] Auth state changed:", event, session ? "Session exists" : "No session");
          setSession(session);
          setUser(session?.user ?? null);

          if (event === "SIGNED_IN" && session?.user) {
            await fetchProfile(session.user.id);
          } else if (event === "SIGNED_OUT") {
            setProfile(null);
            setIsAdmin(false);
            setIsSuperUser(false);
            clearSuperUserStatus();
          }
        }
      );

      subscription = data.subscription;
    } catch (subError) {
      console.error("[AuthContext] Error setting up auth state change listener:", subError);
    }

    return () => {
      clearTimeout(authTimeoutId);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error("[AuthContext] Error unsubscribing from auth state changes:", error);
        }
      }
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setIsAdmin(false);
      setIsSuperUser(false);
      clearSuperUserStatus();
    } catch (error) {
      console.error("[AuthContext] Error signing out:", error);
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Create the context value
  const value = {
    session,
    user,
    profile,
    isAdmin,
    isSuperUser,
    loading: isLoading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
