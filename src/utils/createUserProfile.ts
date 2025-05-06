import { supabase } from "@/integrations/supabase/client";

/**
 * Creates or updates a user profile in the profiles table
 * This is a utility function to ensure consistent profile creation
 *
 * @param userId The user ID from auth.users
 * @param email The user's email address
 * @param fullName The user's full name
 * @param churchUnit Optional church unit
 * @param assignedPastor Optional assigned pastor
 * @param phone Optional phone number
 * @param address Optional address
 * @returns Result of the operation with success flag and error message if applicable
 */
export const createUserProfile = async (
  userId: string,
  email: string,
  fullName: string,
  churchUnit?: string,
  assignedPastor?: string,
  phone?: string,
  address?: string
) => {
  try {
    console.log(`Creating/updating profile for user ${userId}`);

    if (!userId) {
      console.error("Missing user ID for profile creation");
      return {
        success: false,
        message: "Missing user ID for profile creation"
      };
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Create a complete profile record with all required fields
    const profileData = {
      id: userId,
      email: normalizedEmail,
      full_name: fullName,
      church_unit: churchUnit || null,
      assigned_pastor: assignedPastor || null,
      phone: phone || null,
      address: address || null,
      updated_at: new Date().toISOString(),
    };

    console.log("Profile data to insert:", profileData);

    // Use upsert to create or update the profile
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData);

    if (error) {
      console.error("Error creating/updating profile:", error);
      return {
        success: false,
        message: error.message || "Error creating profile",
        error
      };
    }

    console.log("Profile created/updated successfully");
    return {
      success: true,
      message: "Profile created/updated successfully"
    };
  } catch (error: any) {
    console.error("Exception in createUserProfile:", error);
    return {
      success: false,
      message: error.message || "Unknown error creating profile",
      error
    };
  }
};
