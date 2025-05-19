import { supabase } from "@/integrations/supabase/client";
import { adminSupabase } from "@/integrations/supabase/adminClient";

/**
 * Diagnostic function to check if profiles are being properly synced to members
 * This function will log detailed information about the sync process
 */
export const checkProfileMemberSync = async () => {
  console.log("=== DIAGNOSTIC: CHECKING PROFILE-MEMBER SYNC ===");

  try {
    // Step 1: Get all profiles
    console.log("Fetching all profiles...");
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order('updated_at', { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return { success: false, error: profilesError.message };
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    if (profiles && profiles.length > 0) {
      console.log("First 3 profiles:", profiles.slice(0, 3).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        updated_at: p.updated_at
      })));
    }

    // Step 2: Get all members
    console.log("Fetching all members...");
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("*")
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return { success: false, error: membersError.message };
    }

    console.log(`Found ${members?.length || 0} members`);

    if (members && members.length > 0) {
      console.log("First 3 members:", members.slice(0, 3).map(m => ({
        id: m.id,
        email: m.email,
        fullname: m.fullname,
        created_at: m.created_at,
        userid: m.userid
      })));
    }

    // Step 3: Check for profiles that don't have corresponding members
    const missingMembers = [];
    const profileEmails = new Set();

    for (const profile of profiles || []) {
      if (profile.email) {
        profileEmails.add(profile.email.toLowerCase());

        // Check if this profile has a corresponding member
        const matchingMember = members?.find(m =>
          (m.email && m.email.toLowerCase() === profile.email?.toLowerCase()) ||
          m.userid === profile.id
        );

        if (!matchingMember) {
          missingMembers.push({
            profileId: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            updated_at: profile.updated_at
          });
        }
      }
    }

    console.log(`Found ${missingMembers.length} profiles without corresponding members`);

    if (missingMembers.length > 0) {
      console.log("Profiles missing from members table:", missingMembers);
    }

    // Step 4: Check for members that don't have corresponding profiles
    const extraMembers = [];

    for (const member of members || []) {
      if (member.email) {
        // Check if this member has a corresponding profile
        const hasMatchingProfile = profiles?.some(p =>
          (p.email && p.email.toLowerCase() === member.email?.toLowerCase()) ||
          p.id === member.userid
        );

        if (!hasMatchingProfile) {
          extraMembers.push({
            memberId: member.id,
            email: member.email,
            fullname: member.fullname,
            created_at: member.created_at,
            userid: member.userid
          });
        }
      }
    }

    console.log(`Found ${extraMembers.length} members without corresponding profiles`);

    if (extraMembers.length > 0) {
      console.log("Members without corresponding profiles:", extraMembers);
    }

    return {
      success: true,
      profileCount: profiles?.length || 0,
      memberCount: members?.length || 0,
      missingMemberCount: missingMembers.length,
      extraMemberCount: extraMembers.length,
      missingMembers,
      extraMembers
    };
  } catch (error) {
    console.error("Error in checkProfileMemberSync:", error);
    return { success: false, error: String(error) };
  } finally {
    console.log("=== DIAGNOSTIC: CHECK COMPLETE ===");
  }
};

/**
 * Function to manually sync a specific profile to members
 * This can be used to fix specific sync issues
 */
/**
 * Check if a user exists in the database by email
 * This is useful for debugging issues with specific users
 */
export const checkUserByEmail = async (email: string) => {
  if (!email) {
    return {
      success: false,
      error: "Email is required"
    };
  }

  try {
    console.log(`Checking user with email: ${email}`);
    const results: any = {
      email,
      timestamp: new Date().toISOString()
    };

    // Step 1: Check profiles table
    try {
      // Try admin client first
      let profileData = null;
      let profileError = null;

      try {
        const result = await adminSupabase
          .from("profiles")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        profileData = result.data;
        profileError = result.error;
      } catch (adminError) {
        console.warn("Could not check profiles with admin client, falling back to regular client:", adminError);

        // Fall back to regular client
        const result = await supabase
          .from("profiles")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        profileData = result.data;
        profileError = result.error;
      }

      results.inProfiles = !!profileData;
      results.profileData = profileData;
      results.profileError = profileError?.message;

      if (profileError) {
        console.error("Error checking profiles:", profileError);
      } else {
        console.log("Profile check result:", profileData ? "Found" : "Not found");
      }
    } catch (error) {
      console.error("Exception checking profiles:", error);
      results.profileError = String(error);
    }

    // Step 2: Check members table
    try {
      // Try admin client first
      let memberData = null;
      let memberError = null;

      try {
        const result = await adminSupabase
          .from("members")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        memberData = result.data;
        memberError = result.error;
      } catch (adminError) {
        console.warn("Could not check members with admin client, falling back to regular client:", adminError);

        // Fall back to regular client
        const result = await supabase
          .from("members")
          .select("*")
          .ilike("email", email)
          .maybeSingle();

        memberData = result.data;
        memberError = result.error;
      }

      results.inMembers = !!memberData;
      results.memberData = memberData;
      results.memberError = memberError?.message;

      if (memberError) {
        console.error("Error checking members:", memberError);
      } else {
        console.log("Member check result:", memberData ? "Found" : "Not found");
      }
    } catch (error) {
      console.error("Exception checking members:", error);
      results.memberError = String(error);
    }

    // Step 3: Check user_roles table
    try {
      // Try admin client first
      let roleData = null;
      let roleError = null;

      if (results.profileData?.id) {
        try {
          const result = await adminSupabase
            .from("user_roles")
            .select("*")
            .eq("user_id", results.profileData.id)
            .maybeSingle();

          roleData = result.data;
          roleError = result.error;
        } catch (adminError) {
          console.warn("Could not check roles with admin client, falling back to regular client:", adminError);

          // Fall back to regular client
          const result = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", results.profileData.id)
            .maybeSingle();

          roleData = result.data;
          roleError = result.error;
        }

        results.hasRole = !!roleData;
        results.roleData = roleData;
        results.roleError = roleError?.message;

        if (roleError) {
          console.error("Error checking roles:", roleError);
        } else {
          console.log("Role check result:", roleData ? `Found: ${roleData.role}` : "Not found");
        }
      }
    } catch (error) {
      console.error("Exception checking roles:", error);
      results.roleError = String(error);
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error("Error in checkUserByEmail:", error);
    return {
      success: false,
      error: String(error)
    };
  }
};

export const manualSyncProfileToMember = async (profileId: string) => {
  console.log(`Manually syncing profile ${profileId} to members table...`);

  try {
    // Step 1: Get the profile
    // Try admin client first
    let profile;
    let profileError;

    try {
      const result = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      profile = result.data;
      profileError = result.error;
    } catch (adminError) {
      console.warn("Could not fetch profile with admin client, falling back to regular client:", adminError);

      // Fall back to regular client
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      profile = result.data;
      profileError = result.error;
    }

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { success: false, error: profileError.message };
    }

    if (!profile) {
      console.error("Profile not found");
      return { success: false, error: "Profile not found" };
    }

    console.log("Found profile:", profile);

    // Step 2: Check if a member already exists
    // Try admin client first
    let existingMember;
    let memberError;

    try {
      const result = await adminSupabase
        .from("members")
        .select("*")
        .or(`email.eq.${profile.email?.toLowerCase()},userid.eq.${profile.id}`)
        .maybeSingle();

      existingMember = result.data;
      memberError = result.error;
    } catch (adminError) {
      console.warn("Could not check for existing member with admin client, falling back to regular client:", adminError);

      // Fall back to regular client
      const result = await supabase
        .from("members")
        .select("*")
        .or(`email.eq.${profile.email?.toLowerCase()},userid.eq.${profile.id}`)
        .maybeSingle();

      existingMember = result.data;
      memberError = result.error;
    }

    if (memberError) {
      console.error("Error checking for existing member:", memberError);
      return { success: false, error: memberError.message };
    }

    if (existingMember) {
      console.log("Member already exists:", existingMember);
      return { success: true, message: "Member already exists", member: existingMember };
    }

    // Step 3: Create a new member
    const memberData = {
      fullname: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
      email: profile.email?.toLowerCase(),
      category: 'Others', // Default category
      churchunit: profile.church_unit || null,
      churchunits: profile.church_unit ? [profile.church_unit] : [],
      assignedto: profile.assigned_pastor || null,
      phone: profile.phone || null,
      address: profile.address || null,
      isactive: true,
      joindate: new Date().toISOString().split('T')[0],
      userid: profile.id, // Link to the auth user ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("Creating new member:", memberData);

    // Try admin client first
    let newMember;
    let insertError;

    try {
      const result = await adminSupabase
        .from("members")
        .insert([memberData])
        .select();

      newMember = result.data;
      insertError = result.error;

      if (!insertError && newMember) {
        console.log("Successfully inserted member using admin client");
      }
    } catch (adminError) {
      console.warn("Could not insert member with admin client, falling back to regular client:", adminError);

      // Fall back to regular client
      const result = await supabase
        .from("members")
        .insert([memberData])
        .select();

      newMember = result.data;
      insertError = result.error;
    }

    if (insertError) {
      console.error("Error creating member:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("Successfully created member:", newMember);

    return { success: true, member: newMember[0] };
  } catch (error) {
    console.error("Error in manualSyncProfileToMember:", error);
    return { success: false, error: String(error) };
  }
};
