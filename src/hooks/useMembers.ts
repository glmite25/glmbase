import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys, invalidateRelatedQueries } from '@/lib/react-query-config';
import { useToast } from '@/hooks/use-toast';

// Define types for member data
export interface Member {
  id: string;
  fullname: string;
  email: string;
  phone?: string;
  address?: string;
  category: string;
  title?: string;
  assignedto?: string;
  churchunit?: string;
  churchunits?: string[];
  auxanogroup?: string;
  joindate: string;
  notes?: string;
  isactive: boolean;
  userid?: string;
  created_at: string;
  updated_at: string;
}

// Define filter options for fetching members
export interface MemberFilters {
  searchTerm?: string;
  category?: string;
  churchUnit?: string;
  pastorId?: string;
  isActive?: boolean;
}

/**
 * Custom hook for fetching members with optional filtering
 */
export const useMembers = (filters?: MemberFilters) => {
  return useQuery({
    queryKey: queryKeys.members.list(filters),
    queryFn: async () => {
      // Start building the query
      let query = supabase.from('members').select('*');

      // Apply filters
      if (filters) {
        // Search term filter (case-insensitive search on multiple columns)
        if (filters.searchTerm && filters.searchTerm.trim() !== '') {
          const term = filters.searchTerm.toLowerCase();
          query = query.or(`fullname.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
        }

        // Category filter
        if (filters.category) {
          query = query.eq('category', filters.category);
        }

        // Church unit filter
        if (filters.churchUnit) {
          // Try to match either the primary church unit or in the array of church units
          query = query.or(`churchunit.eq.${filters.churchUnit},churchunits.cs.{${filters.churchUnit}}`);
        }

        // Pastor filter
        if (filters.pastorId) {
          query = query.eq('assignedto', filters.pastorId);
        }

        // Active status filter
        if (filters.isActive !== undefined) {
          query = query.eq('isactive', filters.isActive);
        }
      }

      // Execute the query
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Member[];
    },
  });
};

/**
 * Custom hook for fetching a single member by ID
 */
export const useMember = (id: string) => {
  return useQuery({
    queryKey: queryKeys.members.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data as Member;
    },
    enabled: !!id, // Only run the query if an ID is provided
  });
};

/**
 * Custom hook for fetching members assigned to a specific pastor
 */
export const useMembersByPastor = (pastorId: string) => {
  return useQuery({
    queryKey: queryKeys.members.byPastor(pastorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('assignedto', pastorId);

      if (error) {
        throw error;
      }

      return data as Member[];
    },
    enabled: !!pastorId, // Only run the query if a pastor ID is provided
  });
};

/**
 * Custom hook for creating a new member
 */
export const useCreateMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newMember: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('members')
        .insert([newMember])
        .select();

      if (error) {
        throw error;
      }

      return data[0] as Member;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      invalidateRelatedQueries(queryClient, 'members');
      
      // Show success toast
      toast({
        title: 'Member created',
        description: `${data.fullname} has been added successfully.`,
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to create member',
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
};

/**
 * Custom hook for updating an existing member
 */
export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      return data[0] as Member;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      invalidateRelatedQueries(queryClient, 'members', data.id);
      
      // If the member is a pastor, also invalidate pastor queries
      if (data.category === 'Pastors') {
        invalidateRelatedQueries(queryClient, 'pastors', data.id);
      }
      
      // Show success toast
      toast({
        title: 'Member updated',
        description: `${data.fullname}'s information has been updated.`,
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to update member',
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
};

/**
 * Custom hook for deleting a member
 */
export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the member to have their data for the success message
      const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('fullname, category')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Then delete the member
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return { id, fullname: member.fullname, category: member.category };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      invalidateRelatedQueries(queryClient, 'members');
      
      // If the member was a pastor, also invalidate pastor queries
      if (data.category === 'Pastors') {
        invalidateRelatedQueries(queryClient, 'pastors');
      }
      
      // Show success toast
      toast({
        title: 'Member deleted',
        description: `${data.fullname} has been removed.`,
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to delete member',
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
};
