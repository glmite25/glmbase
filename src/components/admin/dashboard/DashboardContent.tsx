
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import UserManagement from "@/components/admin/UserManagement";
import MembersView from "@/components/admin/MembersView";
import PastorsPage from "@/components/admin/pastors/PastorsPage";
import PastorDetail from "@/components/admin/pastors/PastorDetail";
import PlaceholderCard from "./PlaceholderCard";
import StatsCardGrid from "./StatsCardGrid";
import SuperUserSection from "./SuperUserSection";
import AdminSection from "./AdminSection";
import { getSuperUserStatus } from "@/utils/superuser-fix";

const DashboardContent = () => {
  const { isSuperUser } = useAuth();

  // Additional check for superuser status using our utility function
  const storedSuperUserStatus = getSuperUserStatus();
  const effectiveSuperUser = isSuperUser || storedSuperUserStatus;

  console.log('DashboardContent rendering with:', {
    isSuperUser,
    storedSuperUserStatus,
    effectiveSuperUser
  });
  const location = useLocation();
  const path = location.pathname;

  // Determine which component to render based on the current path
  if (path === "/admin/users") {
    return <UserManagement />;
  } else if (path === "/admin/members") {
    return <MembersView />;
  } else if (path === "/admin/pastors") {
    return <PastorsPage />;
  } else if (path.startsWith("/admin/pastors/") && path !== "/admin/pastors") {
    return <PastorDetail />;
  } else if (path === "/admin/events") {
    return <PlaceholderCard title="Events Management" description="Manage church events" />;
  } else if (path === "/admin/sermons") {
    return <PlaceholderCard title="Sermons Management" description="Manage church sermons" />;
  } else if (path === "/admin/settings") {
    return <PlaceholderCard title="Settings" description="Manage church settings" />;
  } else if (path.startsWith("/admin/units/")) {
    // Extract the unit name from the path
    const unitName = path.split("/").pop();

    // Format the unit name for display
    const formatUnitName = (name: string) => {
      if (!name) return "";

      // Handle special formats
      if (name.startsWith("3h")) {
        return name.replace("3h", "3H");
      }

      // Capitalize first letter of each word
      return name
        .split(/[^a-zA-Z0-9]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    const displayName = formatUnitName(unitName || "");

    return (
      <PlaceholderCard
        title={`${displayName} Unit`}
        description={`Manage ${displayName} unit members and activities`}
      />
    );
  } else {
    // Default dashboard
    return (
      <>
        <StatsCardGrid />
        {effectiveSuperUser ? <SuperUserSection /> : <AdminSection />}
      </>
    );
  }
};

export default DashboardContent;
