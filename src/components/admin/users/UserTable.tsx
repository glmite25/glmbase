
import { type AdminUser } from "./types";

import {
  Table,
  TableBody,
  TableCell,
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
    <Table>
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
  );
};

export default UserTable;
