
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

  // Set a timeout to show a message if loading takes too long
  useEffect(() => {
    if (isLoading && !loadingTimeout && !forceLoaded) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Auth loading timeout reached after 5 seconds');
        setLoadingTimeout(true);
      }, 5000);
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

      // If we're in a timeout state or forced loaded, check what we have
      const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';

      if (!user && !storedSuperUserStatus) {
        console.log('No user found, redirecting to auth page');
        navigate("/auth");
        return;
      }

      if (!isAdmin && !isSuperUser && !storedSuperUserStatus) {
        console.log('User is not admin or superuser, redirecting to auth page');
        navigate("/auth");
        return;
      }

      console.log('User is authorized to access admin dashboard');
    };

    checkAuth();
  }, [user, isAdmin, isSuperUser, isLoading, loadingTimeout, forceLoaded, navigate]);

  // Force continue function for when loading gets stuck
  const handleForceContinue = () => {
    setForceLoaded(true);
    toast({
      title: "Continuing with limited functionality",
      description: "Some features may not be available until authentication completes.",
    });
  };

  // Show loading state
  if ((isLoading && !forceLoaded) || (loadingTimeout && !forceLoaded)) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          {loadingTimeout ? (
            <>
              <p className="text-lg font-medium">Still loading authentication state...</p>
              <p className="text-sm text-gray-500 max-w-md">
                This is taking longer than expected. There might be an issue with the authentication service.
              </p>
              <Button
                onClick={handleForceContinue}
                className="mt-4 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Continue Anyway
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p>Loading authentication state...</p>
            </>
          )}
        </div>
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
