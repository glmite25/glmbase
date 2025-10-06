import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Play, Download, Eye, Calendar, User, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Sermon {
  id: string;
  title: string;
  description: string;
  pastor_id: string;
  date: string;
  duration: number;
  video_url: string;
  audio_url: string;
  thumbnail_url: string;
  scripture_reference: string;
  series_name: string;
  tags: string[];
  view_count: number;
  download_count: number;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  pastor_name?: string;
}

const SermonsManager = () => {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [pastors, setPastors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pastor_id: "",
    date: "",
    duration: "",
    video_url: "",
    audio_url: "",
    thumbnail_url: "",
    scripture_reference: "",
    series_name: "",
    tags: "",
    is_featured: false,
    status: "draft" as const,
  });

  useEffect(() => {
    fetchSermons();
    fetchPastors();
  }, []);

  const fetchSermons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sermons')
        .select(`
          *,
          members!pastor_id (
            fullname
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const sermonsWithPastorNames = data?.map(sermon => ({
        ...sermon,
        pastor_name: sermon.members?.fullname || 'Unknown Pastor'
      })) || [];

      setSermons(sermonsWithPastorNames);
    } catch (error) {
      console.error('Error fetching sermons:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch sermons",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPastors = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, fullname')
        .eq('category', 'Pastors')
        .eq('status', 'active');

      if (error) throw error;

      setPastors(data?.map(pastor => ({
        id: pastor.id,
        name: pastor.fullname
      })) || []);
    } catch (error) {
      console.error('Error fetching pastors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const sermonData = {
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      };

      if (editingSermon) {
        const { error } = await supabase
          .from('sermons')
          .update(sermonData)
          .eq('id', editingSermon.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Sermon updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('sermons')
          .insert([sermonData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Sermon created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSermons();
    } catch (error) {
      console.error('Error saving sermon:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save sermon",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sermons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sermon deleted successfully",
      });

      fetchSermons();
    } catch (error) {
      console.error('Error deleting sermon:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete sermon",
      });
    }
  };

  const handleEdit = (sermon: Sermon) => {
    setEditingSermon(sermon);
    setFormData({
      title: sermon.title,
      description: sermon.description || "",
      pastor_id: sermon.pastor_id || "",
      date: sermon.date,
      duration: sermon.duration?.toString() || "",
      video_url: sermon.video_url || "",
      audio_url: sermon.audio_url || "",
      thumbnail_url: sermon.thumbnail_url || "",
      scripture_reference: sermon.scripture_reference || "",
      series_name: sermon.series_name || "",
      tags: sermon.tags?.join(', ') || "",
      is_featured: sermon.is_featured,
      status: sermon.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      pastor_id: "",
      date: "",
      duration: "",
      video_url: "",
      audio_url: "",
      thumbnail_url: "",
      scripture_reference: "",
      series_name: "",
      tags: "",
      is_featured: false,
      status: "draft",
    });
    setEditingSermon(null);
  };

  const filteredSermons = sermons.filter(sermon => {
    const matchesSearch = sermon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sermon.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sermon.pastor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sermon.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading sermons...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sermons Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sermon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSermon ? "Edit Sermon" : "Add New Sermon"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pastor_id">Pastor</Label>
                  <Select
                    value={formData.pastor_id}
                    onValueChange={(value) => setFormData({ ...formData, pastor_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pastor" />
                    </SelectTrigger>
                    <SelectContent>
                      {pastors.map((pastor) => (
                        <SelectItem key={pastor.id} value={pastor.id}>
                          {pastor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'published' | 'archived') => 
                      setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scripture_reference">Scripture Reference</Label>
                  <Input
                    id="scripture_reference"
                    value={formData.scripture_reference}
                    onChange={(e) => setFormData({ ...formData, scripture_reference: e.target.value })}
                    placeholder="e.g., John 3:16"
                  />
                </div>
                <div>
                  <Label htmlFor="series_name">Series Name</Label>
                  <Input
                    id="series_name"
                    value={formData.series_name}
                    onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="faith, hope, love"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="video_url">Video URL</Label>
                  <Input
                    id="video_url"
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="audio_url">Audio URL</Label>
                  <Input
                    id="audio_url"
                    type="url"
                    value={formData.audio_url}
                    onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                  <Input
                    id="thumbnail_url"
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                <Label htmlFor="is_featured">Featured Sermon</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSermon ? "Update" : "Create"} Sermon
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <Input
          placeholder="Search sermons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sermons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSermons.map((sermon) => (
          <Card key={sermon.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{sermon.title}</CardTitle>
                <Badge className={getStatusColor(sermon.status)}>
                  {sermon.status}
                </Badge>
              </div>
              {sermon.is_featured && (
                <Badge variant="secondary" className="w-fit">Featured</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  {sermon.pastor_name}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(sermon.date).toLocaleDateString()}
                </div>
                {sermon.duration && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {sermon.duration} minutes
                  </div>
                )}
              </div>

              {sermon.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {sermon.description}
                </p>
              )}

              {sermon.scripture_reference && (
                <p className="text-sm font-medium text-blue-600">
                  {sermon.scripture_reference}
                </p>
              )}

              {sermon.tags && sermon.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sermon.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {sermon.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{sermon.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {sermon.view_count}
                  </span>
                  <span className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    {sermon.download_count}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex space-x-2">
                  {sermon.video_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={sermon.video_url} target="_blank" rel="noopener noreferrer">
                        <Play className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {sermon.audio_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={sermon.audio_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(sermon)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Sermon</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{sermon.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(sermon.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSermons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No sermons found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default SermonsManager;