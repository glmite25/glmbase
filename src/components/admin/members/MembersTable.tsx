
import { Member } from "@/types/member";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";

interface MembersTableProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  getAssignedPastorName: (memberId: string) => string;
}

export function MembersTable({
  members,
  onEdit,
  onDelete,
  getAssignedPastorName
}: MembersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Assigned Pastor</TableHead>
          <TableHead>Church Unit</TableHead>
          <TableHead>Auxano Group</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-4">
              No members found
            </TableCell>
          </TableRow>
        ) : (
          members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.fullName}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.category}</TableCell>
              <TableCell>
                {member.assignedTo ? getAssignedPastorName(member.assignedTo) : "Not Assigned"}
              </TableCell>
              <TableCell>
                {/* Handle both camelCase and lowercase column names */}
                {(member.churchUnits || member.churchunits) &&
                 (member.churchUnits?.length > 0 || member.churchunits?.length > 0)
                  ? (member.churchUnits || member.churchunits || []).map(unit => (
                      <Badge key={unit} className="mr-1 mb-1 bg-blue-100 text-blue-800">
                        {unit}
                      </Badge>
                    ))
                  : (member.churchUnit || member.churchunit)
                    ? <Badge className="bg-blue-100 text-blue-800">{member.churchUnit || member.churchunit}</Badge>
                    : "Not Assigned"}
              </TableCell>
              <TableCell>
                {member.auxanoGroup || "Not Assigned"}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    member.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {member.isActive ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(member)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(member)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
