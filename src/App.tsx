
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Index from "./pages/Index";
import About from "./pages/About";
import Events from "./pages/Events";
import Sermons from "./pages/Sermons";
import Contact from "./pages/Contact";
import Partnership from "./pages/Partnership";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/Dashboard";
import { useState } from "react";

const App = () => {
  // Create a new QueryClient instance inside the component
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/sermons" element={<Sermons />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/partnership" element={<Partnership />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/members" element={<AdminDashboard />} />
                  <Route path="/admin/pastors" element={<AdminDashboard />} />
                  <Route path="/admin/pastors/:pastorId" element={<AdminDashboard />} />
                  <Route path="/admin/events" element={<AdminDashboard />} />
                  <Route path="/admin/sermons" element={<AdminDashboard />} />
                  <Route path="/admin/settings" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminDashboard />} />
                  <Route path="/admin/system" element={<AdminDashboard />} />
                  {/* Church Units Routes */}
                  <Route path="/admin/units/3hmedia" element={<AdminDashboard />} />
                  <Route path="/admin/units/3hmusic" element={<AdminDashboard />} />
                  <Route path="/admin/units/3hmovies" element={<AdminDashboard />} />
                  <Route path="/admin/units/3hsecurity" element={<AdminDashboard />} />
                  <Route path="/admin/units/discipleship" element={<AdminDashboard />} />
                  <Route path="/admin/units/praisefeet" element={<AdminDashboard />} />
                  <Route path="/admin/units/tof" element={<AdminDashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
