import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Users,
    Database,
    Sync,
    Shield
} from "lucide-react";

interface SyncStatus {
    total_profiles: number;
    total_members: number;
    synced_members: number;
    active_members: number;
    issues: {
        profiles_missing: number;
        members_missing: number;
        userid_missing: number;
        userid_mismatch: number;
        total_issues: number;
    };
    is_fully_synced: boolean;
}

interface SyncResult {
    success: boolean;
    synced_count: number;
    error_count: number;
    total_profiles: number;
    total_members: number;
    synced_members: number;
}

export const ProfileSyncManager = () => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const { toast } = useToast();

    const checkSyncStatus = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('check_profile_sync_status');

            if (error) throw error;

            setSyncStatus(data);
        } catch (error: any) {
            console.error("Error checking sync status:", error);
            toast({
                variant: "destructive",
                title: "Error checking sync status",
                description: error.message || "Failed to check profile sync status"
            });
        } finally {
            setLoading(false);
        }
    };

    const syncAllProfiles = async () => {
        setSyncing(true);
        try {
            const { data, error } = await supabase.rpc('sync_all_profiles');

            if (error) throw error;

            const result = data as SyncResult;

            toast({
                title: "Profile sync completed",
                description: `Synced ${result.synced_count} profiles. ${result.error_count} errors.`,
            });

            // Refresh status after sync
            await checkSyncStatus();
        } catch (error: any) {
            console.error("Error syncing profiles:", error);
            toast({
                variant: "destructive",
                title: "Error syncing profiles",
                description: error.message || "Failed to sync profiles"
            });
        } finally {
            setSyncing(false);
        }
    };

    const syncSpecificUser = async (email: string) => {
        if (!email.trim()) {
            toast({
                variant: "destructive",
                title: "Invalid email",
                description: "Please enter a valid email address"
            });
            return;
        }

        try {
            const { data, error } = await supabase.rpc('sync_user_profile', {
                user_email: email.toLowerCase().trim()
            });

            if (error) throw error;

            if (data.success) {
                toast({
                    title: "User profile synced",
                    description: `${email}: ${data.action}`,
                });

                // Refresh status after sync
                await checkSyncStatus();
            } else {
                toast({
                    variant: "destructive",
                    title: "Sync failed",
                    description: data.message || "Failed to sync user profile"
                });
            }
        } catch (error: any) {
            console.error("Error syncing user profile:", error);
            toast({
                variant: "destructive",
                title: "Error syncing user profile",
                description: error.message || "Failed to sync user profile"
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sync className="w-5 h-5" />
                        Profile Synchronization Manager
                    </CardTitle>
                    <CardDescription>
                        Monitor and manage synchronization between user profiles and member records
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            onClick={checkSyncStatus}
                            disabled={loading}
                            variant="outline"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Check Status
                        </Button>
                        <Button
                            onClick={syncAllProfiles}
                            disabled={syncing || loading}
                        >
                            <Sync className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync All Profiles'}
                        </Button>
                    </div>

                    {syncStatus && (
                        <div className="space-y-4">
                            <Separator />

                            {/* Status Overview */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {syncStatus.total_profiles}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Total Profiles
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {syncStatus.total_members}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Total Members
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {syncStatus.synced_members}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Synced Members
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {syncStatus.active_members}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Active Members
                                    </div>
                                </div>
                            </div>

                            {/* Sync Status */}
                            <div className="flex items-center gap-2">
                                {syncStatus.is_fully_synced ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                            Fully Synced
                                        </Badge>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                            {syncStatus.issues.total_issues} Issues Found
                                        </Badge>
                                    </>
                                )}
                            </div>

                            {/* Issues Breakdown */}
                            {!syncStatus.is_fully_synced && (
                                <div className="space-y-2">
                                    <h4 className="font-medium">Sync Issues:</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {syncStatus.issues.profiles_missing > 0 && (
                                            <div className="flex justify-between">
                                                <span>Missing Profiles:</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {syncStatus.issues.profiles_missing}
                                                </Badge>
                                            </div>
                                        )}
                                        {syncStatus.issues.members_missing > 0 && (
                                            <div className="flex justify-between">
                                                <span>Missing Members:</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {syncStatus.issues.members_missing}
                                                </Badge>
                                            </div>
                                        )}
                                        {syncStatus.issues.userid_missing > 0 && (
                                            <div className="flex justify-between">
                                                <span>Missing User ID Links:</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {syncStatus.issues.userid_missing}
                                                </Badge>
                                            </div>
                                        )}
                                        {syncStatus.issues.userid_mismatch > 0 && (
                                            <div className="flex justify-between">
                                                <span>User ID Mismatches:</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    {syncStatus.issues.userid_mismatch}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Fix for Specific User */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Fix Specific User Profile
                    </CardTitle>
                    <CardDescription>
                        Sync a specific user's profile if they're experiencing issues
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="user@example.com"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    syncSpecificUser((e.target as HTMLInputElement).value);
                                }
                            }}
                            id="user-email-input"
                        />
                        <Button
                            onClick={() => {
                                const input = document.getElementById('user-email-input') as HTMLInputElement;
                                syncSpecificUser(input.value);
                            }}
                        >
                            Sync User
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Enter the email address of the user experiencing profile issues
                    </p>
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        How Profile Sync Works
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>Check Status:</strong> Reviews sync between profiles and members tables</p>
                    <p>• <strong>Sync All:</strong> Automatically fixes all sync issues across all users</p>
                    <p>• <strong>Sync User:</strong> Fixes sync issues for a specific user by email</p>
                    <p>• <strong>Auto-creates:</strong> Missing records in either table are created automatically</p>
                    <p>• <strong>Links accounts:</strong> Ensures proper userid connections between tables</p>
                </CardContent>
            </Card>
        </div>
    );
};