
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkSuperUserStatus, setSuperUserStatus, clearSuperUserStatus } from "@/utils/superuser-fix";

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
    const initializeAuth = async () => {
      try {
        // Check if there's a stored superuser status before anything else
        const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
        console.log("Initial superuser check from localStorage:", storedSuperUserStatus);

        // Don't clear auth storage on startup to maintain user session
        // Check active session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session check:", session ? "Session exists" : "No session");

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          // Even if no session, we might still have a superuser status in localStorage
          if (storedSuperUserStatus) {
            console.log("No session but superuser status found in localStorage");
            setIsSuperUser(true);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
      }
    };

    // Initialize auth on component mount
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session ? "Session exists" : "No session");

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        // Handle logout or session expiration
        console.log("User logged out or session expired");

        // Clear all state
        setProfile(null);
        setIsAdmin(false);
        setIsSuperUser(false);
        setIsLoading(false);

        // If this was a SIGNED_OUT event, make sure we clear any cached state
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          console.log(`${event} event detected, clearing state`);
          clearSuperUserStatus(); // Use our utility function
          clearAuthStorage();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user ID:', userId);

      // Get user profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile data:', error);
        throw error;
      }

      console.log('Profile data retrieved:', data);

      // Get user metadata from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      // Set the profile data with metadata from the current user session
      // Use type assertion to handle the database fields
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

      // Check if the user has admin role
      let roleData = [];
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching role data:', error);
          // Don't throw the error, just log it and continue with empty roleData
        } else {
          roleData = data || [];
        }
      } catch (roleError) {
        console.error('Exception fetching role data:', roleError);
        // Continue with empty roleData
      }

      console.log('Role data retrieved:', roleData);

      // Check if user is admin or superuser
      const isUserAdmin = roleData.some(r => r.role === 'admin');

      // Check for super admin status using our utility function
      const userEmail = data.email?.toLowerCase() || userData?.user?.email?.toLowerCase() || '';
      console.log('Checking superuser status for email:', userEmail);

      // Use the utility function to check superuser status
      const isSuperAdmin = checkSuperUserStatus(userEmail);

      // For testing purposes, you can force superadmin status
      // Set to true to enable superadmin access for testing
      const forceSuperAdmin = false;

      // Double-check localStorage directly as a fallback
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';

      // Determine final superuser status
      const finalSuperUserStatus = isSuperAdmin || forceSuperAdmin || storedSuperUserStatus;

      // If user is a superadmin or forced, ensure it's stored
      if (finalSuperUserStatus) {
        console.log('User is a superadmin!');
        setSuperUserStatus(true);
      }

      console.log('User authorization determined:', {
        email: userEmail,
        isAdmin: isUserAdmin,
        isSuperAdmin,
        storedSuperUserStatus,
        forceSuperAdmin,
        finalIsSuperUser: finalSuperUserStatus,
        finalIsAdmin: isUserAdmin || finalSuperUserStatus
      });

      // Set admin and superuser status
      setIsAdmin(isUserAdmin || finalSuperUserStatus);
      setIsSuperUser(finalSuperUserStatus);

    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Set default values even if there's an error
      setIsAdmin(false);  // Don't grant admin access on error
      setIsSuperUser(false);  // Don't grant superuser access on error
    } finally {
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
