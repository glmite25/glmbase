import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys, invalidateRelatedQueries } from '@/lib/react-query-config';
import { useToast } from '@/hooks/use-toast';
import { Member } from './useMembers';

// Define types for pastor data (extends Member)
export interface Pastor extends Member {
  title: string; // Pastor's title is required for pastors
}

// Define filter options for fetching pastors
export interface PastorFilters {
  searchTerm?: string;
  title?: string;
  churchUnit?: string;
}

/**
 * Custom hook for fetching all pastors with optional filtering
 */
export const usePastors = (filters?: PastorFilters) => {
  return useQuery({
    queryKey: queryKeys.pastors.list(),
    queryFn: async () => {
      // Start building the query
      let query = supabase
        .from('members')
        .select('*')
        .eq('category', 'Pastors');

      // Apply filters
      if (filters) {
        // Search term filter
        if (filters.searchTerm && filters.searchTerm.trim() !== '') {
          const term = filters.searchTerm.toLowerCase();
          query = query.ilike('fullname', `%${term}%`);
        }

        // Title filter
        if (filters.title) {
          query = query.eq('title', filters.title);
        }

        // Church unit filter
        if (filters.churchUnit) {
          // Try to match either the primary church unit or in the array of church units
          query = query.or(`churchunit.eq.${filters.churchUnit},churchunits.cs.{${filters.churchUnit}}`);
        }
      }

      // Execute the query
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Pastor[];
    },
  });
};

/**
 * Custom hook for fetching a single pastor by ID
 */
export const usePastor = (id: string) => {
  return useQuery({
    queryKey: queryKeys.pastors.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .eq('category', 'Pastors')
        .single();

      if (error) {
        throw error;
      }

      return data as Pastor;
    },
    enabled: !!id, // Only run the query if an ID is provided
  });
};

/**
 * Normalize pastor data to handle case inconsistencies in the database
 * @param pastor The pastor data from the database
 * @returns Normalized pastor data
 */
export const normalizePastor = (pastor: any): Pastor => {
  // Handle case inconsistencies in column names
  return {
    id: pastor.id,
    fullname: pastor.fullname || pastor.fullName || '',
    email: pastor.email || '',
    phone: pastor.phone || '',
    address: pastor.address || '',
    category: pastor.category || 'Pastors',
    title: pastor.title || '',
    assignedto: pastor.assignedto || pastor.assignedTo || null,
    churchunit: pastor.churchunit || pastor.churchUnit || '',
    churchunits: pastor.churchunits || pastor.churchUnits || [],
    auxanogroup: pastor.auxanogroup || pastor.auxanoGroup || '',
    joindate: pastor.joindate || pastor.joinDate || new Date().toISOString().split('T')[0],
    notes: pastor.notes || '',
    isactive: pastor.isactive !== undefined ? pastor.isactive : (pastor.isActive !== undefined ? pastor.isActive : true),
    userid: pastor.userid || pastor.userId || null,
    created_at: pastor.created_at || new Date().toISOString(),
    updated_at: pastor.updated_at || new Date().toISOString(),
  };
};

/**
 * Custom hook for creating a new pastor
 */
export const useCreatePastor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newPastor: Omit<Pastor, 'id' | 'created_at' | 'updated_at'>) => {
      // Ensure category is set to 'Pastors'
      const pastorData = {
        ...newPastor,
        category: 'Pastors',
      };

      const { data, error } = await supabase
        .from('members')
        .insert([pastorData])
        .select();

      if (error) {
        throw error;
      }

      return data[0] as Pastor;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      invalidateRelatedQueries(queryClient, 'pastors');
      invalidateRelatedQueries(queryClient, 'members');
      
      // Show success toast
      toast({
        title: 'Pastor created',
        description: `${data.fullname} has been added as a pastor.`,
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to create pastor',
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
};

/**
 * Custom hook for updating an existing pastor
 */
export const useUpdatePastor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Pastor> & { id: string }) => {
      // Ensure category remains 'Pastors'
      const pastorUpdates = {
        ...updates,
        category: 'Pastors',
      };

      const { data, error } = await supabase
        .from('members')
        .update(pastorUpdates)
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      return data[0] as Pastor;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      invalidateRelatedQueries(queryClient, 'pastors', data.id);
      invalidateRelatedQueries(queryClient, 'members', data.id);
      
      // Show success toast
      toast({
        title: 'Pastor updated',
        description: `${data.fullname}'s information has been updated.`,
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to update pastor',
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
};

/**
 * Custom hook for assigning members to a pastor
 */
export const useAssignMembersToPastor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pastorId, memberIds }: { pastorId: string; memberIds: string[] }) => {
      // Update all members to be assigned to this pastor
      const { data, error } = await supabase
        .from('members')
        .update({ assignedto: pastorId })
        .in('id', memberIds)
        .select('id, fullname');

      if (error) {
        throw error;
      }

      return { pastorId, assignedMembers: data };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      invalidateRelatedQueries(queryClient, 'pastors', data.pastorId);
      invalidateRelatedQueries(queryClient, 'members');
      
      // Show success toast
      const memberCount = data.assignedMembers.length;
      toast({
        title: 'Members assigned',
        description: `${memberCount} member${memberCount !== 1 ? 's' : ''} assigned to pastor.`,
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Failed to assign members',
        description: error.message || 'An unexpected error occurred',
      });
    },
  });
};
