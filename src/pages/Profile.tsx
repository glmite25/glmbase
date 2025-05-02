import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, Building, UserPlus, Phone, MapPin, Activity } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";

const Profile = () => {
  const { user, profile, isLoading, isAdmin, isSuperUser } = useAuth();

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
            <CardDescription>Please log in to view your profile</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-church-blue text-white text-xl">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
                  {isAdmin && <Badge className="bg-church-red">Admin</Badge>}
                  {isSuperUser && <Badge className="bg-yellow-500 text-black">Apostle</Badge>}
                </div>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-church-red" />
                    <h3 className="text-lg font-medium">Ministry Information</h3>
                  </div>
                  <div className="space-y-3 pl-2 border-l-2 border-gray-100">
                    {profile?.church_unit && (
                      <div className="flex items-start gap-2">
                        <Building className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Church Unit</p>
                          <p className="text-gray-600">{profile.church_unit}</p>
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
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="h-5 w-5 text-church-blue" />
                    <h3 className="text-lg font-medium">Personal Information</h3>
                  </div>
                  <div className="space-y-3 pl-2 border-l-2 border-gray-100">
                    <div>
                      <p className="font-medium">Email Address</p>
                      <p className="text-gray-600">{user.email}</p>
                    </div>

                    {profile?.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Phone Number</p>
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

                    {profile?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Address</p>
                          <p className="text-gray-600">{profile.address}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-gray-600">
                        {profile?.updated_at
                          ? new Date(profile.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : "N/A"}
                      </p>
                    </div>
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
  );
};

export default Profile;
