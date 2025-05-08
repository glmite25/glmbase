import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { syncUsersToMembers, syncUserByEmail } from "@/utils/syncUsersToMembers";
import { Loader2, RefreshCw, UserPlus, CheckCircle, Server, ServerOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getApiServerStatus } from "@/utils/api-config";

export default function UserMemberSyncPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    added?: number;
    error?: any;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [isSyncingEmail, setIsSyncingEmail] = useState(false);
  const [emailSyncResult, setEmailSyncResult] = useState<{
    success: boolean;
    message: string;
    existing?: boolean;
    updated?: boolean;
    member?: any;
  } | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    available: boolean;
    url: string;
    environment: string;
    message: string;
  }>({
    available: false,
    url: '',
    environment: '',
    message: 'Checking API server status...'
  });
  const [isCheckingApi, setIsCheckingApi] = useState(true);

  // Check API server status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  // Function to check API server status
  const checkApiStatus = async () => {
    setIsCheckingApi(true);
    try {
      const status = await getApiServerStatus();
      setApiStatus(status);
    } catch (error) {
      setApiStatus({
        available: false,
        url: '',
        environment: '',
        message: 'Error checking API server status'
      });
    } finally {
      setIsCheckingApi(false);
    }
  };

  const handleSyncAll = async () => {
    setIsLoading(true);
    setResults(null);

    // Refresh API status before proceeding
    await checkApiStatus();

    try {
      // Check if the API server is available
      if (!apiStatus.available) {
        console.error("API server is not available");
        toast({
          title: "API Server Not Running",
          description: "The API server is required for this operation. Please start the server using 'cd server && npm run dev' in a terminal.",
          variant: "destructive",
        });

        setResults({
          success: false,
          message: "The API server is not running. Please start the server using 'cd server && npm run dev' in a terminal.",
        });

        setIsLoading(false);
        return;
      }

      // If we get here, the server is running
      const result = await syncUsersToMembers();
      setResults(result);

      toast({
        title: result.success ? "Sync Completed" : "Sync Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      setResults({
        success: false,
        message: `Error: ${error.message || "Unknown error"}`,
        error
      });

      toast({
        title: "Sync Failed",
        description: `Error: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncEmail = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to sync",
        variant: "destructive",
      });
      return;
    }

    setIsSyncingEmail(true);
    setEmailSyncResult(null);

    // Refresh API status before proceeding
    await checkApiStatus();

    try {
      // Check if the API server is available
      if (!apiStatus.available) {
        console.error("API server is not available");
        toast({
          title: "API Server Not Running",
          description: "The API server is required for this operation. Please start the server using 'cd server && npm run dev' in a terminal.",
          variant: "destructive",
        });

        setEmailSyncResult({
          success: false,
          message: "The API server is not running. Please start the server using 'cd server && npm run dev' in a terminal.",
        });

        setIsSyncingEmail(false);
        return;
      }

      // If we get here, the server is running
      const result = await syncUserByEmail(email);
      setEmailSyncResult(result);

      toast({
        title: result.success ? "User Sync Completed" : "User Sync Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error: any) {
      setEmailSyncResult({
        success: false,
        message: `Error: ${error.message || "Unknown error"}`,
      });

      toast({
        title: "User Sync Failed",
        description: `Error: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSyncingEmail(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">User-Member Synchronization</h1>

      {/* API Server Status Indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {isCheckingApi ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : apiStatus.available ? (
            <Server className="h-5 w-5 text-green-500" />
          ) : (
            <ServerOff className="h-5 w-5 text-red-500" />
          )}
          <span className="font-medium">API Server Status:</span>
          <Badge variant={apiStatus.available ? "success" : "destructive"}>
            {apiStatus.available ? "Online" : "Offline"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={checkApiStatus}
            disabled={isCheckingApi}
            className="ml-2"
          >
            {isCheckingApi ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          {apiStatus.available
            ? `Connected to API server at ${apiStatus.url}`
            : "The API server is required for user synchronization. Please start the server using 'cd server && npm run dev' in a terminal."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync All Users to Members
            </CardTitle>
            <CardDescription>
              This will ensure all registered users appear in your members list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Running this process will check all registered users and add any missing ones to your members list.
              It will not affect existing members.
            </p>

            {results && (
              <Alert className={results.success ? "bg-green-50" : "bg-red-50"}>
                <AlertTitle>{results.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  {results.message}
                  {results.added !== undefined && results.added > 0 && (
                    <p className="font-medium mt-2">
                      Added {results.added} new members from registered users
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSyncAll}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All Users
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Sync Specific User
            </CardTitle>
            <CardDescription>
              Add a specific registered user to your members list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {emailSyncResult && (
                <Alert className={emailSyncResult.success ? "bg-green-50" : "bg-red-50"}>
                  <AlertTitle>
                    {emailSyncResult.success ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Success
                      </div>
                    ) : (
                      "Error"
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {emailSyncResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSyncEmail}
              disabled={isSyncingEmail || !email}
              className="w-full"
            >
              {isSyncingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sync User
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
