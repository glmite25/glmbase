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
    const { data: existingMembers, error: membersError } = await supabase
      .from("members")
      .select("email");
    
    if (membersError) throw membersError;
    
    const existingEmails = new Set(existingMembers?.map(m => m.email.toLowerCase()) || []);
    console.log(`Found ${existingEmails.size} existing members`);
    
    // Step 3: Filter profiles that don't exist in members table
    const profilesToAdd = profiles.filter(profile => 
      profile.email && !existingEmails.has(profile.email.toLowerCase())
    );
    
    console.log(`Found ${profilesToAdd.length} profiles to add to members table`);
    
    if (profilesToAdd.length === 0) {
      return { success: true, message: "All profiles are already in members table", added: 0 };
    }
    
    // Step 4: Prepare member records from profiles
    const membersToInsert = profilesToAdd.map(profile => ({
      fullname: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
      email: profile.email?.toLowerCase(),
      category: 'Others', // Default category
      churchunit: profile.church_unit || null,
      assignedto: profile.assigned_pastor || null,
      phone: profile.phone || null,
      address: profile.address || null,
      isactive: true,
      joindate: new Date().toISOString().split('T')[0],
      userid: profile.id, // Link to the auth user ID
    }));
    
    // Step 5: Insert new members
    const { data: insertedMembers, error: insertError } = await supabase
      .from("members")
      .insert(membersToInsert)
      .select();
    
    if (insertError) throw insertError;
    
    console.log(`Successfully added ${insertedMembers?.length || 0} members from profiles`);
    
    return { 
      success: true, 
      message: `Successfully added ${insertedMembers?.length || 0} members from profiles`,
      added: insertedMembers?.length || 0
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
