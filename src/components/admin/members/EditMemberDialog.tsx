
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memberSchema, MemberFormValues } from "@/types/member";
import { useToast } from "@/hooks/use-toast";
import { Member } from "@/types/member";
import { MemberFormFields } from "./MemberFormFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onEditMember: (member: MemberFormValues) => void;
  pastors: { id: string; fullName: string }[];
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
  onEditMember,
  pastors
}: EditMemberDialogProps) {
  const { toast } = useToast();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      category: "Sons",
      assignedTo: "",
      churchUnits: [],
      notes: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (member && open) {
      form.reset({
        fullName: member.fullName,
        email: member.email,
        phone: member.phone || "",
        address: member.address || "",
        category: member.category,
        assignedTo: member.assignedTo || "",
        churchUnits: member.churchUnits || [],
        notes: member.notes || "",
        isActive: member.isActive,
      });
    }
  }, [member, open, form]);

  const handleEditMember = async (values: MemberFormValues) => {
    try {
      onEditMember(values);

      toast({
        title: "Member updated successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating member",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEditMember)} className="space-y-3">
            <MemberFormFields control={form.control} pastors={pastors} />
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
