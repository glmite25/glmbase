
import { supabase } from "@/integrations/supabase/client";
import { AdminUser } from "./types";

export const fetchUsers = async (): Promise<{ users: AdminUser[]; error: Error | null }> => {
  try {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) throw profilesError;

    // Fetch user roles to determine who is an admin
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) throw rolesError;

    // Map profiles with their roles
    const usersWithRoles = profilesData.map((profile) => {
      const userRole = rolesData.find((role) => role.user_id === profile.id);
      return {
        ...profile,
        role: userRole ? userRole.role : "user",
      };
    });

    return { users: usersWithRoles, error: null };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return { users: [], error };
  }
};
