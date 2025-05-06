import { supabase } from "@/integrations/supabase/client";

export interface SuperAdmin {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface SuperAdminResult {
  success: boolean;
  message: string;
  status: string;
  user_id?: string;
}

/**
 * Add a super admin by email
 * @param email The email of the user to make a super admin
 * @returns Result of the operation
 */
export const addSuperAdminByEmail = async (email: string): Promise<SuperAdminResult> => {
  try {
    // Call the SQL function to add a super admin
    const { data, error } = await supabase.rpc('add_super_admin_by_email', {
      admin_email: email.toLowerCase().trim()
    });

    if (error) {
      console.error('Error adding super admin:', error);
      return {
        success: false,
        message: `Error adding super admin: ${error.message}`,
        status: 'ERROR'
      };
    }

    return data as SuperAdminResult;
  } catch (error: any) {
    console.error('Exception adding super admin:', error);
    return {
      success: false,
      message: `Exception adding super admin: ${error.message}`,
      status: 'EXCEPTION'
    };
  }
};

/**
 * List all super admins
 * @returns List of super admins
 */
export const listSuperAdmins = async (): Promise<{ superAdmins: SuperAdmin[], error: Error | null }> => {
  try {
    // Call the SQL function to list super admins
    const { data, error } = await supabase.rpc('list_super_admins');

    if (error) {
      console.error('Error listing super admins:', error);
      return { superAdmins: [], error };
    }

    // Log the raw data for debugging
    console.log('Raw super admins data:', data);
    console.log('Data type:', typeof data);

    // Handle different data formats
    let superAdmins: SuperAdmin[] = [];

    if (Array.isArray(data)) {
      // If data is already an array, use it directly
      superAdmins = data;
    } else if (data && typeof data === 'object') {
      // If data is a JSON object, try to convert it to an array
      try {
        // If it's a JSON string, parse it
        if (typeof data === 'string') {
          superAdmins = JSON.parse(data);
        } else {
          // If it has array-like properties, convert to array
          const keys = Object.keys(data).filter(k => !isNaN(Number(k)));
          if (keys.length > 0) {
            superAdmins = keys.map(k => data[k]);
          } else if (data.length !== undefined) {
            // Try to convert to array if it has a length property
            superAdmins = Array.from({ length: data.length }, (_, i) => data[i]);
          }
        }
      } catch (e) {
        console.error('Error parsing super admins data:', e);
      }
    }

    console.log('Processed super admins:', superAdmins);

    return { superAdmins, error: null };
  } catch (error: any) {
    console.error('Exception listing super admins:', error);
    return { superAdmins: [], error };
  }
};

/**
 * Remove a super admin
 * @param userId The ID of the user to remove super admin role from
 * @returns Result of the operation
 */
export const removeSuperAdmin = async (userId: string): Promise<SuperAdminResult> => {
  try {
    // Call the SQL function to remove a super admin
    const { data, error } = await supabase.rpc('remove_super_admin', {
      admin_id: userId
    });

    if (error) {
      console.error('Error removing super admin:', error);
      return {
        success: false,
        message: `Error removing super admin: ${error.message}`,
        status: 'ERROR'
      };
    }

    return data as SuperAdminResult;
  } catch (error: any) {
    console.error('Exception removing super admin:', error);
    return {
      success: false,
      message: `Exception removing super admin: ${error.message}`,
      status: 'EXCEPTION'
    };
  }
};
