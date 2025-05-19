import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { queryKeys, invalidateRelatedQueries } from '@/lib/react-query-config';

/**
 * Syncs users from the profiles table to the members table
 * This ensures that all authenticated users appear in the members list
 */
export const syncProfilesToMembers = async () => {
  try {
    console.log("Starting sync of profiles to members table");

    // Step 1: Get all profiles with a fresh request (no caching)
    const timestamp = new Date().getTime(); // Add timestamp to avoid caching
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order('created_at', { ascending: false }) // Get newest profiles first
      .options({
        headers: {
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'x-request-timestamp': timestamp.toString()
        }
      });

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found to sync");
      return { success: true, message: "No profiles found to sync", added: 0 };
    }

    console.log(`Found ${profiles.length} profiles to check`);
    console.log("First 3 profiles:", profiles.slice(0, 3));

    // Step 2: Get all existing members by email to avoid duplicates
    // Use a more robust query to ensure we get all members
    const { data: existingMembers, error: membersError } = await supabase
      .from("members")
      .select("email, fullname, id, userid")
      .options({
        headers: {
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'x-request-timestamp': timestamp.toString()
        }
      });

    if (membersError) {
      console.error("Error fetching existing members:", membersError);
      throw membersError;
    }

    // Create a set of lowercase emails for case-insensitive comparison
    const existingEmails = new Set((existingMembers || [])
      .filter(m => m.email) // Filter out null emails
      .map(m => m.email.toLowerCase())); // Convert to lowercase for consistent comparison

    // Also track user IDs to avoid duplicates
    const existingUserIds = new Set((existingMembers || [])
      .filter(m => m.userid) // Filter out null userids
      .map(m => m.userid));

    console.log(`Found ${existingEmails.size} existing members with emails`);
    console.log(`Found ${existingUserIds.size} existing members with user IDs`);

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
      const emailExists = existingEmails.has(lowerEmail);
      const userIdExists = existingUserIds.has(profile.id);
      const exists = emailExists || userIdExists;

      // Log more details for debugging, especially for specific users we're looking for
      const isTargetUser = profile.full_name?.toLowerCase().includes('biodun') ||
                          profile.email?.toLowerCase().includes('biodun') ||
                          profile.email?.toLowerCase().includes('popsabey1');

      if (isTargetUser) {
        console.log(`IMPORTANT - Found target user: ${profile.email} (${profile.full_name || 'No name'})`);
        console.log(`Target user exists in members? ${exists} (Email match: ${emailExists}, User ID match: ${userIdExists})`);
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
      // Even if no new profiles to add, we'll force a refresh of the members data
      // This helps when members exist but aren't showing in the UI
      return {
        success: true,
        message: "All profiles are already in members table. Refreshed data.",
        added: 0,
        refreshNeeded: true
      };
    }

    // Step 4: Prepare member records from profiles
    const membersToInsert = profilesToAdd.map(profile => {
      // Ensure we have a valid full name
      const fullName = profile.full_name?.trim() || profile.email?.split('@')[0] || 'Unknown';

      // Extract church units if available
      const churchUnits = profile.church_unit ? [profile.church_unit] : [];

      // Use current timestamp for created_at and updated_at
      const now = new Date().toISOString();

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
        joindate: now.split('T')[0],
        userid: profile.id, // Link to the auth user ID
        created_at: now,
        updated_at: now
      };
    });

    // Step 5: Insert new members
    console.log("Attempting to insert members:", membersToInsert);

    if (membersToInsert.length === 0) {
      console.log("No members to insert");
      return {
        success: true,
        message: "No new members to add",
        added: 0,
        refreshNeeded: true
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
      errors: errors.length > 0 ? errors : undefined,
      refreshNeeded: true
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
