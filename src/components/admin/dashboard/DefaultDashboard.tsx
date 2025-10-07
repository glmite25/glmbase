import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Calendar, 
  Settings, 
  Shield, 
  UserCog, 
  BarChart3,
  Database,
  UserPlus,
  Activity
} from "lucide-react";

const DefaultDashboard = () => {
  const { user, isSuperUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Manage Members",
      description: "View and manage church members",
      icon: Users,
      path: "/admin/members",
      color: "bg-blue-500",
    },
    {
      title: "Manage Pastors",
      description: "Manage pastoral staff",
      icon: UserCog,
      path: "/admin/pastors",
      color: "bg-purple-500",
    },
    {
      title: "Events",
      description: "Manage church events",
      icon: Calendar,
      path: "/admin/events",
      color: "bg-green-500",
    },
    {
      title: "Settings",
      description: "Configure system settings",
      icon: Settings,
      path: "/admin/settings",
      color: "bg-gray-500",
    },
  ];

  const superUserActions = [
    {
      title: "User Management",
      description: "Manage user accounts and roles",
      icon: Shield,
      path: "/admin/users",
      color: "bg-red-500",
    },
    {
      title: "Analytics",
      description: "View detailed reports",
      icon: BarChart3,
      path: "/admin/analytics",
      color: "bg-indigo-500",
    },
    {
      title: "System Settings",
      description: "Advanced system configuration",
      icon: Database,
      path: "/admin/system",
      color: "bg-yellow-500",
    },
  ];

  const actionsToShow = isSuperUser 
    ? [...quickActions, ...superUserActions]
    : quickActions;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.email?.split('@')[0] || 'Admin'}!
        </h1>
        <p className="text-blue-100">
          {isSuperUser 
            ? "You have super admin access to all system features." 
            : "You have admin access to manage church operations."}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin Level</p>
                <p className="text-lg font-bold text-blue-600">
                  {isSuperUser ? "Super Admin" : "Admin"}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Access Level</p>
                <p className="text-lg font-bold text-purple-600">Full</p>
              </div>
              <UserPlus className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Login</p>
                <p className="text-lg font-bold text-gray-600">Today</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actionsToShow.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{action.description}</p>
                  <Button 
                    onClick={() => navigate(action.path)}
                    className="w-full"
                    variant="outline"
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Admin system is running normally</span>
              </div>
              <span className="text-xs text-gray-500">Just now</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Database connection is healthy</span>
              </div>
              <span className="text-xs text-gray-500">2 min ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">User authentication is working</span>
              </div>
              <span className="text-xs text-gray-500">5 min ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DefaultDashboard;