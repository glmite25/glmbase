import { type AdminUser } from "./types";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// New component imports
import UserTableLoading from "./UserTableLoading";
import UserTableEmpty from "./UserTableEmpty";
import UserTableRow from "./UserTableRow";

type UserTableProps = {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
};

const UserTable = ({ users, loading, onEdit, onDelete }: UserTableProps) => {
  if (loading) {
    return <UserTableLoading />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <UserTableEmpty />
          ) : (
            users.map((user) => (
              <UserTableRow 
                key={user.id}
                user={user}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
