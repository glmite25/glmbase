import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, UserCheck, TrendingUp, Activity, Shield, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

interface StatsData {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  pastors: number;
  recentRegistrations: number;
}

const AdminStatsSimple = () => {
  const { user, isSuperUser, profile } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalMembers: 0,
    activeMembers: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    pastors: 0,
    recentRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch basic stats that we know exist
      const [
        membersResult,
        activeMembersResult,
        pastorsResult,
        recentMembersResult,
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('isactive', true),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('category', 'Pastors'),
        supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Events table not implemented yet
      const eventsCount = 0;
      const upcomingEventsCount = 0;

      setStats({
        totalMembers: membersResult.count || 0,
        activeMembers: activeMembersResult.count || 0,
        totalEvents: eventsCount,
        upcomingEvents: upcomingEventsCount,
        pastors: pastorsResult.count || 0,
        recentRegistrations: recentMembersResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default values if there's an error
      setStats({
        totalMembers: 0,
        activeMembers: 0,
        totalEvents: 0,
        upcomingEvents: 0,
        pastors: 0,
        recentRegistrations: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      subtitle: `${stats.activeMembers} active`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Pastors",
      value: stats.pastors,
      subtitle: "church leaders",
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Events",
      value: stats.totalEvents,
      subtitle: `${stats.upcomingEvents} upcoming`,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "New Members",
      value: stats.recentRegistrations,
      subtitle: "last 30 days",
      icon: UserPlus,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    // {
    //   title: "Active Rate",
    //   value: stats.totalMembers > 0 ? `${Math.round((stats.activeMembers / stats.totalMembers) * 100)}%` : "0%",
    //   subtitle: "member activity",
    //   icon: TrendingUp,
    //   color: "text-teal-600",
    //   bgColor: "bg-teal-50",
    // },
    // {
    //   title: "Growth Rate",
    //   value: stats.activeMembers > 0 ? `${Math.round((stats.recentRegistrations / stats.activeMembers) * 100)}%` : "0%",
    //   subtitle: "monthly growth",
    //   icon: UserCheck,
    //   color: "text-indigo-600",
    //   bgColor: "bg-indigo-50",
    // },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="md:flex items-center justify-between gap-4 text-gray-900 my-4 font-sans">

        <div>
          <h1 className="text-2xl font-bold font-sans mb-2">
            Welcome back, {profile?.full_name || 'Admin'}!
          </h1>
          <p className="text-gray-500">
            {isSuperUser
              ? "You have super admin access to all system features."
              : "You have admin access to manage church operations."}
          </p>
        </div>

        <div className="hidden md:flex items-center space-x-3 mb-2">
          <UserAvatar user={user} className="h-10 w-10" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs md:text-sm font-semibold font-sans text-gray-500 tracking-wide">
                  {stat.title}
                </CardTitle>
                <div
                  className={`p-2.5 rounded-xl ${stat.bgColor} shadow-inner-sm group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold font-sans text-gray-900 mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-400">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
     
    </>
  );
};

export default AdminStatsSimple;