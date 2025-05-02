
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Member, MemberFormValues } from "@/types/member";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddMemberDialog } from "./members/AddMemberDialog";
import { EditMemberDialog } from "./members/EditMemberDialog";
import { DeleteMemberDialog } from "./members/DeleteMemberDialog";
import { MembersTable } from "./members/MembersTable";

export default function MembersView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pastors, setPastors] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
    fetchPastors();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Fetch real data from Supabase
      const { data, error } = await supabase
        .from('members')
        .select('*');

      if (error) throw error;

      if (data) {
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
        // If no data, set empty array
        console.log('No members found in database');
        setMembers([]);
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        variant: "destructive",
        title: "Error fetching members",
        description: error.message,
      });

      // Set empty array in case of error
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastors = async () => {
    try {
      console.log('MembersView: Fetching pastors from Supabase...');

      // Test Supabase connection first
      const { data: testData, error: testError } = await supabase
        .from('members')
        .select('count()')
        .limit(1);

      if (testError) {
        console.error('MembersView: Supabase connection test failed:', testError);
        throw new Error(`Supabase connection error: ${testError.message}`);
      }

      console.log('MembersView: Supabase connection test successful');

      // Fetch pastors from Supabase
      const { data, error } = await supabase
        .from('members')
        .select('id, fullName, churchUnit, auxanoGroup')
        .eq('category', 'Pastors');

      if (error) {
        console.error('MembersView: Error fetching pastors data:', error);
        throw error;
      }

      console.log('MembersView: Pastors data received:', data);

      if (data && data.length > 0) {
        setPastors(data);
      } else {
        // If no pastors found, set empty array
        console.log('MembersView: No pastors found in database');
        setPastors([]);
      }
    } catch (error: any) {
      console.error('MembersView: Error fetching pastors:', error);
      toast({
        variant: "destructive",
        title: "Error fetching pastors",
        description: error.message || "Failed to fetch pastors. Please try again later.",
      });

      // Set empty array in case of error
      setPastors([]);
    }
  };

  const handleAddMember = async (newMember: Member) => {
    try {
      // Insert the new member into the database
      const { data, error } = await supabase
        .from('members')
        .insert([
          {
            fullName: newMember.fullName,
            email: newMember.email,
            phone: newMember.phone || null,
            address: newMember.address || null,
            category: newMember.category,
            assignedTo: newMember.assignedTo || null,
            // Handle both camelCase and lowercase column names
            churchunits: newMember.churchUnits || [],
            churchUnits: newMember.churchUnits || [],
            churchunit: newMember.churchUnits && newMember.churchUnits.length > 0 ? newMember.churchUnits[0] : null,
            churchUnit: newMember.churchUnits && newMember.churchUnits.length > 0 ? newMember.churchUnits[0] : null,
            auxanoGroup: newMember.auxanoGroup || null,
            notes: newMember.notes || null,
            isActive: newMember.isActive,
            joinDate: newMember.joinDate || new Date().toISOString().split('T')[0],
          }
        ])
        .select();

      if (error) throw error;

      // If successful, update the local state with the new member from the database
      if (data && data.length > 0) {
        const addedMember = data[0];
        setMembers([...members, {
          ...newMember,
          id: addedMember.id // Use the ID generated by the database
        }]);

        toast({
          title: "Member added successfully",
        });
      }
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        variant: "destructive",
        title: "Error adding member",
        description: error.message,
      });
    }
  };

  const handleEditMember = async (values: MemberFormValues) => {
    if (!selectedMember) return;

    try {
      // Update the member in the database
      const { error } = await supabase
        .from('members')
        .update({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone || null,
          address: values.address || null,
          category: values.category,
          assignedTo: values.assignedTo || null,
          // Handle both camelCase and lowercase column names
          churchunits: values.churchUnits || [],
          churchUnits: values.churchUnits || [],
          churchunit: values.churchUnits && values.churchUnits.length > 0 ? values.churchUnits[0] : null,
          churchUnit: values.churchUnits && values.churchUnits.length > 0 ? values.churchUnits[0] : null,
          auxanoGroup: values.auxanoGroup || null,
          notes: values.notes || null,
          isActive: values.isActive,
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      // Update the local state
      const updatedMembers = members.map(member =>
        member.id === selectedMember.id
          ? { ...member, ...values }
          : member
      );

      setMembers(updatedMembers);
      toast({
        title: "Member updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast({
        variant: "destructive",
        title: "Error updating member",
        description: error.message,
      });
    } finally {
      setOpenEditDialog(false);
      setSelectedMember(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      // Delete the member from the database
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;

      // Update the local state
      const filteredMembers = members.filter(
        member => member.id !== selectedMember.id
      );

      setMembers(filteredMembers);
      toast({
        title: "Member deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast({
        variant: "destructive",
        title: "Error deleting member",
        description: error.message,
      });
    } finally {
      setOpenDeleteDialog(false);
      setSelectedMember(null);
    }
  };

  const getAssignedPastorName = (memberId: string) => {
    const pastor = pastors.find(p => p.id === memberId);
    return pastor ? pastor.fullName : "Not Assigned";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>All Members</CardTitle>
            <CardDescription>Manage church members and their relationships</CardDescription>
          </div>
          <AddMemberDialog onAddMember={handleAddMember} pastors={pastors} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading members...</p>
          </div>
        ) : (
          <MembersTable
            members={members}
            onEdit={(member) => {
              setSelectedMember(member);
              setOpenEditDialog(true);
            }}
            onDelete={(member) => {
              setSelectedMember(member);
              setOpenDeleteDialog(true);
            }}
            getAssignedPastorName={getAssignedPastorName}
          />
        )}

        {/* Edit Member Dialog */}
        <EditMemberDialog
          open={openEditDialog}
          onOpenChange={setOpenEditDialog}
          member={selectedMember}
          onEditMember={handleEditMember}
          pastors={pastors}
        />

        {/* Delete Member Dialog */}
        <DeleteMemberDialog
          open={openDeleteDialog}
          onOpenChange={setOpenDeleteDialog}
          member={selectedMember}
          onDeleteMember={handleDeleteMember}
        />
      </CardContent>
    </Card>
  );
}
