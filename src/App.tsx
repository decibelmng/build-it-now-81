import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const PersonaSelection = lazy(() => import("./pages/PersonaSelection"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const ContractorServiceLog = lazy(() => import("./pages/ContractorServiceLog"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient();

const App = () => {
  React.useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.toString?.().includes("MetaMask")) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" /></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/persona"
              element={
                <ProtectedRoute>
                  <PersonaSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="/service-log/:token" element={<ContractorServiceLog />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
