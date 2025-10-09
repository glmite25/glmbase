
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PageLoader } from "@/components/ui/loading-spinner";

// Lazy load admin components
const AdminSidebar = lazy(() => import("@/components/admin/AdminSidebar"));
const DashboardHeader = lazy(() => import("@/components/admin/dashboard/DashboardHeader"));
const DashboardContent = lazy(() => import("@/components/admin/dashboard/DashboardContent"));
const AdminStats = lazy(() => import("@/components/admin/dashboard/AdminStatsSimple"));

const AdminDashboard = () => {
  const { user, isAdmin, isSuperUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [forceLoaded, setForceLoaded] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  console.log('AdminDashboard rendering with:', {
    user: user ? 'User logged in' : 'No user',
    isAdmin,
    isSuperUser,
    isLoading,
    loadingTimeout,
    forceLoaded,
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

  // Add a timeout for loading state
  useEffect(() => {
    // Clear any existing timeout when component unmounts or dependencies change
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Set a timeout to show continue option if loading takes too long
  useEffect(() => {
    if (isLoading && !loadingTimeout && !forceLoaded) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('Auth loading taking longer than expected, showing continue option');
        setLoadingTimeout(true);
      }, 2000); // Reduced to 2 seconds for faster response
    } else if (!isLoading && loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, loadingTimeout, forceLoaded]);

  // Redirect if not logged in or not an admin/superuser
  useEffect(() => {
    const checkAuth = async () => {
      // If we're still loading but not in a timeout state, just wait
      if (isLoading && !loadingTimeout && !forceLoaded) {
        console.log('Still loading auth state...');
        return;
      }

      // Check for admin status with multiple fallbacks
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
      const storedAdminStatus = localStorage.getItem('glm-is-admin') === 'true';
      
      // Admin email whitelist
      const adminEmails = ['ojidelawrence@gmail.com', 'admin@gospellabourministry.com'];
      const isAdminEmail = user?.email && adminEmails.includes(user.email.toLowerCase());

      const hasAdminAccess = isAdmin || isSuperUser || storedSuperUserStatus || storedAdminStatus || isAdminEmail;

      if (!user && !storedSuperUserStatus && !storedAdminStatus) {
        console.log('No user found, redirecting to auth page');
        navigate("/auth");
        return;
      }

      if (user && !hasAdminAccess) {
        console.log('User is not admin, redirecting to auth page');
        navigate("/auth");
        return;
      }

      // If user has admin email but no stored status, grant access
      if (user && isAdminEmail && !storedAdminStatus) {
        localStorage.setItem('glm-is-admin', 'true');
        if (user.email?.toLowerCase() === 'ojidelawrence@gmail.com') {
          localStorage.setItem('glm-is-superuser', 'true');
        }
      }

      console.log('User is authorized to access admin dashboard');
    };

    checkAuth();
  }, [user, isAdmin, isSuperUser, isLoading, loadingTimeout, forceLoaded, navigate]);

  // Force continue function for when loading gets stuck
  const handleForceContinue = () => {
    setForceLoaded(true);
    toast({
      title: "Loading admin dashboard",
      description: "Continuing to admin dashboard...",
    });
  };

  // Show loading state
  if ((isLoading && !forceLoaded) || (loadingTimeout && !forceLoaded)) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-gray-50">
        <div className="text-center space-y-6 max-w-md">
          <div className="bg-white rounded-lg p-8 shadow-sm border">
            {loadingTimeout ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Loading Admin Dashboard
                </h2>
                <p className="text-gray-600 mb-4">
                  We're setting up your admin access. This may take a moment.
                </p>
                <Button
                  onClick={handleForceContinue}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Continue
                </Button>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Preparing Admin Dashboard
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your admin access...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user || (!isAdmin && !isSuperUser)) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Mobile sidebar toggle button */}
      <div className="md:hidden sticky top-0 z-10 bg-white p-4 border-b flex items-center justify-between">
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
            <Suspense fallback={<div className="p-4">Loading sidebar...</div>}>
              <AdminSidebar />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="md:block">
          <Suspense fallback={<div className="h-16 bg-gray-100 animate-pulse rounded-md"></div>}>
            <DashboardHeader
              title={isSuperUser ? "Super Admin Dashboard" : "Admin Dashboard"}
              description={isSuperUser ? "Manage users, members, and system settings" : "Manage members, events, and more"}
            />
          </Suspense>
        </div>
        
        {/* Admin Statistics */}
        <Suspense fallback={<div className="grid grid-cols-4 gap-4 mb-8">{Array.from({length: 8}).map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-md"></div>)}</div>}>
          <AdminStats />
        </Suspense>
        
        <Suspense fallback={<PageLoader />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
};

export default AdminDashboard;
