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
      console.log("Starting sync process...");
      const result = await syncProfilesToMembers();
      console.log("Sync result:", result);

      if (result.success) {
        // Always call onSyncComplete even if no members were added
        // This ensures the UI refreshes to show the latest data
        if (onSyncComplete) {
          console.log("Calling onSyncComplete to refresh data");
          onSyncComplete();
        }

        // Show success toast
        toast({
          title: "Sync completed",
          description: result.message,
        });

        // Force a page refresh after a short delay to ensure everything is updated
        console.log("Scheduling page refresh to ensure new users appear...");
        setTimeout(() => {
          console.log("Refreshing page to show updated data...");
          window.location.reload();
        }, 1500);
      } else {
        console.error("Sync failed:", result);
        toast({
          variant: "destructive",
          title: "Sync failed",
          description: result.message,
        });
      }

      // If there were errors during sync, log them
      if (result.errors && result.errors.length > 0) {
        console.error("Errors during sync:", result.errors);
      }
    } catch (error: any) {
      console.error("Exception during sync:", error);
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
      variant="default"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {isSyncing ? "Syncing Users..." : "Sync New Users"}
    </Button>
  );
}
