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

  // Function to fetch user profile
  const fetchProfile = async (userId: string) => {
    console.log(`[AuthContext] Fetching profile for user ${userId}`);
    
    // Set a timeout for profile fetching
    const profileFetchTimeout = setTimeout(() => {
      console.warn('[AuthContext] Profile fetch timed out after 15 seconds');
      setIsLoading(false);
    }, 15000);
    
    try {
      // Fetch the user profile from the profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("[AuthContext] Error fetching profile:", error);
        
        // Get user data directly from auth.users
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("[AuthContext] Error fetching user data:", userError);
          return;
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
            address: null,
            date_of_birth: null
          });
        }
        
        return;
      }

      console.log("[AuthContext] Profile data retrieved:", data);

      // Get user data to access metadata
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("[AuthContext] Error fetching user data:", userError);
      }

      // Fetch user roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (roleError) {
        console.error("[AuthContext] Error fetching user roles:", roleError);
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
        console.warn("[AuthContext] Auth initialization timed out after 30 seconds");
        setIsLoading(false);
      }
    }, 30000);

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
      } catch (error) {
        console.error("[AuthContext] Error initializing auth:", error);
        // Ensure we're not stuck in loading state
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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

    return () => {
      clearTimeout(authTimeoutId);
      subscription.unsubscribe();
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
