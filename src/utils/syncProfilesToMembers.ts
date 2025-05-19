import { supabase } from "@/integrations/supabase/client";
import { adminSupabase } from "@/integrations/supabase/adminClient";
import { toast } from "@/hooks/use-toast";
import { queryKeys, invalidateRelatedQueries } from '@/lib/react-query-config';

// Check if the database is accessible and credentials are working
const checkDatabaseConnection = async () => {
  try {
    console.log("Testing database connection...");
    const { data, error } = await supabase.from("profiles").select("count").limit(1);

    if (error) {
      console.error("Database connection test failed:", error);
      return false;
    }

    console.log("Database connection successful");
    return true;
  } catch (err) {
    console.error("Exception testing database connection:", err);
    return false;
  }
};

// Define a more robust function to check if a member exists
const checkMemberExists = async (email: string, userId: string | null) => {
  try {
    // Build a query to check by email (case-insensitive) or userId
    let query = supabase.from("members").select("id, email, userid");

    if (email) {
      // First try exact match
      const { data: exactMatch } = await query
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (exactMatch) return true;

      // Then try case-insensitive match
      const { data: allMembers } = await supabase
        .from("members")
        .select("email");

      const exists = (allMembers || []).some(m =>
        m.email && m.email.toLowerCase() === email.toLowerCase()
      );

      if (exists) return true;
    }

    // Check by userId if provided
    if (userId) {
      const { data: userMatch } = await supabase
        .from("members")
        .select("id")
        .eq("userid", userId)
        .maybeSingle();

      if (userMatch) return true;
    }

    return false;
  } catch (error) {
    console.error("Error in checkMemberExists:", error);
    // If there's an error, assume the member doesn't exist
    return false;
  }
};

/**
 * Manually sync a specific profile to the members table
 * This can be used to fix specific users that aren't showing up
 */
export const manualSyncProfileToMember = async (profileId: string) => {
  try {
    console.log(`Manually syncing profile ${profileId} to members table`);

    // First check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      return {
        success: false,
        error: "Could not connect to the database. Check your credentials and network connection."
      };
    }

    // Try to get the profile using admin client for better permissions
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile for manual sync:", profileError);
      return {
        success: false,
        error: profileError?.message || "Profile not found"
      };
    }

    // Check if member already exists
    const memberExists = await checkMemberExists(profile.email || '', profile.id);
    if (memberExists) {
      console.log(`Member already exists for profile ${profileId}`);
      return {
        success: true,
        message: "Member already exists in the database"
      };
    }

    // Prepare member record
    const fullName = profile.full_name?.trim() || profile.email?.split('@')[0] || 'Unknown';
    const churchUnits = profile.church_unit ? [profile.church_unit] : [];
    const now = new Date().toISOString();

    const memberData = {
      fullname: fullName,
      email: profile.email?.toLowerCase(),
      category: 'Others', // Default category
      churchunit: profile.church_unit || null,
      churchunits: churchUnits,
      assignedto: profile.assigned_pastor || null,
      phone: profile.phone || null,
      address: profile.address || null,
      isactive: true,
      joindate: now.split('T')[0],
      userid: profile.id,
      created_at: now,
      updated_at: now
    };

    // Insert the member using admin client
    const { data: insertedMember, error: insertError } = await adminSupabase
      .from("members")
      .insert([memberData])
      .select();

    if (insertError) {
      console.error("Error inserting member during manual sync:", insertError);
      return {
        success: false,
        error: insertError.message
      };
    }

    console.log(`Successfully manually synced profile ${profileId} to members table`);
    return {
      success: true,
      message: `Successfully added ${fullName} to members table`,
      member: insertedMember?.[0]
    };
  } catch (error: any) {
    console.error("Error in manual sync:", error);
    return {
      success: false,
      error: error.message || "An unknown error occurred"
    };
  }
};

/**
 * Syncs users from the profiles table to the members table
 * This ensures that all authenticated users appear in the members list
 */
export const syncProfilesToMembers = async () => {
  try {
    console.log("Starting sync of profiles to members table");

    // First check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      return {
        success: false,
        message: "Could not connect to the database. Check your credentials and network connection.",
        added: 0
      };
    }

    // Step 1: Get all profiles with a fresh request
    const timestamp = new Date().getTime(); // Add timestamp for logging
    console.log(`Sync profiles timestamp: ${timestamp}`);

    // Try using admin client first for better permissions
    let profiles;
    let profilesError;

    try {
      const result = await adminSupabase
        .from("profiles")
        .select("*")
        .order('created_at', { ascending: false }); // Get newest profiles first

      profiles = result.data;
      profilesError = result.error;

      if (!profilesError && profiles) {
        console.log("Successfully fetched profiles using admin client");
      }
    } catch (adminError) {
      console.warn("Could not fetch profiles with admin client, falling back to regular client:", adminError);

      // Fall back to regular client
      const result = await supabase
        .from("profiles")
        .select("*")
        .order('created_at', { ascending: false });

      profiles = result.data;
      profilesError = result.error;
    }

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found to sync");
      return { success: true, message: "No profiles found to sync", added: 0 };
    }

    console.log(`Found ${profiles.length} profiles to check`);
    console.log("First 3 profiles:", profiles.slice(0, 3));

    // Step 2: Get all existing members by email to avoid duplicates
    // Use a more robust query to ensure we get all members
    console.log(`Fetching existing members with timestamp: ${timestamp}`);

    // Try using admin client first for better permissions
    let existingMembers;
    let membersError;

    try {
      const result = await adminSupabase
        .from("members")
        .select("email, fullname, id, userid");

      existingMembers = result.data;
      membersError = result.error;

      if (!membersError && existingMembers) {
        console.log("Successfully fetched members using admin client");
      }
    } catch (adminError) {
      console.warn("Could not fetch members with admin client, falling back to regular client:", adminError);

      // Fall back to regular client
      const result = await supabase
        .from("members")
        .select("email, fullname, id, userid");

      existingMembers = result.data;
      membersError = result.error;
    }

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
    const profilesToAdd = [];

    // Check each profile more thoroughly
    for (const profile of profiles) {
      if (!profile.email && !profile.id) {
        console.log(`Skipping profile with no email or id: ${JSON.stringify(profile)}`);
        continue;
      }

      const lowerEmail = profile.email?.toLowerCase() || '';
      const emailExists = existingEmails.has(lowerEmail);
      const userIdExists = existingUserIds.has(profile.id);
      let exists = emailExists || userIdExists;

      // Double-check with a direct database query for important users
      const isTargetUser =
        profile.full_name?.toLowerCase().includes('biodun') ||
        profile.email?.toLowerCase().includes('biodun') ||
        profile.email?.toLowerCase().includes('popsabey1');

      if (isTargetUser || !exists) {
        // For target users or users that don't seem to exist, do an extra check
        console.log(`Performing extra existence check for: ${profile.email} (${profile.full_name || 'No name'})`);
        const memberExistsInDb = await checkMemberExists(profile.email || '', profile.id);

        if (memberExistsInDb) {
          exists = true;
          console.log(`Extra check confirmed user exists in members table: ${profile.email}`);
        } else {
          console.log(`Extra check confirmed user DOES NOT exist in members table: ${profile.email}`);
        }
      }

      // Log details for debugging
      if (isTargetUser) {
        console.log(`IMPORTANT - Found target user: ${profile.email} (${profile.full_name || 'No name'})`);
        console.log(`Target user exists in members? ${exists} (Email match: ${emailExists}, User ID match: ${userIdExists})`);
        if (exists) {
          console.log("This user should be synced but isn't showing up in the frontend");
        }
      } else {
        console.log(`Checking profile ${profile.email} (${profile.full_name || 'No name'}): exists in members? ${exists}`);
      }

      if (!exists) {
        profilesToAdd.push(profile);
      }
    }

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

        // Try using admin client first for better permissions
        let data;
        let error;

        try {
          const result = await adminSupabase
            .from("members")
            .insert([member])
            .select();

          data = result.data;
          error = result.error;

          if (!error && data) {
            console.log(`Successfully inserted member using admin client: ${member.email}`);
          }
        } catch (adminError) {
          console.warn(`Could not insert member ${member.email} with admin client, falling back to regular client:`, adminError);

          // Fall back to regular client
          const result = await supabase
            .from("members")
            .insert([member])
            .select();

          data = result.data;
          error = result.error;
        }

        if (error) {
          console.error(`Error inserting member ${member.email}:`, error);
          errors.push({ email: member.email, error: error.message });

          // Special handling for target users
          if (member.email?.toLowerCase().includes('popsabey1')) {
            console.error(`CRITICAL: Failed to insert important user ${member.email}. This user should be a super admin.`);

            // Try one more time with a direct approach
            try {
              console.log(`Attempting direct insert for ${member.email} with minimal data`);
              const minimalMember = {
                fullname: member.fullname,
                email: member.email,
                category: 'Others',
                isactive: true,
                userid: member.userid
              };

              const directResult = await adminSupabase
                .from("members")
                .insert([minimalMember])
                .select();

              if (directResult.error) {
                console.error(`Direct insert also failed for ${member.email}:`, directResult.error);
              } else {
                console.log(`Direct insert succeeded for ${member.email}`);
                insertedMembers.push(directResult.data[0]);
              }
            } catch (directError) {
              console.error(`Direct insert exception for ${member.email}:`, directError);
            }
          }
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
