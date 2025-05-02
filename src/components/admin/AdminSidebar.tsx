
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  ChevronRight,
  Shield,
  UserCheck,
  X,
  Church,
  Music,
  Film,
  Camera,
  Headphones,
  ShieldCheck,
  Video,
  Speaker,
  UserCog
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperUser, isAdmin } = useAuth();
  const isMobile = useIsMobile();

  console.log('AdminSidebar rendering with:', { isSuperUser, isAdmin });

  // Common menu items for all admins
  const dashboardMenuItem = {
    name: "Dashboard",
    path: "/admin",
    icon: <LayoutDashboard size={20} />
  };

  // Regular admin menu items
  const regularAdminMenuItems = [
    {
      name: "Members",
      path: "/admin/members",
      icon: <Users size={20} />
    },
    {
      name: "Pastors",
      path: "/admin/pastors",
      icon: <UserCog size={20} />
    },
    {
      name: "Events",
      path: "/admin/events",
      icon: <Calendar size={20} />
    },
    {
      name: "Sermons",
      path: "/admin/sermons",
      icon: <FileText size={20} />
    }
  ];

  // Super user specific menu items
  const superUserMenuItems = [
    {
      name: "User Management",
      path: "/admin/users",
      icon: <Shield size={20} />
    },
    {
      name: "Members",
      path: "/admin/members",
      icon: <UserCheck size={20} />
    },
    {
      name: "Pastors",
      path: "/admin/pastors",
      icon: <UserCog size={20} />
    }
  ];

  // Church units menu items (only for super users)
  const churchUnitsMenuItems = [
    {
      name: "3HMedia",
      path: "/admin/units/3hmedia",
      icon: <Camera size={20} />
    },
    {
      name: "3HMusic",
      path: "/admin/units/3hmusic",
      icon: <Headphones size={20} />
    },
    {
      name: "3HMovies",
      path: "/admin/units/3hmovies",
      icon: <Film size={20} />
    },
    {
      name: "3HSecurity",
      path: "/admin/units/3hsecurity",
      icon: <ShieldCheck size={20} />
    },
    {
      name: "Discipleship",
      path: "/admin/units/discipleship",
      icon: <Users size={20} />
    },
    {
      name: "Praise Feet",
      path: "/admin/units/praisefeet",
      icon: <Speaker size={20} />
    },
    {
      name: "TOF",
      path: "/admin/units/tof",
      icon: <Church size={20} />
    }
  ];

  // Settings menu item for all
  const settingsMenuItem = {
    name: "Settings",
    path: "/admin/settings",
    icon: <Settings size={20} />
  };

  // Combine menu items based on user role
  const menuItems = isSuperUser
    ? [dashboardMenuItem, ...superUserMenuItems, settingsMenuItem]
    : [dashboardMenuItem, ...regularAdminMenuItems, settingsMenuItem];

  return (
    <div className="w-full md:w-64 bg-white border-r h-full flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className={`font-serif text-xl font-bold ${isSuperUser ? "text-yellow-600" : "text-church-red"}`}>
            {isSuperUser ? "Super Admin" : "Gospel Labour"}
          </div>
        </Link>

        {isMobile && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate("/admin")}>
            <X size={20} />
          </Button>
        )}
      </div>

      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
          {isSuperUser ? "SUPER ADMIN PANEL" : "ADMIN PANEL"}
        </p>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? isSuperUser
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-church-red/10 text-church-red"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
              {location.pathname === item.path && (
                <ChevronRight size={16} className="ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        {/* Church Units Section (Only for super users) */}
        {isSuperUser && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
              CHURCH UNITS
            </p>
            <nav className="space-y-1">
              {churchUnitsMenuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-yellow-50 text-yellow-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                  {location.pathname === item.path && (
                    <ChevronRight size={16} className="ml-auto" />
                  )}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Logout button removed */}
    </div>
  );
};

export default AdminSidebar;
