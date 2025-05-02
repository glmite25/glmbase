import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  registeredUsers: number;
  adminUsers: number;
  superAdmins: number;
  pastors: number;
  churchUnits: {
    [key: string]: number;
  };
  systemStatus: {
    status: 'Healthy' | 'Warning' | 'Error';
    message: string;
  };
}

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  try {
    // Initialize default metrics
    const metrics: DashboardMetrics = {
      totalMembers: 0,
      activeMembers: 0,
      newMembers: 0,
      registeredUsers: 0,
      adminUsers: 0,
      superAdmins: 0,
      pastors: 0,
      churchUnits: {},
      systemStatus: {
        status: 'Healthy',
        message: 'All services running'
      }
    };

    // Get total members count
    const { count: totalMembers, error: membersError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (membersError) throw membersError;
    metrics.totalMembers = totalMembers || 0;

    // Get active members (members with isActive = true)
    const { count: activeMembers, error: activeError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('isActive', true);

    if (activeError) throw activeError;
    metrics.activeMembers = activeMembers || 0;

    // Get new members (joined in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { count: newMembers, error: newMembersError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('joinDate', thirtyDaysAgoStr);

    if (newMembersError) throw newMembersError;
    metrics.newMembers = newMembers || 0;

    // Get registered users count
    const { count: registeredUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;
    metrics.registeredUsers = registeredUsers || 0;

    // Get admin users count
    const { count: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminError) throw adminError;
    metrics.adminUsers = adminUsers || 0;

    // Get super admin count (this is just for display, actual super admin is determined by email)
    metrics.superAdmins = 1; // Hardcoded as there's typically just one super admin

    // Get pastors count
    const { count: pastors, error: pastorsError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'Pastors');

    if (pastorsError) throw pastorsError;
    metrics.pastors = pastors || 0;

    // Get church units distribution
    const { data: unitsData, error: unitsError } = await supabase
      .from('members')
      .select('churchUnit');

    if (unitsError) throw unitsError;

    // Count members by church unit
    const churchUnits: {[key: string]: number} = {};
    unitsData.forEach(member => {
      if (member.churchUnit) {
        churchUnits[member.churchUnit] = (churchUnits[member.churchUnit] || 0) + 1;
      }
    });
    metrics.churchUnits = churchUnits;

    // Check system status (this is a mock, in a real app you'd check actual services)
    // For now, we'll assume everything is healthy
    metrics.systemStatus = {
      status: 'Healthy',
      message: 'All services running'
    };

    return metrics;
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    // Return default metrics in case of error
    return {
      totalMembers: 0,
      activeMembers: 0,
      newMembers: 0,
      registeredUsers: 0,
      adminUsers: 0,
      superAdmins: 1,
      pastors: 0,
      churchUnits: {},
      systemStatus: {
        status: 'Warning',
        message: 'Error fetching some metrics'
      }
    };
  }
};
