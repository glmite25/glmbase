import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, MessageSquare, Heart, BookOpen, UserCheck, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatsData {
  totalMembers: number;
  activeMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  totalDonations: number;
  monthlyDonations: number;
  totalSermons: number;
  recentSermons: number;
  prayerRequests: number;
  activePrayerRequests: number;
  testimonies: number;
  approvedTestimonies: number;
  visitors: number;
  recentVisitors: number;
}

const AdminStats = () => {
  const [stats, setStats] = useState<StatsData>({
    totalMembers: 0,
    activeMembers: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    totalDonations: 0,
    monthlyDonations: 0,
    totalSermons: 0,
    recentSermons: 0,
    prayerRequests: 0,
    activePrayerRequests: 0,
    testimonies: 0,
    approvedTestimonies: 0,
    visitors: 0,
    recentVisitors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        membersResult,
        activeMembersResult,
        eventsResult,
        upcomingEventsResult,
        donationsResult,
        monthlyDonationsResult,
        sermonsResult,
        recentSermonsResult,
        prayerRequestsResult,
        activePrayerRequestsResult,
        testimoniesResult,
        approvedTestimoniesResult,
        visitorsResult,
        recentVisitorsResult,
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('financial_records').select('amount').eq('status', 'completed'),
        supabase.from('financial_records').select('amount').eq('status', 'completed').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase.from('sermons').select('id', { count: 'exact', head: true }),
        supabase.from('sermons').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('is_approved', true),
        supabase.from('visitors').select('id', { count: 'exact', head: true }),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).gte('visit_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      // Calculate totals
      const totalDonations = donationsResult.data?.reduce((sum, record) => sum + (record.amount || 0), 0) || 0;
      const monthlyDonations = monthlyDonationsResult.data?.reduce((sum, record) => sum + (record.amount || 0), 0) || 0;

      setStats({
        totalMembers: membersResult.count || 0,
        activeMembers: activeMembersResult.count || 0,
        totalEvents: eventsResult.count || 0,
        upcomingEvents: upcomingEventsResult.count || 0,
        totalDonations,
        monthlyDonations,
        totalSermons: sermonsResult.count || 0,
        recentSermons: recentSermonsResult.count || 0,
        prayerRequests: prayerRequestsResult.count || 0,
        activePrayerRequests: activePrayerRequestsResult.count || 0,
        testimonies: testimoniesResult.count || 0,
        approvedTestimonies: approvedTestimoniesResult.count || 0,
        visitors: visitorsResult.count || 0,
        recentVisitors: recentVisitorsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
      title: "Events",
      value: stats.totalEvents,
      subtitle: `${stats.upcomingEvents} upcoming`,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Donations",
      value: formatCurrency(stats.totalDonations),
      subtitle: `${formatCurrency(stats.monthlyDonations)} this month`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Sermons",
      value: stats.totalSermons,
      subtitle: `${stats.recentSermons} recent`,
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Prayer Requests",
      value: stats.prayerRequests,
      subtitle: `${stats.activePrayerRequests} active`,
      icon: MessageSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Testimonies",
      value: stats.testimonies,
      subtitle: `${stats.approvedTestimonies} approved`,
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Visitors",
      value: stats.visitors,
      subtitle: `${stats.recentVisitors} recent`,
      icon: UserCheck,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Growth Rate",
      value: stats.activeMembers > 0 ? `${Math.round((stats.recentVisitors / stats.activeMembers) * 100)}%` : "0%",
      subtitle: "visitor to member ratio",
      icon: TrendingUp,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStats;