import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, Building, UserPlus, Phone, MapPin, Activity, CalendarDays } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { useEffect, useState } from "react";

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Set page title
    document.title = "My Profile | GLM Church";
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-[250px] mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">
            You need to be signed in to view your profile.
          </p>
          <a
            href="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="edit">Edit Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl">
                      {profile?.full_name
                        ? profile.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)
                        : user.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">
                      {profile?.full_name || "User"}
                    </CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                    <div className="grid gap-4">
                      {profile?.church_unit && (
                        <div className="flex items-start gap-2">
                          <Building className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Church Unit</p>
                            <p className="text-gray-600">
                              {profile.church_unit
                                .replace(/3h/i, "3H ")
                                .replace(/([a-z])([A-Z])/g, "$1 $2")}
                            </p>
                          </div>
                        </div>
                      )}

                      {profile?.assigned_pastor && (
                        <div className="flex items-start gap-2">
                          <UserCog className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Assigned Pastor</p>
                            <p className="text-gray-600">{profile.assigned_pastor}</p>
                          </div>
                        </div>
                      )}

                      {profile?.phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Phone</p>
                            <p className="text-gray-600">{profile.phone}</p>
                          </div>
                        </div>
                      )}

                      {profile?.genotype && (
                        <div className="flex items-start gap-2">
                          <Activity className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Genotype</p>
                            <p className="text-gray-600">{profile.genotype}</p>
                          </div>
                        </div>
                      )}

                      {profile?.date_of_birth && (
                        <div className="flex items-start gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Date of Birth</p>
                            <p className="text-gray-600">
                              {new Date(profile.date_of_birth).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {profile?.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Address</p>
                            <p className="text-gray-600">{profile.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit">
            <ProfileEditForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
