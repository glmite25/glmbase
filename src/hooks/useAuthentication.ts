import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createUserProfile } from "@/utils/createUserProfile";

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

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    churchUnit: string = "",
    assignedPastor: string = "",
    phone: string = "",
    address: string = ""
  ) => {
    setIsLoading(true);
    clearErrors();

    try {
      console.log("Attempting signup with:", {
        email,
        passwordLength: password.length,
        fullName,
        churchUnit: churchUnit || "None",
        assignedPastor: assignedPastor || "None",
        phone: phone || "None",
        address: address ? "Provided" : "None"
      });

      // Normalize email to lowercase to prevent case-sensitivity issues
      const normalizedEmail = email.toLowerCase();

      // Step 1: Create the user account
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            church_unit: churchUnit || null,
            assigned_pastor: assignedPastor || null,
            phone: phone || null,
            address: address || null,
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
            // Ensure we have a valid user ID
            if (!signInData.user || !signInData.user.id) {
              console.error("Missing user ID for profile creation");
              throw new Error("Missing user ID for profile creation");
            }

            console.log("Creating profile for user:", signInData.user.id);

            // Use our utility function to create the profile
            const profileResult = await createUserProfile(
              signInData.user.id,
              email,
              fullName,
              churchUnit,
              assignedPastor,
              data.user?.user_metadata?.phone,
              data.user?.user_metadata?.address
            );

            if (!profileResult.success) {
              console.error("Error creating profile:", profileResult.message);
              // Don't throw here, we'll still try to continue with the sign-in
            } else {
              console.log("Profile created/updated successfully");
            }
          } catch (profileError) {
            console.error("Profile creation error:", profileError);
            // Don't throw here, we'll still try to continue with the sign-in
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
      console.error("Authentication error:", error);

      // Provide more specific error messages based on the error
      let errorMsg = "Failed to create account. Please try again.";

      if (error.message) {
        if (error.message.includes("duplicate key") || error.message.includes("already registered")) {
          errorMsg = "An account with this email already exists. Please sign in instead.";
        } else if (error.message.includes("database")) {
          errorMsg = "Database error saving new user. Please try again or contact support if the issue persists.";
        } else if (error.message.includes("fetch") || error.message.includes("network")) {
          errorMsg = "Failed to connect to the server. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMsg = "The request timed out. Please try again when you have a better connection.";
        } else {
          errorMsg = error.message;
        }
      }

      // If we have a Supabase error code, log it for debugging
      if (error.code) {
        console.error("Error code:", error.code);

        // Handle specific Supabase error codes
        if (error.code === "23505") { // Unique violation
          errorMsg = "An account with this email already exists. Please sign in instead.";
        } else if (error.code === "23502") { // Not null violation
          errorMsg = "Missing required information. Please fill in all required fields.";
        } else if (error.code === "42P01") { // Undefined table
          errorMsg = "Database configuration error. Please contact support.";
        } else if (error.code === "auth_signup_duplicate_email") {
          errorMsg = "This email is already registered. Please sign in instead.";
        }
      }

      // If we have detailed error information, log it
      if (error.details) {
        console.error("Error details:", error.details);
      }

      // If the error is a network error, try to provide more helpful information
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMsg = "Failed to connect to the server. Please check your internet connection and try again.";
        console.error("Network error detected:", error);
      }

      setErrorMessage(errorMsg);

      // Show a toast with the error message
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMsg,
      });
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
