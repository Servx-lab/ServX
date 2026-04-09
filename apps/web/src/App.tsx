import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./features/auth/Landing";
import Index from "./pages/Index";
import Databases from "./features/databases";
import GitHub from "./features/github";
import HostingRender from "./features/hosting";
import InfraSettings from "./pages/InfraSettings";
import ProfileSettings from "./pages/ProfileSettings";
import AutoMedic from "./pages/AutoMedic";
import Operations from "./features/operations";
import NotFound from "./pages/NotFound";
import AuthPage from "./features/auth";
import Bridge from "./features/auth/Bridge";
import Onboarding from "./features/auth/Onboarding";
import Administrator from "./features/admin";
import AttackPath from "./pages/AttackPath";
import ComingSoon from "./pages/ComingSoon";
import Emails from "./features/emails";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "./features/auth/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Protected routes with persistent Sidebar (no blink on navigation) */}
            <Route
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Index />} />
              <Route path="/databases" element={<Databases />} />
              <Route path="/github" element={<GitHub />} />
              <Route path="/hosting/:providerId" element={<HostingRender />} />
              <Route path="/auto-medic" element={<AutoMedic />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/admin" element={<Administrator />} />
              <Route path="/attack-paths" element={<AttackPath />} />
              <Route path="/exposure" element={<ComingSoon />} />
              <Route path="/scenarios" element={<ComingSoon />} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/reports" element={<ComingSoon />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
            </Route>

            {/* Protected routes without sidebar layout */}
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/connections"
              element={
                <RequireAuth>
                  <InfraSettings />
                </RequireAuth>
              }
            />
            {/* Special Protected Route (Requires Auth, but allows No GitHub Link) */}
            <Route
              path="/bridge"
              element={
                <RequireAuth requireGitHub={false}>
                  <Bridge />
                </RequireAuth>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
