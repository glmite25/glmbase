import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import { useEffect, useState } from "react";
import AOS from 'aos';
import 'aos/dist/aos.css';

// Component to conditionally render the header
const AppContent = () => {
  const location = useLocation();

  // Initialize AOS when component mounts
  useEffect(() => {
    AOS.init({
      duration: 1100,
      easing: 'ease-in-out',
      once: true,
      mirror: true,
      offset: 100
    });
  }, []);

  // Check if the current path is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      {/* Only render the Header when not on admin routes */}
      {/* {!isAdminRoute && <Header />} */}
      <main className={`flex-grow ${isAdminRoute ? 'pt-0' : ''}`}>
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
  );
};

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
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;