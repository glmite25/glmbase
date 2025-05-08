// API endpoint to sync all users to members
import { createClient } from '@supabase/supabase-js';

// Set CORS headers
const setCorsHeaders = (res) => {
  // Allow requests from any origin with credentials
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Allow the following HTTP methods
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  // Allow the following headers
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  
  // Set CORS headers for all responses
  setCorsHeaders(res);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.'
    });
  }
  
  try {
    console.log("Starting sync of all users to members table");
    
    // Create Supabase client with service role key
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        success: false,
        message: 'Missing Supabase credentials'
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Step 1: Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    
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
    
    // Create a set of existing member emails for quick lookup (case-insensitive)
    const memberEmails = new Set();
    members?.forEach(member => {
      if (member.email) {
        memberEmails.add(member.email.toLowerCase());
      }
    });
    
    console.log(`Found ${members?.length || 0} existing members`);
    
    // Step 4: Process each user
    const results = {
      profilesCreated: 0,
      membersCreated: 0,
      membersUpdated: 0,
      errors: []
    };
    
    for (const user of authUsers.users) {
      try {
        // Skip users without email
        if (!user.email) {
          console.log(`Skipping user without email: ${user.id}`);
          continue;
        }
        
        const email = user.email.toLowerCase();
        
        // Check if user already has a profile
        let profile = profileMap.get(user.id);
        
        // Create profile if it doesn't exist
        if (!profile) {
          console.log(`Creating profile for user: ${user.id}`);
          
          const newProfile = {
            id: user.id,
            email: email,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
          };
          
          const { error: insertProfileError } = await supabase
            .from("profiles")
            .insert([newProfile]);
          
          if (insertProfileError) {
            console.error(`Error creating profile for ${email}:`, insertProfileError);
            results.errors.push(`Failed to create profile for ${email}: ${insertProfileError.message}`);
            continue;
          }
          
          profile = newProfile;
          results.profilesCreated++;
        }
        
        // Check if member already exists
        const emailExists = memberEmails.has(email);
        
        if (!emailExists) {
          // Create new member
          const memberRecord = {
            fullname: profile.full_name || user.user_metadata?.full_name || email.split('@')[0] || 'Unknown',
            email: email,
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
            console.error(`Error creating member for ${email}:`, insertError);
            results.errors.push(`Failed to create member for ${email}: ${insertError.message}`);
            continue;
          }
          
          results.membersCreated++;
          console.log(`Created member for ${email}`);
        } else {
          // Check if the member has the user ID
          const member = members.find(m => m.email && m.email.toLowerCase() === email);
          
          if (member && !member.userid) {
            // Update the member with the user ID
            const { error: updateError } = await supabase
              .from("members")
              .update({ userid: user.id })
              .eq("email", email);
            
            if (updateError) {
              console.error(`Error updating member for ${email}:`, updateError);
              results.errors.push(`Failed to update member for ${email}: ${updateError.message}`);
              continue;
            }
            
            results.membersUpdated++;
          }
        }
      } catch (userError) {
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
    
  } catch (error) {
    console.error("Error in syncAllUsers:", error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    });
  }
}
