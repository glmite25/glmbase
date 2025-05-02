import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Database } from "lucide-react";
import { testSupabaseConnection, testMembersTable } from "@/utils/supabaseTest";

const SupabaseConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
  }>({ tested: false });
  
  const [membersTableStatus, setMembersTableStatus] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
  }>({ tested: false });
  
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    
    // Test Supabase connection
    const connectionResult = await testSupabaseConnection();
    setConnectionStatus({
      tested: true,
      success: connectionResult.success,
      message: connectionResult.message
    });
    
    // Test members table
    const membersTableResult = await testMembersTable();
    setMembersTableStatus({
      tested: true,
      success: membersTableResult.success,
      message: membersTableResult.message
    });
    
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          If you're experiencing issues with data loading, run this test to check the database connection.
        </p>
        
        {connectionStatus.tested && (
          <Alert variant={connectionStatus.success ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {connectionStatus.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5" />
              )}
              <div>
                <AlertTitle>Supabase Connection</AlertTitle>
                <AlertDescription>{connectionStatus.message}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        
        {membersTableStatus.tested && (
          <Alert variant={membersTableStatus.success ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {membersTableStatus.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5" />
              )}
              <div>
                <AlertTitle>Members Table</AlertTitle>
                <AlertDescription>{membersTableStatus.message}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        
        <Button 
          onClick={runTests} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Running Tests..." : "Test Database Connection"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SupabaseConnectionTest;
