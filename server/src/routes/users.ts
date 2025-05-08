import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Validation should already be done in index.ts, but let's be extra safe
if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'your-service-role-key-goes-here') {
  throw new Error('Missing or invalid Supabase credentials. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @route POST /api/users/sync-by-email
 * @desc Sync a user to members table by email
 * @access Private
 */
router.post('/sync-by-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log(`Syncing user with email: ${email}`);

    // Step 1: Check if the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);

    if (authError) {
      console.error("Error finding user in auth:", authError);
      return res.status(404).json({
        success: false,
        message: `User with email ${email} not found in registered users`
      });
    }

    if (!authUser || !authUser.user) {
      return res.status(404).json({
        success: false,
        message: `User with email ${email} not found in registered users`
      });
    }

    // Step 2: Check if the user has a profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.user.id)
      .single();

    // If no profile exists, create one
    if (profileError || !profileData) {
      console.log("Profile not found, creating one...");

      const { data: newProfile, error: createProfileError } = await supabase
        .from("profiles")
        .insert([{
          id: authUser.user.id,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || email.split('@')[0],
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createProfileError) {
        console.error("Error creating profile:", createProfileError);
        return res.status(500).json({
          success: false,
          message: `Error creating profile: ${createProfileError.message}`
        });
      }

      profileData = newProfile;
    }

    // Step 3: Check if the member already exists
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .ilike("email", email);

    if (memberError) {
      console.error("Error checking for existing member:", memberError);
      return res.status(500).json({
        success: false,
        message: `Error checking for existing member: ${memberError.message}`
      });
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
          return res.status(500).json({
            success: false,
            message: `Error updating member: ${updateError.message}`
          });
        }

        return res.status(200).json({
          success: true,
          message: `Updated existing member with user ID for ${email}`,
          updated: true
        });
      }

      return res.status(200).json({
        success: true,
        message: `Member already exists with email: ${email}`,
        existing: true
      });
    }

    // Step 4: Create the member record
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

    // Insert the member
    const { data: insertedMember, error: insertError } = await supabase
      .from("members")
      .insert([memberRecord])
      .select();

    if (insertError) {
      console.error("Error inserting member:", insertError);
      return res.status(500).json({
        success: false,
        message: `Error inserting member: ${insertError.message}`
      });
    }

    console.log("Successfully added member:", insertedMember);

    return res.status(201).json({
      success: true,
      message: `Successfully added member with email: ${email}`,
      member: insertedMember?.[0]
    });

  } catch (error: any) {
    console.error("Error in syncUserByEmail:", error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    });
  }
});

/**
 * @route POST /api/users/sync-all
 * @desc Sync all users to members table
 * @access Private
 */
router.post('/sync-all', async (req, res) => {
  try {
    console.log("Starting sync of all users to members table");

    // Step 1: Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return res.status(500).json({
        success: false,
        message: `Error fetching auth users: ${authError.message}`
      });
    }

    if (!authUsers || authUsers.users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users found to sync",
        added: 0
      });
    }

    console.log(`Found ${authUsers.users.length} auth users to check`);

    // Step 2: Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return res.status(500).json({
        success: false,
        message: `Error fetching profiles: ${profilesError.message}`
      });
    }

    // Create a map of user IDs to profiles for quick lookup
    const profileMap = new Map();
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile);
    });

    console.log(`Found ${profiles?.length || 0} existing profiles`);

    // Step 3: Get all members
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("email, userid");

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return res.status(500).json({
        success: false,
        message: `Error fetching members: ${membersError.message}`
      });
    }

    // Create sets for quick lookup
    const memberEmails = new Set(members?.map(m => m.email.toLowerCase()) || []);
    const linkedUserIds = new Set(members?.filter(m => m.userid).map(m => m.userid) || []);

    console.log(`Found ${memberEmails.size} existing member emails`);
    console.log(`Found ${linkedUserIds.size} members already linked to user accounts`);

    // Step 4: Process each auth user
    const results = {
      profilesCreated: 0,
      membersCreated: 0,
      membersUpdated: 0,
      errors: [] as string[]
    };

    for (const user of authUsers.users) {
      try {
        if (!user.email) continue;

        // Check if user has a profile
        let profile = profileMap.get(user.id);

        // If no profile, create one
        if (!profile) {
          const { data: newProfile, error: createProfileError } = await supabase
            .from("profiles")
            .insert([{
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email.split('@')[0],
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (createProfileError) {
            console.error(`Error creating profile for ${user.email}:`, createProfileError);
            results.errors.push(`Failed to create profile for ${user.email}: ${createProfileError.message}`);
            continue;
          }

          profile = newProfile;
          results.profilesCreated++;
        }

        // Check if member exists
        const emailExists = memberEmails.has(user.email.toLowerCase());
        const idLinked = linkedUserIds.has(user.id);

        if (!emailExists) {
          // Create new member
          const memberRecord = {
            fullname: profile.full_name || user.email.split('@')[0] || 'Unknown',
            email: user.email.toLowerCase(),
            category: 'Others', // Default category
            churchunit: profile.church_unit || null,
            assignedto: profile.assigned_pastor || null,
            phone: profile.phone || null,
            address: profile.address || null,
            isactive: true,
            joindate: new Date().toISOString().split('T')[0],
            userid: user.id, // Link to the auth user ID
          };

          const { error: insertError } = await supabase
            .from("members")
            .insert([memberRecord]);

          if (insertError) {
            console.error(`Error creating member for ${user.email}:`, insertError);
            results.errors.push(`Failed to create member for ${user.email}: ${insertError.message}`);
            continue;
          }

          results.membersCreated++;
        } else if (!idLinked) {
          // Update existing member to link user ID
          const { data: existingMember, error: findError } = await supabase
            .from("members")
            .select("id")
            .ilike("email", user.email)
            .single();

          if (findError || !existingMember) {
            console.error(`Error finding member for ${user.email}:`, findError);
            results.errors.push(`Failed to find member for ${user.email}: ${findError?.message || "Not found"}`);
            continue;
          }

          const { error: updateError } = await supabase
            .from("members")
            .update({ userid: user.id })
            .eq("id", existingMember.id);

          if (updateError) {
            console.error(`Error updating member for ${user.email}:`, updateError);
            results.errors.push(`Failed to update member for ${user.email}: ${updateError.message}`);
            continue;
          }

          results.membersUpdated++;
        }
      } catch (userError: any) {
        console.error(`Error processing user ${user.email}:`, userError);
        results.errors.push(`Error processing user ${user.email}: ${userError.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sync completed: ${results.profilesCreated} profiles created, ${results.membersCreated} members created, ${results.membersUpdated} members updated`,
      results,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error: any) {
    console.error("Error in syncAllUsers:", error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    });
  }
});

module.exports = router;
