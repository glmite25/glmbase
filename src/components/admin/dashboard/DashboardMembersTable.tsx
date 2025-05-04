import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Edit, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { Member, MemberCategory } from "@/types/member";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";

interface DashboardMembersTableProps {
  category: MemberCategory | 'All';
}

const DashboardMembersTable = ({ category }: DashboardMembersTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pastors, setPastors] = useState<{ id: string; fullName: string }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch data when category or searchTerm changes
  useEffect(() => {
    fetchMembers();
    fetchPastors();
  }, [category, searchTerm]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Start building the query
      let query = supabase.from('members').select('*');

      // Filter by category if not 'All'
      if (category !== 'All') {
        query = query.eq('category', category);
      }

      // Apply search filter at the database level if searchTerm exists
      if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();

        // Use ilike for case-insensitive search on multiple columns
        // Use lowercase column names to match the database
        query = query.or(`fullname.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      // Execute the query
      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform the data to match the Member interface
        const formattedMembers: Member[] = data.map(member => ({
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone || undefined,
          address: member.address || undefined,
          category: member.category as any,
          joinDate: member.joinDate || new Date().toISOString().split('T')[0],
          assignedTo: member.assignedTo || undefined,
          // Standardize church unit fields
          churchUnits: member.churchUnits || member.churchunits ||
                      (member.churchUnit ? [member.churchUnit] :
                      (member.churchunit ? [member.churchunit] : [])),
          churchUnit: member.churchUnit || member.churchunit ||
                     (member.churchUnits && member.churchUnits.length > 0 ? member.churchUnits[0] :
                     (member.churchunits && member.churchunits.length > 0 ? member.churchunits[0] : undefined)),
          auxanoGroup: member.auxanoGroup || undefined,
          notes: member.notes || undefined,
          isActive: member.isActive !== false, // Default to true if not specified
        }));

        setMembers(formattedMembers);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to fetch members');
      toast({
        variant: "destructive",
        title: "Error fetching members",
        description: error.message,
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastors = async () => {
    try {
      console.log('Fetching pastors from Supabase...');

      // Test Supabase connection first
      const { data: testData, error: testError } = await supabase
        .from('members')
        .select('count()')
        .limit(1);

      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Supabase connection error: ${testError.message}`);
      }

      console.log('Supabase connection test successful');

      // Now fetch pastors
      const { data, error } = await supabase
        .from('members')
        .select('id, fullname')
        .eq('category', 'Pastors');

      if (error) throw error;

      console.log('Pastors data received:', data);

      if (data && data.length > 0) {
        setPastors(data);
      } else {
        console.log('No pastors found in database');
        setPastors([]);
      }
    } catch (error: any) {
      console.error('Error fetching pastors:', error);
      setError(error.message || 'Failed to fetch pastors');
      toast({
        variant: "destructive",
        title: "Error fetching pastors",
        description: error.message || "Failed to fetch pastors. Please try again later.",
      });
      setPastors([]);
    }
  };

  // No need for client-side filtering anymore as we're doing it at the database level

  const getCategoryBadgeColor = (category: MemberCategory) => {
    switch(category) {
      case 'Sons':
        return "bg-blue-100 text-blue-800";
      case 'Pastors':
        return "bg-purple-100 text-purple-800";
      case 'MINT':
        return "bg-green-100 text-green-800";
      case 'Others':
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAssignedToName = (assignedToId: string | undefined) => {
    if (!assignedToId) return "None";
    const assignedPastor = pastors.find(p => p.id === assignedToId);
    return assignedPastor ? assignedPastor.fullName : "Unknown";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search members..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => navigate("/admin/members")}
        >
          View All
        </Button>
      </div>

      {loading ? (
        <LoadingState message={`Loading ${category.toLowerCase() === 'all' ? 'members' : category.toLowerCase()}...`} />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            fetchMembers();
            fetchPastors();
          }}
        />
      ) : (
        <div className="border rounded-md">
          {members.length === 0 ? (
            <EmptyState
              title={`No ${category.toLowerCase() === 'all' ? 'members' : category.toLowerCase()} found`}
              message={searchTerm ? `No results match your search "${searchTerm}"` : `There are no ${category.toLowerCase() === 'all' ? 'members' : category.toLowerCase()} in the database.`}
              action={{
                label: "View All Members",
                onClick: () => navigate("/admin/members")
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Church Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.fullName}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryBadgeColor(member.category)}>
                        {member.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{getAssignedToName(member.assignedTo)}</TableCell>
                    <TableCell>{member.churchUnit || "Not Assigned"}</TableCell>
                    <TableCell>
                      <Badge className={member.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardMembersTable;
