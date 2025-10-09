import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createUserProfile } from "@/utils/createUserProfile";
import { validatePassword, PasswordValidationResult } from "@/utils/passwordValidation";

export const useAuthentication = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const clearErrors = () => {
    setErrorMessage(null);
    setPasswordValidation(null);
  };

  /**
   * Validates a password and updates the validation state
   * @param password The password to validate
   * @returns Whether the password is valid
   */
  const validateAndSetPassword = (password: string): boolean => {
    const validation = validatePassword(password);
    setPasswordValidation(validation);
    return validation.isValid;
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

  const signIn = async (email: string, password: string, returnTo?: string) => {
    setIsLoading(true);
    clearErrors();

    // Check if login is locked
    if (loginLocked) {
      const now = new Date();
      if (lockoutEndTime && now < lockoutEndTime) {
        const remainingMinutes = Math.ceil((lockoutEndTime.getTime() - now.getTime()) / 60000);
        setErrorMessage(`Too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`);
        setIsLoading(false);
        return;
      } else {
        // Reset lockout if time has passed
        setLoginLocked(false);
        setLoginAttempts(0);
        setLockoutEndTime(null);
      }
    }

    console.log("[signIn] Attempting login for:", email);
    try {
      // Clear any existing auth data first to ensure a fresh login
      clearAuthStorage();

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      console.log("[signIn] Supabase response:", { data, error });

      // Handle errors
      if (error) {
        // Increment login attempts on failure
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          const lockoutEnd = new Date();
          lockoutEnd.setMinutes(lockoutEnd.getMinutes() + 15); // 15 minute lockout
          setLoginLocked(true);
          setLockoutEndTime(lockoutEnd);
          setErrorMessage(`Too many failed login attempts. Your account is locked for 15 minutes.`);

          toast({
            variant: "destructive",
            title: "Account temporarily locked",
            description: "Too many failed login attempts. Please try again in 15 minutes.",
          });

          setIsLoading(false);
          return;
        }

        // Handle the email_not_confirmed error specifically
        if (error.message === "Email not confirmed") {
          toast({
            variant: "destructive",
            title: "Email not confirmed",
            description: "Your email has not been confirmed yet. You can still use the app in development mode.",
          });

          // Try to sign in again without options for development purposes
          if (import.meta.env.DEV) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });

            if (!signInError) {
              console.log("[signIn] Second attempt success, navigating to home");
              // Reset login attempts on success
              setLoginAttempts(0);
              navigate("/");
              return;
            }
          }
        }

        // Display specific error message
        setErrorMessage(error.message);
        console.error("[signIn] Error:", error.message);
        throw error;
      }

      // Success - reset login attempts and navigate
      setLoginAttempts(0);
      console.log("[signIn] Login successful, navigating to:", returnTo || "/");

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Navigate to returnTo URL or home
      navigate(returnTo || "/");
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

    // Validate password strength
    const isPasswordValid = validateAndSetPassword(password);
    if (!isPasswordValid) {
      setIsLoading(false);
      setErrorMessage("Please use a stronger password.");
      return;
    }

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

      // Step 2: Handle profile creation (works for both dev and prod)
      console.log("Creating user profile after successful signup");

      // Wait a moment to ensure the user is created in Supabase
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create profile record using the user data from signup
      if (data.user && data.user.id) {
        try {
          console.log("Attempting profile creation with data:", {
            userId: data.user.id,
            email: normalizedEmail,
            fullName,
            churchUnit,
            phone
          });

          // Use our utility function to create the profile
          const profileResult = await createUserProfile(
            data.user.id,
            normalizedEmail,
            fullName,
            churchUnit,
            assignedPastor,
            phone,
            address
          );

          if (!profileResult.success) {
            console.error("Error creating profile:", profileResult.message);
            // Show success message since the trigger should handle profile creation
            toast({
              variant: "default",
              title: "Account Created Successfully",
              description: "Your account has been created. Profile setup will complete automatically.",
            });
          } else {
            console.log("Profile created successfully:", profileResult.message);
            toast({
              variant: "default",
              title: "Account Created Successfully",
              description: "Your account and profile have been set up successfully.",
            });
          }
        } catch (profileError: any) {
          console.error("Profile creation error:", profileError);
          // Show success message since the trigger should handle profile creation
          toast({
            variant: "default",
            title: "Account Created Successfully",
            description: "Your account has been created. Profile setup will complete automatically.",
          });
        }
      }

      // Step 3: For development, automatically sign in
      if (import.meta.env.DEV) {
        console.log("Development mode: attempting automatic sign in");

        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            console.error("Auto sign-in error:", signInError);
            throw signInError;
          }

          console.log("Auto sign-in successful:", signInData);

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
      let shouldRetry = false;

      if (error.message) {
        const message = error.message.toLowerCase();
        
        if (message.includes("duplicate key") || message.includes("already registered") || message.includes("user already registered")) {
          errorMsg = "An account with this email already exists. Please sign in instead.";
        } else if (message.includes("database") || message.includes("violates")) {
          errorMsg = "Database error saving new user. This could be due to:\n• A temporary database connection issue\n• The email address is already in use\n• Required fields are missing\n\nPlease try again or use a different email address.";
          shouldRetry = true;
        } else if (message.includes("fetch") || message.includes("network") || message.includes("connection")) {
          errorMsg = "Failed to connect to the server. Please check your internet connection and try again.";
          shouldRetry = true;
        } else if (message.includes("timeout")) {
          errorMsg = "The request timed out. Please try again when you have a better connection.";
          shouldRetry = true;
        } else if (message.includes("foreign key") || message.includes("constraint")) {
          errorMsg = "Database configuration issue. Please contact support or try again later.";
          shouldRetry = true;
        } else {
          errorMsg = error.message;
        }
      }

      // Handle specific Supabase error codes
      if (error.code) {
        console.error("Error code:", error.code);

        switch (error.code) {
          case "23505": // Unique violation
            errorMsg = "An account with this email already exists. Please sign in instead.";
            break;
          case "23502": // Not null violation
            errorMsg = "Missing required information. Please fill in all required fields.";
            break;
          case "23503": // Foreign key violation
            errorMsg = "Database configuration error. Please contact support.";
            break;
          case "42P01": // Undefined table
            errorMsg = "Database configuration error. Please contact support.";
            break;
          case "auth_signup_duplicate_email":
            errorMsg = "This email is already registered. Please sign in instead.";
            break;
          case "PGRST116": // Connection error
            errorMsg = "Database connection error. Please try again.";
            shouldRetry = true;
            break;
        }
      }

      // Log additional error information for debugging
      if (error.details) {
        console.error("Error details:", error.details);
      }
      if (error.hint) {
        console.error("Error hint:", error.hint);
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMsg = "Failed to connect to the server. Please check your internet connection and try again.";
        shouldRetry = true;
        console.error("Network error detected:", error);
      }

      setErrorMessage(errorMsg);

      // Show a toast with the error message
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: shouldRetry ? 
          "There was a temporary issue. Please try again." : 
          errorMsg.split('\n')[0], // Show only the first line in toast
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Password reset error:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errorMessage,
    setErrorMessage,
    passwordValidation,
    loginLocked,
    lockoutEndTime,
    clearErrors,
    validateAndSetPassword,
    signIn,
    signUp,
    resetPassword,
  };
};
