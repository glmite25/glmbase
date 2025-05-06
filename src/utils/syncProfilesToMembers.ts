import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Syncs users from the profiles table to the members table
 * This ensures that all authenticated users appear in the members list
 */
export const syncProfilesToMembers = async () => {
  try {
    console.log("Starting sync of profiles to members table");

    // Step 1: Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found to sync");
      return { success: true, message: "No profiles found to sync", added: 0 };
    }

    console.log(`Found ${profiles.length} profiles to check`);

    // Step 2: Get all existing members by email to avoid duplicates
    // Use a more robust query to ensure we get all members
    const { data: existingMembers, error: membersError } = await supabase
      .from("members")
      .select("email, fullname, id");

    if (membersError) {
      console.error("Error fetching existing members:", membersError);
      throw membersError;
    }

    // Create a set of lowercase emails for case-insensitive comparison
    const existingEmails = new Set((existingMembers || [])
      .filter(m => m.email) // Filter out null emails
      .map(m => m.email.toLowerCase())); // Convert to lowercase for consistent comparison

    console.log(`Found ${existingEmails.size} existing members with emails`);

    // Log the first few existing members for debugging
    if (existingMembers && existingMembers.length > 0) {
      console.log("Sample existing members:", existingMembers.slice(0, 5));
    }

    // Step 3: Filter profiles that don't exist in members table
    const profilesToAdd = profiles.filter(profile => {
      if (!profile.email) {
        console.log(`Skipping profile with no email: ${profile.id}`);
        return false;
      }

      const lowerEmail = profile.email.toLowerCase();
      const exists = existingEmails.has(lowerEmail);

      // Log more details for debugging, especially for specific users we're looking for
      const isTargetUser = profile.full_name?.toLowerCase().includes('biodun') ||
                          profile.email?.toLowerCase().includes('biodun');

      if (isTargetUser) {
        console.log(`IMPORTANT - Found target user: ${profile.email} (${profile.full_name || 'No name'})`);
        console.log(`Target user exists in members? ${exists}`);
        if (exists) {
          console.log("This user should be synced but isn't showing up in the frontend");
        }
      } else {
        console.log(`Checking profile ${profile.email} (${profile.full_name || 'No name'}): exists in members? ${exists}`);
      }

      return !exists;
    });

    console.log(`Found ${profilesToAdd.length} profiles to add to members table`);

    if (profilesToAdd.length === 0) {
      return { success: true, message: "All profiles are already in members table", added: 0 };
    }

    // Step 4: Prepare member records from profiles
    const membersToInsert = profilesToAdd.map(profile => {
      // Ensure we have a valid full name
      const fullName = profile.full_name?.trim() || profile.email?.split('@')[0] || 'Unknown';

      // Extract church units if available
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

    // Insert members one by one to better handle errors
    const insertedMembers = [];
    const errors = [];

    for (const member of membersToInsert) {
      try {
        console.log(`Inserting member with email: ${member.email}`);
        const { data, error } = await supabase
          .from("members")
          .insert([member])
          .select();

        if (error) {
          console.error(`Error inserting member ${member.email}:`, error);
          errors.push({ email: member.email, error: error.message });
        } else if (data && data.length > 0) {
          console.log(`Successfully inserted member: ${member.email}`);
          insertedMembers.push(data[0]);
        }
      } catch (err) {
        console.error(`Exception inserting member ${member.email}:`, err);
        errors.push({ email: member.email, error: String(err) });
      }
    }

    console.log(`Successfully added ${insertedMembers.length} members from profiles`);
    if (errors.length > 0) {
      console.error(`Failed to add ${errors.length} members:`, errors);
    }

    // Create a detailed message including any errors
    let message = `Successfully added ${insertedMembers.length} new members from user profiles`;
    if (insertedMembers.length > 0) {
      const newUserNames = insertedMembers.map(m => m.fullname || m.email).join(', ');
      message += `: ${newUserNames}`;
    } else {
      message = "All registered users are already in the members list";
    }

    if (errors.length > 0) {
      message += `. Failed to add ${errors.length} members due to errors.`;
    }

    return {
      success: true,
      message: message,
      added: insertedMembers.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    console.error("Error syncing profiles to members:", error);
    return {
      success: false,
      message: error.message || "An error occurred while syncing profiles to members",
      added: 0
    };
  }
};
