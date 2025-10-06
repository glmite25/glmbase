import { supabase } from "@/integrations/supabase/client";

/**
 * Creates or updates a member record in the members table
 */
const createMemberRecord = async (
  userId: string,
  email: string,
  fullName: string,
  churchUnit?: string,
  assignedPastor?: string,
  phone?: string,
  address?: string
) => {
  try {
    console.log(`Creating/updating member record for user ${userId}`);

    // Determine category based on email (admin users are pastors)
    const adminEmails = ['ojidelawrence@gmail.com', 'admin@gospellabourministry.com'];
    const category = adminEmails.includes(email.toLowerCase()) ? 'Pastors' : 'Members';

    const memberData = {
      user_id: userId,
      email: email,
      fullname: fullName,
      phone: phone || null,
      address: address || null,
      church_unit: churchUnit || null,
      assigned_pastor: assignedPastor || null,
      category: category,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Member data to insert:", memberData);

    const { error: memberError } = await supabase
      .from('members')
      .upsert(memberData, { onConflict: 'user_id' });

    if (memberError) {
      console.error("Error creating/updating member record:", memberError);
      return {
        success: false,
        message: memberError.message || "Error creating member record",
        error: memberError
      };
    }

    console.log("Member record created/updated successfully");
    return {
      success: true,
      message: "Member record created/updated successfully"
    };
  } catch (error: any) {
    console.error("Exception in createMemberRecord:", error);
    return {
      success: false,
      message: error.message || "Unknown error creating member record",
      error
    };
  }
};

/**
 * Creates or updates a user profile in the profiles table and ensures member record exists
 * This is a utility function to ensure consistent profile and member creation
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

    // Ensure fullName is not empty
    const sanitizedFullName = fullName?.trim() || email.split('@')[0];

    // Create a complete profile record with all required fields
    const profileData = {
      id: userId,
      email: normalizedEmail,
      full_name: sanitizedFullName,
      church_unit: churchUnit || null,
      assigned_pastor: assignedPastor || null,
      phone: phone || null,
      genotype: null, // Ensure all fields from the schema are included
      address: address || null,
      role: 'user', // Set default role
      updated_at: new Date().toISOString(),
    };

    console.log("Profile data to insert:", profileData);

    // Use upsert to create or update the profile
    // Add a retry mechanism for database operations
    let attempts = 0;
    const maxAttempts = 3;
    let error = null;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Profile creation attempt ${attempts}/${maxAttempts}`);

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (!upsertError) {
        console.log(`Profile creation successful on attempt ${attempts}`);
        error = null;
        break;
      }

      error = upsertError;
      console.error(`Profile creation attempt ${attempts} failed:`, error);

      // Wait before retrying (exponential backoff)
      if (attempts < maxAttempts) {
        const delay = Math.pow(2, attempts) * 500; // 1s, 2s, 4s
        console.log(`Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (error) {
      console.error("Error creating/updating profile:", error);
      return {
        success: false,
        message: error.message || "Error creating profile",
        error
      };
    }

    console.log("Profile created/updated successfully");

    // Also create/update member record
    const memberResult = await createMemberRecord(userId, normalizedEmail, sanitizedFullName, churchUnit, assignedPastor, phone, address);
    
    if (!memberResult.success) {
      console.warn("Member record creation failed, but profile was created:", memberResult.message);
    }

    return {
      success: true,
      message: "Profile and member record created/updated successfully"
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
