// API endpoint to sync a specific user by email
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
    // Get email from request body
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    console.log(`Syncing user with email: ${email}`);
    
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
    
    // Step 1: Check if the user exists in auth.users
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return res.status(500).json({
        success: false,
        message: `Error finding user: ${listError.message}`
      });
    }
    
    // Find the user with the matching email (case-insensitive)
    const user = usersData.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No user found with email: ${email}`
      });
    }
    
    console.log(`Found user with ID: ${user.id}`);
    
    // Step 2: Check if the user already exists in the members table
    const { data: existingMembers, error: memberError } = await supabase
      .from("members")
      .select("*")
      .ilike("email", email);
    
    if (memberError) {
      console.error("Error checking existing members:", memberError);
      return res.status(500).json({
        success: false,
        message: `Error checking existing members: ${memberError.message}`
      });
    }
    
    if (existingMembers && existingMembers.length > 0) {
      console.log(`Member already exists with email: ${email}`);
      
      // Update the existing member with the user ID if it's missing
      if (!existingMembers[0].userid) {
        const { error: updateError } = await supabase
          .from("members")
          .update({ userid: user.id })
          .eq("id", existingMembers[0].id);
        
        if (updateError) {
          console.error("Error updating member:", updateError);
          return res.status(500).json({
            success: false,
            message: `Error updating member: ${updateError.message}`
          });
        }
        
        return res.status(200).json({
          success: true,
          message: `Member already exists with email: ${email}. Updated user ID.`,
          member: existingMembers[0]
        });
      }
      
      return res.status(200).json({
        success: true,
        message: `Member already exists with email: ${email}`,
        member: existingMembers[0]
      });
    }
    
    // Step 3: Get the user's profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error fetching profile:", profileError);
      return res.status(500).json({
        success: false,
        message: `Error fetching profile: ${profileError.message}`
      });
    }
    
    // Create profile if it doesn't exist
    if (!profileData) {
      console.log(`Creating profile for user: ${user.id}`);
      
      const newProfile = {
        id: user.id,
        email: email.toLowerCase(),
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      };
      
      const { error: insertProfileError } = await supabase
        .from("profiles")
        .insert([newProfile]);
      
      if (insertProfileError) {
        console.error("Error creating profile:", insertProfileError);
        return res.status(500).json({
          success: false,
          message: `Error creating profile: ${insertProfileError.message}`
        });
      }
    }
    
    // Step 4: Create the member record
    const memberRecord = {
      fullname: profileData?.full_name || user.user_metadata?.full_name || email.split('@')[0] || 'Unknown',
      email: email.toLowerCase(),
      category: 'Others', // Default category
      churchunit: profileData?.church_unit || null,
      assignedto: profileData?.assigned_pastor || null,
      phone: profileData?.phone || null,
      address: profileData?.address || null,
      isactive: true,
      joindate: new Date().toISOString().split('T')[0],
      userid: user.id, // Link to the auth user ID
    };
    
    console.log("Creating member record:", memberRecord);
    
    // Step 5: Insert the member
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
    
  } catch (error) {
    console.error("Error in syncUserByEmail:", error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message || "Unknown error"}`
    });
  }
}
