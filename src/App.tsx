import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Databases from "./pages/Databases";
import GitHub from "./pages/GitHub";
import HostingRender from "./pages/HostingRender";
import InfrastructureConnections from "./pages/InfrastructureConnections";
import AutoMedic from "./pages/AutoMedic";
import Operations from "./pages/Operations";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import Bridge from "./pages/Bridge";
import Onboarding from "./pages/Onboarding";
import Administrator from "./pages/Administrator";
import AttackPath from "./pages/AttackPath";
import ComingSoon from "./pages/ComingSoon";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected Routes (Require Auth + GitHub Link) */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Index />
                </RequireAuth>
              }
            />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />
            <Route
              path="/databases"
              element={
                <RequireAuth>
                  <Databases />
                </RequireAuth>
              }
            />
            <Route
              path="/github"
              element={
                <RequireAuth>
                  <GitHub />
                </RequireAuth>
              }
            />
            <Route
              path="/hosting/:providerId"
              element={
                <RequireAuth>
                  <HostingRender />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/connections"
              element={
                <RequireAuth>
                  <InfrastructureConnections />
                </RequireAuth>
              }
            />
            <Route
              path="/auto-medic"
              element={
                <RequireAuth>
                  <AutoMedic />
                </RequireAuth>
              }
            />
            <Route
              path="/operations"
              element={
                <RequireAuth>
                  <Operations />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <Administrator />
                </RequireAuth>
              }
            />
            <Route
              path="/attack-paths"
              element={
                <RequireAuth>
                  <AttackPath />
                </RequireAuth>
              }
            />
            <Route
              path="/exposure"
              element={
                <RequireAuth>
                  <ComingSoon />
                </RequireAuth>
              }
            />
            <Route
              path="/scenarios"
              element={
                <RequireAuth>
                  <ComingSoon />
                </RequireAuth>
              }
            />
            <Route
              path="/events"
              element={
                <RequireAuth>
                  <ComingSoon />
                </RequireAuth>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireAuth>
                  <ComingSoon />
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
