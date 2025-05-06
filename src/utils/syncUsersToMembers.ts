import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Checks for registered users who aren't in the members list and syncs them
 * @returns Object with success status, message, and counts
 */
export const syncUsersToMembers = async () => {
  try {
    console.log("Starting sync of all users to members table");

    // Step 1: Get all profiles (registered users)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found to sync");
      return { success: true, message: "No profiles found to sync", added: 0 };
    }

    console.log(`Found ${profiles.length} profiles to check`);

    // Step 2: Get all members with their emails
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("email, userid");

    if (membersError) throw membersError;

    // Create a set of lowercase member emails for faster lookup
    const memberEmails = new Set(members?.map(m => m.email.toLowerCase()) || []);
    // Create a set of userids that are already linked to members
    const linkedUserIds = new Set(members?.filter(m => m.userid).map(m => m.userid) || []);

    console.log(`Found ${memberEmails.size} existing member emails`);
    console.log(`Found ${linkedUserIds.size} members already linked to user accounts`);

    // Step 3: Find profiles that need to be added to members
    const profilesToSync = profiles.filter(profile => {
      // Skip if email is missing
      if (!profile.email) return false;

      // Check if this profile's email already exists in members
      const emailExists = memberEmails.has(profile.email.toLowerCase());

      // Check if this profile's ID is already linked to a member
      const idLinked = linkedUserIds.has(profile.id);

      // We need to sync if either the email doesn't exist in members
      // or the ID isn't linked to any member
      return !emailExists || !idLinked;
    });

    console.log(`Found ${profilesToSync.length} profiles that need to be synced to members`);

    if (profilesToSync.length === 0) {
      return {
        success: true,
        message: "All registered users are already in the members list",
        added: 0
      };
    }

    // Step 4: Prepare member records for insertion
    const membersToInsert = profilesToSync.map(profile => {
      // Extract name from email if full_name is not available
      const fullName = profile.full_name ||
                      (profile.email ? profile.email.split('@')[0].replace(/[.]/g, ' ') : 'Unknown');

      // Convert church_unit to churchunits array if available
      const churchUnits = profile.church_unit ? [profile.church_unit] : [];

      return {
        fullname: fullName,
        email: profile.email?.toLowerCase(),
        category: 'Others', // Default category
        churchunit: profile.church_unit || null,
        churchunits: churchUnits, // Add array of church units
        assignedto: profile.assigned_pastor || null,
        phone: profile.phone || null,
        address: profile.address || null,
        isactive: true,
        joindate: new Date().toISOString().split('T')[0],
        userid: profile.id, // Link to the auth user ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Step 5: Insert new members
    console.log("Attempting to insert members:", membersToInsert);

    if (membersToInsert.length === 0) {
      console.log("No members to insert");
      return {
        success: true,
        message: "No new members to add",
        added: 0
      };
    }

    // Insert the members
    const { data: insertedMembers, error: insertError } = await supabase
      .from("members")
      .upsert(membersToInsert, {
        onConflict: 'email', // Use email as the conflict detection column
        ignoreDuplicates: false // Update existing records
      })
      .select();

    if (insertError) {
      console.error("Error inserting members:", insertError);
      throw insertError;
    }

    console.log(`Successfully added/updated ${insertedMembers?.length || 0} members`);

    return {
      success: true,
      message: `Successfully added/updated ${insertedMembers?.length || 0} members from registered users`,
      added: insertedMembers?.length || 0
    };
  } catch (error: any) {
    console.error("Error in syncUsersToMembers:", error);
    return {
      success: false,
      message: `Error: ${error.message || "Unknown error"}`,
      error
    };
  }
};

/**
 * Syncs a specific user to the members table by email
 * @param email The email of the user to sync
 * @returns Object with success status and message
 */
export const syncUserByEmail = async (email: string) => {
  try {
    console.log(`Syncing user with email: ${email}`);

    // Step 1: Check if the email exists in profiles
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .single();

    // If profile not found, try to find the user in auth.users
    if (profileError || !profileData) {
      console.log("Profile not found, checking auth.users table...");

      // We can't directly query auth.users with the anon key
      // Instead, let's check if there's a user with this email in the profiles table
      // with a case-insensitive search
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', email)
        .limit(1);

      if (userError) {
        console.error("Error finding user:", userError);
        return {
          success: false,
          message: `Error finding user: ${userError.message}`
        };
      }

      if (!userData || userData.length === 0) {
        console.error("No user found with email:", email);

        // Try a direct query to the members table to see if the email exists there
        const { data: existingMember, error: memberError } = await supabase
          .from("members")
          .select("*")
          .ilike("email", email)
          .single();

        if (memberError) {
          console.log("No existing member found with this email either");
        } else if (existingMember) {
          console.log("Found existing member but no user account:", existingMember);
          return {
            success: true,
            message: `Member exists with email ${email}, but no user account is linked. User needs to register.`,
            existing: true
          };
        }

        // If we get here, the user doesn't exist in auth.users or has restricted access
        return {
          success: false,
          message: `User with email ${email} not found in registered users. They need to sign up first.`
        };
      }

      // User found in profiles table
      const user = userData[0];
      console.log("User found in profiles:", user);

      return prepareProfileAndSync(user, email);
    }

    // If profile was found, proceed with syncing
    return syncUserWithProfile(profileData, email);
  } catch (error: any) {
    console.error("Error in syncUserByEmail:", error);
    return {
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    };
  }
};

/**
 * Helper function to prepare profile data and sync a user
 * @param user The user data from profiles table
 * @param email The user's email
 * @returns Object with success status and message
 */
const prepareProfileAndSync = async (user: any, email: string) => {
  try {
    // Since we already found the profile, we don't need to create it again
    // Just use the existing profile data
    const profileData = {
      id: user.id,
      email: user.email || email,
      full_name: user.full_name || email.split('@')[0],
      updated_at: new Date().toISOString()
    };

    console.log("Using existing profile data:", profileData);

    // Use the profile data directly
    return syncUserWithProfile(profileData, email);
  } catch (error: any) {
    console.error("Error in prepareProfileAndSync:", error);
    return {
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    };
  }
};

/**
 * Helper function to sync a user with an existing profile
 * @param profileData The profile data
 * @param email The user's email
 * @returns Object with success status and message
 */
const syncUserWithProfile = async (profileData: any, email: string) => {
  try {
    // Step 2: Check if the member already exists
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .ilike("email", email);

    if (memberError) {
      console.error("Error checking for existing member:", memberError);
      return {
        success: false,
        message: `Error checking for existing member: ${memberError.message}`
      };
    }

    if (memberData && memberData.length > 0) {
      // Member exists, update the userid if needed
      if (!memberData[0].userid) {
        const { error: updateError } = await supabase
          .from("members")
          .update({ userid: profileData.id })
          .eq("id", memberData[0].id);

        if (updateError) {
          console.error("Error updating member userid:", updateError);
          return {
            success: false,
            message: `Error updating member: ${updateError.message}`
          };
        }

        return {
          success: true,
          message: `Updated existing member with user ID for ${email}`,
          updated: true
        };
      }

      return {
        success: true,
        message: `Member already exists with email: ${email}`,
        existing: true
      };
    }

    // Step 3: Create the member record
    const memberRecord = {
      fullname: profileData.full_name || email.split('@')[0] || 'Unknown',
      email: email.toLowerCase(),
      category: 'Others', // Default category
      churchunit: profileData.church_unit || null,
      assignedto: profileData.assigned_pastor || null,
      phone: profileData.phone || null,
      address: profileData.address || null,
      isactive: true,
      joindate: new Date().toISOString().split('T')[0],
      userid: profileData.id, // Link to the auth user ID
    };

    console.log("Creating member record:", memberRecord);

    // Step 4: Insert the member
    const { data: insertedMember, error: insertError } = await supabase
      .from("members")
      .insert([memberRecord])
      .select();

    if (insertError) {
      console.error("Error inserting member:", insertError);
      return {
        success: false,
        message: `Error inserting member: ${insertError.message}`
      };
    }

    console.log("Successfully added member:", insertedMember);

    return {
      success: true,
      message: `Successfully added member with email: ${email}`,
      member: insertedMember?.[0]
    };
  } catch (error: any) {
    console.error("Error in syncUserWithProfile:", error);
    return {
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    };
  }
};
