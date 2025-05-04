import { useNavigate } from "react-router-dom";
import { User, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UserAvatar = () => {
  const { user, profile, isAdmin, isSuperUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!user) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      console.log("Logging out...");

      // Show toast before logout to ensure it's visible
      toast({
        title: "Logging out...",
      });

      // Clear all auth-related storage
      localStorage.removeItem('glm-auth-token');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
      localStorage.removeItem('supabase.auth.accessToken');

      // Clear session storage as well
      sessionStorage.removeItem('glm-auth-token');
      sessionStorage.removeItem('supabase.auth.token');

      // Clear any session cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures a complete sign-out across all tabs/windows
      });

      if (error) {
        console.error("Logout error:", error);
        throw error;
      }

      console.log("Logout successful");

      // Small delay to ensure the auth state has time to update
      setTimeout(() => {
        // Navigate to home page instead of using window.location for a smoother experience
        navigate("/");

        // Force a full page reload after a small delay to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }, 300);

    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Error logging out",
        description: error.message,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-9 w-9 cursor-pointer border-2 border-white hover:border-gray-200 transition-colors">
          <AvatarFallback className="bg-blue-600 text-white">
            {getInitials(profile?.full_name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {(isAdmin || isSuperUser) && (
            <DropdownMenuItem
              onClick={() => navigate("/admin")}
              className="cursor-pointer"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>{isSuperUser ? "Admin Dashboard" : "Dashboard"}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => navigate("/profile")}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </DropdownMenuItem>
          {(isAdmin || isSuperUser) && (
            <DropdownMenuItem
              onClick={() => navigate("/settings")}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAvatar;
