import { supabase } from "@/integrations/supabase/client";

/**
 * Add a user role using the admin_add_user_role function
 * This bypasses RLS policies by using a SECURITY DEFINER function
 */
export const addUserRoleSafe = async (
  userId: string,
  role: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Call the admin_add_user_role function
    const { error } = await supabase.rpc("admin_add_user_role", {
      user_id_param: userId,
      role_param: role,
    });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error adding user role:", error);
    return { success: false, error };
  }
};

/**
 * Check if the current user is a superuser
 */
export const checkIsSuperUser = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("is_superuser");

    if (error) {
      console.error("Error checking superuser status:", error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error("Error checking superuser status:", error);
    return false;
  }
};

/**
 * Check if the current user is an admin
 */
export const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("is_admin");

    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

/**
 * Remove a user role using the admin_remove_user_role function
 * This bypasses RLS policies by using a SECURITY DEFINER function
 */
export const removeUserRoleSafe = async (
  userId: string,
  role: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Call the admin_remove_user_role function
    const { error } = await supabase.rpc("admin_remove_user_role", {
      user_id_param: userId,
      role_param: role,
    });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error removing user role:", error);
    return { success: false, error };
  }
};

/**
 * Get all user roles for a specific user
 */
export const getUserRoles = async (userId: string): Promise<string[]> => {
  try {
    // For superusers and admins, we can directly query the user_roles table
    const { data: isSuperuser } = await supabase.rpc("is_superuser");
    const { data: isAdmin } = await supabase.rpc("is_admin");

    if (isSuperuser || isAdmin || userId === (await supabase.auth.getUser()).data.user?.id) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;

      return data?.map(r => r.role) || [];
    }

    return [];
  } catch (error) {
    console.error("Error getting user roles:", error);
    return [];
  }
};
