import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { useEffect, useState, lazy, Suspense } from "react";
import AOS from 'aos';
import 'aos/dist/aos.css';
import { createQueryClient } from "@/lib/react-query-config";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Events = lazy(() => import("./pages/Events"));
const Sermons = lazy(() => import("./pages/Sermons"));
const Contact = lazy(() => import("./pages/Contact"));
const Partnership = lazy(() => import("./pages/Partnership"));
const Terms = lazy(() => import("./pages/Terms"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/sermons" element={<Sermons />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/partnership" element={<Partnership />} />
            <Route path="/terms" element={<Terms />} />
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
        </Suspense>
      </main>
    </div>
  );
};

const App = () => {
  // Create a new QueryClient instance with our optimized configuration
  const [queryClient] = useState(() => createQueryClient());

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
      {/* Add React Query Devtools - only visible in development */}
      {import.meta.env.DEV &&
        (() => {
          // Dynamically import ReactQueryDevtools only in development
          const ReactQueryDevtools = lazy(() => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })));
          return (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          );
        })()
      }
    </QueryClientProvider>
  );
};

export default App;