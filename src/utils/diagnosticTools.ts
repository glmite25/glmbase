import { supabase } from "@/integrations/supabase/client";

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
export const manualSyncProfileToMember = async (profileId: string) => {
  console.log(`Manually syncing profile ${profileId} to members table...`);
  
  try {
    // Step 1: Get the profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();
    
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
    const { data: existingMember, error: memberError } = await supabase
      .from("members")
      .select("*")
      .or(`email.eq.${profile.email?.toLowerCase()},userid.eq.${profile.id}`)
      .maybeSingle();
    
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
    
    const { data: newMember, error: insertError } = await supabase
      .from("members")
      .insert([memberData])
      .select();
    
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
