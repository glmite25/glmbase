// This is a partial file showing only the changes needed to fix the authentication timeout issue

// In the AuthProvider component, increase the timeout values:

useEffect(() => {
  // Add a safety timeout to prevent infinite loading
  const authTimeoutId = setTimeout(() => {
    if (isLoading) {
      console.warn("[AuthContext] Auth initialization timed out after 30 seconds");
      setIsLoading(false);
    }
  }, 30000); // Increased from 10 seconds to 30 seconds

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
        setTimeout(() => reject(new Error("Session fetch timeout")), 15000) // Increased from 5 seconds to 15 seconds
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

  return () => {
    clearTimeout(authTimeoutId);
  };
}, []);

// In the fetchProfile function, increase the timeout:

const fetchProfile = async (userId: string) => {
  console.log(`[AuthContext] Fetching profile for user ${userId}`);
  
  // Set a timeout for profile fetching
  const profileFetchTimeout = setTimeout(() => {
    console.warn('[AuthContext] Profile fetch timed out after 15 seconds');
    setIsLoading(false);
  }, 15000); // Increased from 5 seconds to 15 seconds
  
  try {
    // Rest of the function remains the same
    // ...
  } catch (error) {
    // ...
  } finally {
    clearTimeout(profileFetchTimeout);
    setIsLoading(false);
  }
};
