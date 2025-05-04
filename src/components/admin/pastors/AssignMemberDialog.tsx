import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";

// Define the form schema with validation
const assignMemberSchema = z.object({
  memberId: z.string().min(1, { message: "Please select a member" }),
});

type AssignMemberFormValues = z.infer<typeof assignMemberSchema>;

interface AssignMemberDialogProps {
  pastorId: string;
  pastorName: string;
  onMemberAssigned: () => void;
}

export function AssignMemberDialog({ pastorId, pastorName, onMemberAssigned }: AssignMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AssignMemberFormValues>({
    resolver: zodResolver(assignMemberSchema),
    defaultValues: {
      memberId: "",
    },
  });

  // Fetch available members (not assigned to any pastor)
  const fetchAvailableMembers = async () => {
    setIsLoading(true);
    try {
      // Get members who are not pastors and not assigned to any pastor
      const { data, error } = await supabase
        .from('members')
        .select('id, fullname, email')
        .not('category', 'eq', 'Pastors')
        .is('assignedto', null);

      if (error) throw error;

      setAvailableMembers(data || []);
    } catch (error: any) {
      console.error("Error fetching available members:", error);
      toast({
        variant: "destructive",
        title: "Error fetching members",
        description: error.message || "An error occurred while fetching available members.",
      });
      setAvailableMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch members when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailableMembers();
    }
  }, [open]);

  const onSubmit = async (values: AssignMemberFormValues) => {
    setIsSubmitting(true);
    try {
      // Update the member to assign them to this pastor
      const { error } = await supabase
        .from('members')
        .update({ assignedTo: pastorId })
        .eq('id', values.memberId);

      if (error) throw error;

      toast({
        title: "Member assigned successfully",
        description: `Member has been assigned to ${pastorName}.`,
      });

      onMemberAssigned();
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error assigning member:", error);
      toast({
        variant: "destructive",
        title: "Error assigning member",
        description: error.message || "An error occurred while assigning the member.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Assign Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Member to Pastor</DialogTitle>
          <DialogDescription>
            Assign a member to {pastorName} for pastoral care.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Member</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : availableMembers.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          No available members found
                        </div>
                      ) : (
                        availableMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.fullName} ({member.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting || isLoading || availableMembers.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Member"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
