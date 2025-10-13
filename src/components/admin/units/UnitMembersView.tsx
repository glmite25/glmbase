import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UnitMembersTable } from "./UnitMembersTable";

interface UnitMembersViewProps {
  unitId: string;
  unitName: string;
}

interface UnitStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
}

export default function UnitMembersView({ unitId, unitName }: UnitMembersViewProps) {
  const [stats, setStats] = useState<UnitStats>({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnitStats();
  }, [unitId]);

  const fetchUnitStats = async () => {
    try {
      setLoading(true);

      // Get total members in this unit
      const { count: totalCount } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .or(`churchunit.eq.${unitId},churchunits.cs.{${unitId}}`);

      // Get active members in this unit
      const { count: activeCount } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .or(`churchunit.eq.${unitId},churchunits.cs.{${unitId}}`)
        .eq('isactive', true);

      setStats({
        totalMembers: totalCount || 0,
        activeMembers: activeCount || 0,
        inactiveMembers: (totalCount || 0) - (activeCount || 0),
      });
    } catch (error) {
      console.error('Error fetching unit stats:', error);
      setStats({
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unit Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : stats.totalMembers}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : stats.activeMembers}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : stats.inactiveMembers}</p>
                <p className="text-sm text-muted-foreground">Inactive Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unit Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {unitName} Unit
                <Badge variant="secondary">{stats.totalMembers} members</Badge>
              </CardTitle>
              <CardDescription>Manage members in the {unitName} unit</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UnitMembersTable 
            unitId={unitId} 
            unitName={unitName} 
            onStatsUpdate={fetchUnitStats}
          />
        </CardContent>
      </Card>
    </div>
  );
}
