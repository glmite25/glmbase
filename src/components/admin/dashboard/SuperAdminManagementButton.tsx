import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Crown, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { 
  addSuperAdminByEmail, 
  listSuperAdmins, 
  removeSuperAdmin, 
  type SuperAdmin 
} from "@/components/admin/users/SuperAdminService";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SuperAdminManagementButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingEmail, setAddingEmail] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSuperAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const { superAdmins: admins, error } = await listSuperAdmins();
      if (error) {
        setError(`Failed to load super admins: ${error.message}`);
        setSuperAdmins([]);
      } else {
        setSuperAdmins(admins);
      }
    } catch (err: any) {
      setError(`Error loading super admins: ${err.message}`);
      setSuperAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuperAdmin = async () => {
    if (!addingEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setAddingLoading(true);
    try {
      const result = await addSuperAdminByEmail(addingEmail.trim());
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setAddingEmail("");
        await loadSuperAdmins(); // Reload the list
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to add super admin: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setAddingLoading(false);
    }
  };

  const handleRemoveSuperAdmin = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove super admin privileges from ${email}?`)) {
      return;
    }

    try {
      const result = await removeSuperAdmin(userId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        await loadSuperAdmins(); // Reload the list
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to remove super admin: ${err.message}`,
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
    loadSuperAdmins();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpenDialog}>
          <Crown className="h-4 w-4 mr-2" />
          Manage Super Admins
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Super Admin Management
          </DialogTitle>
          <DialogDescription>
            Manage users with super administrator privileges. Super admins have full system access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Super Admin Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Add Super Admin</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={addingEmail}
                  onChange={(e) => setAddingEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSuperAdmin()}
                />
              </div>
              <Button 
                onClick={handleAddSuperAdmin} 
                disabled={addingLoading}
                className="flex items-center gap-2"
              >
                {addingLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Super Admin
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Super Admins List */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Current Super Admins</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadSuperAdmins}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : superAdmins.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No super admins found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Added Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superAdmins.map((admin) => (
                    <TableRow key={admin.user_id}>
                      <TableCell className="font-medium">{admin.email}</TableCell>
                      <TableCell>{admin.full_name || 'N/A'}</TableCell>
                      <TableCell>
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSuperAdmin(admin.user_id, admin.email)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Info Section */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Super admins have full access to all system features including user management, 
              database operations, and system settings. Only grant super admin privileges to trusted users.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SuperAdminManagementButton;