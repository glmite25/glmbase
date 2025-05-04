import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { syncProfilesToMembers } from "@/utils/syncProfilesToMembers";

interface SyncProfilesButtonProps {
  onSyncComplete?: () => void;
}

export function SyncProfilesButton({ onSyncComplete }: SyncProfilesButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncProfilesToMembers();
      
      if (result.success) {
        toast({
          title: "Sync completed",
          description: result.message,
        });
        
        if (result.added > 0 && onSyncComplete) {
          onSyncComplete();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Sync failed",
          description: result.message,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync error",
        description: error.message || "An error occurred during sync",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {isSyncing ? "Syncing..." : "Sync New Users"}
    </Button>
  );
}
