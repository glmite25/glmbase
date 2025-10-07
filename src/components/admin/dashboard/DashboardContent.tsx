
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/ui/loading-spinner";
// Removed superuser-fix import as it's not needed

// Lazy load components
const UserManagement = lazy(() => import("@/components/admin/UserManagement"));
// MembersView removed - using MembersManager instead
const MembersManager = lazy(() => import("@/components/admin/members/MembersManager"));
// Sermons functionality removed per user request
const PastorsPage = lazy(() => import("@/components/admin/pastors/PastorsPage"));
const PastorDetail = lazy(() => import("@/components/admin/pastors/PastorDetail"));
const UnitMembersView = lazy(() => import("@/components/admin/units/UnitMembersView"));
const UserProfileView = lazy(() => import("@/components/admin/profile/UserProfileView"));
const PlaceholderCard = lazy(() => import("./PlaceholderCard"));
const DefaultDashboard = lazy(() => import("./DefaultDashboard"));

const DashboardContent = () => {
  const { isSuperUser } = useAuth();

  // Check for stored admin status as fallback
  const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
  const effectiveSuperUser = isSuperUser || storedSuperUserStatus;

  console.log('DashboardContent rendering with:', {
    isSuperUser,
    storedSuperUserStatus,
    effectiveSuperUser
  });
  const location = useLocation();
  const path = location.pathname;

  // Format unit name for display
  const formatUnitName = (name: string) => {
    if (!name) return "";

    // Handle special formats
    if (name === "cloventongues") {
      return "Cloven Tongues";
    } else if (name.startsWith("3h")) {
      return name.replace("3h", "3H");
    }

    // Capitalize first letter of each word
    return name
      .split(/[^a-zA-Z0-9]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Determine which component to render based on the current path
  const renderContent = () => {
    if (path === "/admin/users") {
      return <UserManagement />;
    } else if (path === "/admin/members") {
      return <MembersManager />;
    } else if (path === "/admin/pastors") {
      return <PastorsPage />;
    } else if (path.startsWith("/admin/pastors/") && path !== "/admin/pastors") {
      return <PastorDetail />;
    } else if (path === "/admin/events") {
      return <PlaceholderCard title="Events Management" description="Manage church events" />;
    } else if (path === "/admin/sermons") {
      return <PlaceholderCard title="Sermons Management" description="Sermons feature not implemented" />;
    } else if (path === "/admin/testimonies") {
      return <PlaceholderCard title="Testimonies Management" description="Manage member testimonies" />;
    } else if (path === "/admin/prayers") {
      return <PlaceholderCard title="Prayer Requests" description="Manage prayer requests" />;
    } else if (path === "/admin/visitors") {
      return <PlaceholderCard title="Visitors Management" description="Manage church visitors" />;
    } else if (path === "/admin/finances") {
      return <PlaceholderCard title="Financial Records" description="Manage financial records" />;
    } else if (path === "/admin/communications") {
      return <PlaceholderCard title="Communications" description="Manage member communications" />;
    } else if (path === "/admin/analytics") {
      return <PlaceholderCard title="Analytics Dashboard" description="View detailed analytics and reports" />;
    } else if (path === "/admin/system") {
      return <PlaceholderCard title="System Settings" description="Manage system configuration" />;
    } else if (path === "/admin/settings") {
      return <PlaceholderCard title="Settings" description="Manage church settings" />;
    } else if (path === "/admin/profile") {
      return <UserProfileView />;
    } else if (path.startsWith("/admin/units/")) {
      // Extract the unit name from the path
      const unitId = path.split("/").pop();
      const displayName = formatUnitName(unitId || "");
      return <UnitMembersView unitId={unitId || ""} unitName={displayName} />;
    } else {
      // Default dashboard
      return <DefaultDashboard />;
    }
  };

  return (
    <Suspense fallback={<PageLoader />}>
      {renderContent()}
    </Suspense>
  );
};

export default DashboardContent;
