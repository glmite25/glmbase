
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/admin/dashboard/DashboardHeader";
import DashboardContent from "@/components/admin/dashboard/DashboardContent";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const { user, isAdmin, isSuperUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  console.log('AdminDashboard rendering with:', {
    user: user ? 'User logged in' : 'No user',
    isAdmin,
    isSuperUser,
    isLoading,
    email: user?.email,
    storedSuperUserStatus: localStorage.getItem('glm-is-superuser') === 'true'
  });

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when changing to mobile view
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Redirect if not logged in or not an admin/superuser
  useEffect(() => {
    const checkAuth = async () => {
      // Wait a bit to ensure auth state is fully loaded
      if (isLoading) {
        console.log('Still loading auth state...');
        return;
      }

      if (!user) {
        console.log('No user found, redirecting to auth page');
        navigate("/auth");
        return;
      }

      if (!isAdmin && !isSuperUser) {
        console.log('User is not admin or superuser, redirecting to auth page');
        navigate("/auth");
        return;
      }

      console.log('User is authorized to access admin dashboard');
    };

    checkAuth();
  }, [user, isAdmin, isSuperUser, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || (!isAdmin && !isSuperUser)) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 pt-16">
      {/* Mobile sidebar toggle button */}
      <div className="md:hidden sticky top-16 z-10 bg-white p-4 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-gray-700"
        >
          <Menu />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <h1 className={`text-lg font-bold ${isSuperUser ? "text-yellow-600" : "text-church-red"}`}>
          {isSuperUser ? "Super Admin" : "Admin Dashboard"}
        </h1>
      </div>

      {/* Sidebar - conditionally shown on mobile */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block z-30 ${isMobile ? 'fixed inset-0 top-16' : ''}`}>
        <div
          className={`${isMobile ? 'bg-black/50 absolute inset-0' : ''}`}
          onClick={() => isMobile && setSidebarOpen(false)}
        >
          <div
            className={`w-64 bg-white h-[calc(100vh-4rem)] ${isMobile ? 'relative' : 'sticky top-16'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebar />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="md:block">
          <DashboardHeader
            title={isSuperUser ? "Super Admin Dashboard" : "Admin Dashboard"}
            description={isSuperUser ? "Manage users, members, and system settings" : "Manage members, events, and more"}
          />
        </div>
        <DashboardContent />
      </div>
    </div>
  );
};

export default AdminDashboard;
