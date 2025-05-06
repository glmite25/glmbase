import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Checks if the required database triggers are installed
 * @returns Promise with the check result
 */
export const checkDatabaseTriggers = async () => {
  try {
    console.log("Checking database triggers...");
    
    // Check for the on_auth_user_created trigger
    const { data: authTriggers, error: authError } = await supabase.rpc(
      'check_trigger_exists',
      { trigger_name: 'on_auth_user_created', table_name: 'users', schema_name: 'auth' }
    );
    
    if (authError) {
      console.error("Error checking auth trigger:", authError);
      return {
        success: false,
        message: "Error checking database triggers",
        error: authError
      };
    }
    
    // Check for the on_profile_created trigger
    const { data: profileTriggers, error: profileError } = await supabase.rpc(
      'check_trigger_exists',
      { trigger_name: 'on_profile_created', table_name: 'profiles', schema_name: 'public' }
    );
    
    if (profileError) {
      console.error("Error checking profile trigger:", profileError);
      return {
        success: false,
        message: "Error checking database triggers",
        error: profileError
      };
    }
    
    const authTriggerExists = authTriggers === true;
    const profileTriggerExists = profileTriggers === true;
    
    if (!authTriggerExists || !profileTriggerExists) {
      console.warn("Missing database triggers:", {
        authTriggerExists,
        profileTriggerExists
      });
      
      return {
        success: false,
        message: "Missing database triggers",
        details: {
          authTriggerExists,
          profileTriggerExists
        }
      };
    }
    
    console.log("All required database triggers are installed");
    return {
      success: true,
      message: "All required database triggers are installed"
    };
  } catch (error: any) {
    console.error("Exception checking database triggers:", error);
    return {
      success: false,
      message: "Exception checking database triggers",
      error
    };
  }
};

/**
 * Creates the check_trigger_exists function in the database if it doesn't exist
 * This function is used to check if a trigger exists
 */
export const createTriggerCheckFunction = async () => {
  try {
    const { error } = await supabase.rpc('create_trigger_check_function');
    
    if (error) {
      console.error("Error creating trigger check function:", error);
      return {
        success: false,
        message: "Error creating trigger check function",
        error
      };
    }
    
    return {
      success: true,
      message: "Trigger check function created successfully"
    };
  } catch (error: any) {
    console.error("Exception creating trigger check function:", error);
    return {
      success: false,
      message: "Exception creating trigger check function",
      error
    };
  }
};

/**
 * Checks if the database triggers are properly installed and shows a toast notification with the result
 */
export const checkAndNotifyDatabaseTriggers = async () => {
  try {
    // First, create the trigger check function if it doesn't exist
    await createTriggerCheckFunction();
    
    // Then check if the triggers exist
    const result = await checkDatabaseTriggers();
    
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Database Configuration Issue",
        description: "Some database triggers are missing. Please contact the administrator.",
      });
      
      console.error("Database trigger check failed:", result);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking database triggers:", error);
    return false;
  }
};
