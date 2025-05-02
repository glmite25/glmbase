import { useState } from "react";
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
import { Loader2, Plus, UserCog } from "lucide-react";

// Define the form schema with validation
const pastorFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  title: z.string().optional(),
  churchUnit: z.string().optional(),
  auxanoGroup: z.string().optional(),
});

type PastorFormValues = z.infer<typeof pastorFormSchema>;

interface AddPastorDialogProps {
  onPastorAdded: () => void;
}

export function AddPastorDialog({ onPastorAdded }: AddPastorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [foundUserName, setFoundUserName] = useState("");
  const { toast } = useToast();

  const form = useForm<PastorFormValues>({
    resolver: zodResolver(pastorFormSchema),
    defaultValues: {
      email: "",
      title: "",
      churchUnit: "",
      auxanoGroup: "",
    },
  });

  const churchUnits = [
    { id: "3hmedia", name: "3H Media" },
    { id: "3hmusic", name: "3H Music" },
    { id: "3hmovies", name: "3H Movies" },
    { id: "3hsecurity", name: "3H Security" },
    { id: "discipleship", name: "Discipleship" },
    { id: "praisefeet", name: "Praise Feet" },
    { id: "tof", name: "TOF" },
    { id: "auxano", name: "Auxano Group" },
  ];

  const auxanoGroups = [
    { id: "group_a", name: "Group A" },
    { id: "group_b", name: "Group B" },
    { id: "group_c", name: "Group C" },
    { id: "group_d", name: "Group D" },
  ];

  // Check if the user exists when email field changes
  const checkUserExists = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    try {
      // First check if the user exists in auth
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', email.toLowerCase())
        .single();

      if (userError) {
        setUserFound(false);
        setFoundUserName("");
        return;
      }

      // Check if the user is already a pastor
      const { data: pastorData, error: pastorError } = await supabase
        .from('members')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('category', 'Pastors')
        .single();

      if (!pastorError && pastorData) {
        toast({
          variant: "destructive",
          title: "User is already a pastor",
          description: "This user is already registered as a pastor in the system.",
        });
        setUserFound(false);
        setFoundUserName("");
        return;
      }

      // User exists and is not already a pastor
      setUserFound(true);
      setFoundUserName(userData.full_name || email);
    } catch (error) {
      console.error("Error checking user:", error);
      setUserFound(false);
      setFoundUserName("");
    }
  };

  const onSubmit = async (values: PastorFormValues) => {
    if (!userFound) {
      toast({
        variant: "destructive",
        title: "User not found",
        description: "Please enter a valid email address for an existing user.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user details from profiles
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', values.email.toLowerCase())
        .single();

      if (userError) throw userError;

      // Create a new member record with category "Pastors"
      const { data, error } = await supabase
        .from('members')
        .insert([
          {
            fullName: userData.full_name,
            email: userData.email,
            category: "Pastors",
            title: values.title || null,
            churchUnit: values.churchUnit || null,
            auxanoGroup: values.auxanoGroup || null,
            joinDate: new Date().toISOString().split('T')[0],
            isActive: true,
          }
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Pastor added successfully",
        description: `${userData.full_name} has been added as a pastor.`,
      });

      onPastorAdded();
      setOpen(false);
      form.reset();
      setUserFound(false);
      setFoundUserName("");
    } catch (error: any) {
      console.error("Error adding pastor:", error);
      toast({
        variant: "destructive",
        title: "Error adding pastor",
        description: error.message || "An error occurred while adding the pastor.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Pastor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Pastor</DialogTitle>
          <DialogDescription>
            Add a pastor from existing registered users by entering their email address.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="pastor@example.com" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        checkUserExists(e.target.value);
                      }}
                    />
                  </FormControl>
                  {userFound && (
                    <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <UserCog className="h-3 w-3" />
                      User found: {foundUserName}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Senior Pastor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="churchUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Church Unit (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select church unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {churchUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auxanoGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auxano Group (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Auxano group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {auxanoGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !userFound}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Pastor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
