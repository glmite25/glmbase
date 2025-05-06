import { Member } from "@/types/member";
import { PaginatedTable } from "@/components/ui/paginated-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface PaginatedMembersTableProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  getAssignedPastorName: (memberId: string) => string;
  initialPageSize?: number;
}

export function PaginatedMembersTable({
  members,
  onEdit,
  onDelete,
  getAssignedPastorName,
  initialPageSize = 10
}: PaginatedMembersTableProps) {
  // Define columns for the paginated table
  const columns = [
    {
      header: "Name",
      accessorKey: "fullName" as keyof Member,
    },
    {
      header: "Email",
      accessorKey: "email" as keyof Member,
    },
    {
      header: "Category",
      accessorKey: "category" as keyof Member,
    },
    {
      header: "Assigned Pastor",
      accessorKey: (member: Member) => 
        member.assignedTo ? getAssignedPastorName(member.assignedTo) : "Not Assigned",
    },
    {
      header: "Church Unit",
      cell: (member: Member) => (
        member.churchUnit 
          ? <Badge className="bg-blue-100 text-blue-800">{member.churchUnit}</Badge>
          : "Not Assigned"
      ),
    },
    {
      header: "Auxano Group",
      accessorKey: (member: Member) => member.auxanoGroup || "Not Assigned",
    },
    {
      header: "Status",
      cell: (member: Member) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            member.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {member.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "w-[100px] text-right",
      cell: (member: Member) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(member);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(member);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PaginatedTable
      data={members}
      columns={columns}
      initialPageSize={initialPageSize}
      pageSizeOptions={[5, 10, 20, 50, 100]}
      emptyState={
        <div className="py-6 text-center">
          <p className="text-muted-foreground">No members found</p>
        </div>
      }
    />
  );
}
