import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useAuthentication = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const clearErrors = () => {
    setErrorMessage(null);
  };

  // Helper function to clear all auth storage
  const clearAuthStorage = () => {
    // Clear Supabase auth tokens
    localStorage.removeItem('glm-auth-token');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
    localStorage.removeItem('supabase.auth.accessToken');

    // Clear session storage items too
    sessionStorage.removeItem('glm-auth-token');
    sessionStorage.removeItem('supabase.auth.token');

    // Clear any session cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    clearErrors();
    console.log("[signIn] Attempting login for:", email);
    try {
      // Clear any existing auth data first to ensure a fresh login
      clearAuthStorage();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("[signIn] Supabase response:", { data, error });
      // Handle the email_not_confirmed error specifically
      if (error) {
        if (error.message === "Email not confirmed") {
          toast({
            variant: "destructive",
            title: "Email not confirmed",
            description: "Your email has not been confirmed yet. You can still use the app in development mode.",
          });
          // Try to sign in again without options for development purposes
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!signInError) {
            console.log("[signIn] Second attempt success, navigating to home");
            navigate("/");
            return;
          }
        }
        // Display specific error message
        setErrorMessage(error.message);
        console.error("[signIn] Error:", error.message);
        throw error;
      }
      // Success - navigate to home
      console.log("[signIn] Login successful, navigating to home");
      navigate("/");
    } catch (error: any) {
      console.error("[signIn] Authentication error:", error.message);
      // Error already set in the flow above
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, churchUnit: string = "", assignedPastor: string = "") => {
    setIsLoading(true);
    clearErrors();

    try {
      console.log("Attempting signup with:", {
        email,
        passwordLength: password.length,
        fullName,
        churchUnit: churchUnit || "None",
        assignedPastor: assignedPastor || "None"
      });

      // Step 1: Create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            church_unit: churchUnit || null,
            assigned_pastor: assignedPastor || null,
          },
          // Don't use emailRedirectTo in development to avoid confirmation issues
          ...(import.meta.env.PROD ? { emailRedirectTo: `${window.location.origin}/auth/callback` } : {})
        },
      });

      if (error) {
        console.error("Signup error:", error);
        setErrorMessage(error.message);
        throw error;
      }

      console.log("Signup successful, response:", data);

      // Step 2: For development, automatically sign in
      if (import.meta.env.DEV) {
        console.log("Development mode: attempting automatic sign in");

        // Wait a moment to ensure the user is created in Supabase
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            console.error("Auto sign-in error:", signInError);
            throw signInError;
          }

          console.log("Auto sign-in successful:", signInData);

          // Create profile record if it doesn't exist
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: signInData.user.id,
                email: email,
                full_name: fullName,
                updated_at: new Date().toISOString(),
              });

            if (profileError) {
              console.error("Error creating profile:", profileError);
            } else {
              console.log("Profile created/updated successfully");
            }
          } catch (profileError) {
            console.error("Profile creation error:", profileError);
          }

          toast({
            title: "Account created!",
            description: "You've been automatically signed in (development mode).",
          });

          // Use window.location to force a full page reload
          window.location.href = "/";
          return;
        } catch (signInError: any) {
          console.error("Auto sign-in failed:", signInError);
          // Continue with normal flow if auto sign-in fails
        }
      }

      // Step 3: Show success message for production or if dev auto-login failed
      toast({
        title: "Account created!",
        description: import.meta.env.PROD
          ? "Please check your email to confirm your account."
          : "Please sign in with your new credentials.",
      });

      // In development, redirect to login page if auto-login failed
      if (import.meta.env.DEV) {
        navigate("/auth");
      }
    } catch (error: any) {
      console.error("Authentication error:", error.message);
      setErrorMessage(error.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {
      setErrorMessage("Please enter your email address first");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) {
        setErrorMessage(error.message);
        throw error;
      }

      toast({
        title: "Password reset email sent",
        description: "Check your inbox for instructions to reset your password.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errorMessage,
    clearErrors,
    signIn,
    signUp,
    resetPassword,
  };
};
