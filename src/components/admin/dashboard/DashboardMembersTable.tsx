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

interface DashboardMembersTableProps {
  category: MemberCategory | 'All';
}

const DashboardMembersTable = ({ category }: DashboardMembersTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastors, setPastors] = useState<{ id: string; fullName: string }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    fetchMembers();
    fetchPastors();
  }, [category]);
  
  const fetchMembers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('members').select('*');
      
      // Filter by category if not 'All'
      if (category !== 'All') {
        query = query.eq('category', category);
      }
      
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
          churchUnit: member.churchUnit || undefined,
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
      const { data, error } = await supabase
        .from('members')
        .select('id, fullName')
        .eq('category', 'Pastors');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setPastors(data);
      } else {
        setPastors([]);
      }
    } catch (error: any) {
      console.error('Error fetching pastors:', error);
      setPastors([]);
    }
  };
  
  useEffect(() => {
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = members.filter(
        member => 
          member.fullName.toLowerCase().includes(term) || 
          member.email.toLowerCase().includes(term) ||
          (member.phone && member.phone.includes(term))
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [members, searchTerm]);
  
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
      
      <div className="border rounded-md">
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading members...
                </TableCell>
              </TableRow>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DashboardMembersTable;
