import { supabase } from '@/integrations/supabase/client';

/**
 * Utility functions for common database operations
 */

/**
 * Fetches members with pagination and optional filtering
 * @param page The page number (1-based)
 * @param pageSize The number of items per page
 * @param filters Optional filters to apply
 * @returns Paginated members and total count
 */
export async function fetchPaginatedMembers(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    searchTerm?: string;
    category?: string;
    churchUnit?: string;
    pastorId?: string;
    isActive?: boolean;
  } = {}
) {
  try {
    console.log(`Fetching members page ${page}, size ${pageSize} with filters:`, filters);

    // Calculate pagination parameters
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Add timestamp to avoid caching issues
    const timestamp = new Date().getTime();

    // Start building the query - get newest members first
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false }); // Get newest members first

    // Note: .options() method is not available in this Supabase version
    // We'll use the timestamp in our logging instead

    // Apply filters
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const term = filters.searchTerm.toLowerCase();
      query = query.or(`fullname.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.churchUnit) {
      // Try to match either the primary church unit or in the array of church units
      query = query.or(`churchunit.eq.${filters.churchUnit},churchunits.cs.{${filters.churchUnit}}`);
    }

    if (filters.pastorId) {
      query = query.eq('assignedto', filters.pastorId);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('isactive', filters.isActive);
    }

    // Apply pagination
    query = query.range(from, to);

    // Execute the query
    console.log("Executing members query...");
    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching members:", error);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} members out of ${count || 0} total`);

    // Log the first few members for debugging
    if (data && data.length > 0) {
      console.log("First member:", data[0]);

      // Check for specific users we're looking for
      const targetUsers = data.filter(m =>
        m.email?.toLowerCase().includes('popsabey1') ||
        m.fullname?.toLowerCase().includes('biodun')
      );

      if (targetUsers.length > 0) {
        console.log("Found target users in results:", targetUsers);
      } else {
        console.log("Target users not found in this page of results");
      }
    }

    return {
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('Error fetching paginated members:', error);
    throw error;
  }
}

/**
 * Fetches pastors with pagination and optional filtering
 * @param page The page number (1-based)
 * @param pageSize The number of items per page
 * @param filters Optional filters to apply
 * @returns Paginated pastors and total count
 */
export async function fetchPaginatedPastors(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    searchTerm?: string;
    churchUnit?: string;
  } = {}
) {
  try {
    // Calculate pagination parameters
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start building the query
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .eq('category', 'Pastors');

    // Apply filters
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const term = filters.searchTerm.toLowerCase();
      query = query.ilike('fullname', `%${term}%`);
    }

    if (filters.churchUnit) {
      // Try to match either the primary church unit or in the array of church units
      query = query.or(`churchunit.eq.${filters.churchUnit},churchunits.cs.{${filters.churchUnit}}`);
    }

    // Apply pagination
    query = query.range(from, to);

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('Error fetching paginated pastors:', error);
    throw error;
  }
}

/**
 * Fetches users with pagination and optional filtering
 * @param page The page number (1-based)
 * @param pageSize The number of items per page
 * @param filters Optional filters to apply
 * @returns Paginated users and total count
 */
export async function fetchPaginatedUsers(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    searchTerm?: string;
    role?: string;
  } = {}
) {
  try {
    // Calculate pagination parameters
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start building the query
    let query = supabase
      .from('user_roles_view')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const term = filters.searchTerm.toLowerCase();
      query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
    }

    if (filters.role) {
      query = query.eq('highest_role', filters.role);
    }

    // Apply pagination
    query = query.range(from, to);

    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    console.error('Error fetching paginated users:', error);
    throw error;
  }
}
