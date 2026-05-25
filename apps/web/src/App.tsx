import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./features/auth/Landing";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "./features/auth/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ServXProvider } from "@servx/react";

// ---------------------------------------------------------------------------
// Lazy-loaded pages/features — each becomes its own JS chunk loaded on demand
// ---------------------------------------------------------------------------
const Index            = lazy(() => import("./pages/Index"));
const Databases        = lazy(() => import("./features/databases"));
const GitHub           = lazy(() => import("./features/github"));
const HostingRender    = lazy(() => import("./features/hosting"));
const InfraSettings    = lazy(() => import("./pages/InfraSettings"));
const ProfileSettings  = lazy(() => import("./pages/ProfileSettings"));
const AutoMedic        = lazy(() => import("./pages/AutoMedic"));
const Operations       = lazy(() => import("./features/operations"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const AuthPage         = lazy(() => import("./features/auth"));
const Bridge           = lazy(() => import("./features/auth/Bridge"));
const Onboarding       = lazy(() => import("./features/auth/Onboarding"));
const Administrator    = lazy(() => import("./features/admin"));
const AuthCallback     = lazy(() => import("./features/auth/AuthCallback"));
const AttackPath       = lazy(() => import("./pages/AttackPath"));
const ComingSoon       = lazy(() => import("./pages/ComingSoon"));
const ExposureAnalysis = lazy(() => import("./pages/ExposureAnalysis"));
const Emails           = lazy(() => import("./features/emails"));
const Privacy          = lazy(() => import("./pages/Privacy"));
const Terms            = lazy(() => import("./pages/Terms"));
const SdkTest          = lazy(() => import("./pages/SdkTest"));

// ---------------------------------------------------------------------------
// QueryClient — cached for 60 s, no refetch-on-focus, max 1 retry on failure
// ---------------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // stay fresh 60 s → no redundant refetches on nav
      gcTime: 5 * 60_000,          // keep unused cache for 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Premium glassmorphic loading fallback shown while a lazy chunk downloads
const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-zinc-950/20 backdrop-blur-md">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
      <span className="text-xs font-semibold text-slate-400 tracking-wider">
        Securing session...
      </span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ServXProvider projectKey="svx_test_pin_123" baseUrl="http://localhost:5000" pollingIntervalMs={3000}>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/"                element={<Landing />} />
                <Route path="/auth"            element={<AuthPage />} />
                <Route path="/privacy"         element={<Privacy />} />
                <Route path="/terms"           element={<Terms />} />
                <Route path="/auth/v1/callback" element={<AuthCallback />} />
                <Route path="/sdk-test"        element={<SdkTest />} />

                {/* Protected routes — share the persistent Sidebar via DashboardLayout */}
                <Route
                  element={
                    <RequireAuth>
                      <DashboardLayout />
                    </RequireAuth>
                  }
                >
                  <Route path="/dashboard"            element={<Index />} />
                  <Route path="/databases"            element={<Databases />} />
                  <Route path="/github"               element={<GitHub />} />
                  <Route path="/hosting/:providerId"  element={<HostingRender />} />
                  <Route path="/auto-medic"           element={<AutoMedic />} />
                  <Route path="/operations"           element={<Operations />} />
                  <Route path="/admin"                element={<Administrator />} />
                  <Route path="/attack"               element={<AttackPath />} />
                  <Route path="/attack-paths"         element={<Navigate to="/attack" replace />} />
                  <Route path="/exposure"             element={<ExposureAnalysis />} />
                  <Route path="/scenarios"            element={<ComingSoon />} />
                  <Route path="/emails"               element={<Emails />} />
                  <Route path="/reports"              element={<ComingSoon />} />
                  <Route path="/settings/profile"     element={<ProfileSettings />} />
                </Route>

                {/* Protected routes without sidebar */}
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
                {/* Requires Auth but allows no GitHub link */}
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
            </Suspense>
          </AuthProvider>
        </ServXProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
