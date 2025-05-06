
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import UserTable from "./users/UserTable";
import AddUserDialog from "./users/AddUserDialog";
import EditUserDialog from "./users/EditUserDialog";
import DeleteUserDialog from "./users/DeleteUserDialog";
import SuperAdminDialog from "./users/SuperAdminDialog";
import { fetchUsers } from "./users/UserManagementService";
import { AdminUser } from "./users/types";

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log("Loading users...");
      const { users: fetchedUsers, error } = await fetchUsers();

      if (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Error fetching users",
          description: error.message,
        });
        // Set empty array in case of error to avoid showing stale data
        setUsers([]);
      } else {
        console.log(`Loaded ${fetchedUsers.length} users`);
        setUsers(fetchedUsers);
      }
    } catch (error: any) {
      console.error("Exception in loadUsers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error.message || "An unexpected error occurred",
      });
      // Set empty array in case of error to avoid showing stale data
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setOpenEditDialog(true);
  };

  const handleDeleteUser = (user: AdminUser) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage administrators and users</CardDescription>
          </div>
          <div className="flex space-x-2">
            <SuperAdminDialog onSuperAdminAdded={loadUsers} />
            <AddUserDialog onUserAdded={loadUsers} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <UserTable
          users={users}
          loading={loading}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />

        <EditUserDialog
          user={selectedUser}
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
          onUserUpdated={loadUsers}
        />

        <DeleteUserDialog
          user={selectedUser}
          open={openDeleteDialog}
          onOpenChange={setOpenDeleteDialog}
          onUserDeleted={loadUsers}
        />
      </CardContent>
    </Card>
  );
}
