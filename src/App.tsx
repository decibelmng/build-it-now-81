import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import RootRedirect from "./pages/RootRedirect";
import LegacyRedirect from "./pages/LegacyRedirect";

const Auth = lazy(() => import("./pages/Auth"));
const PersonaSelection = lazy(() => import("./pages/PersonaSelection"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const ContractorServiceLog = lazy(() => import("./pages/ContractorServiceLog"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const NoAccess = lazy(() => import("./pages/NoAccess"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Account = lazy(() => import("./pages/Account"));
const PropertyLayout = lazy(() => import("./pages/PropertyLayout"));

// Property-scoped section components
const DashboardOverview = lazy(() => import("@/components/dashboard/DashboardOverview"));
const PropertyCards = lazy(() => import("@/components/dashboard/PropertyCards"));
const HomeInventoryPage = lazy(() => import("@/components/dashboard/HomeInventoryPage"));
const HomeSystemsSettings = lazy(() => import("@/components/dashboard/HomeSystemsSettings"));
const MaintenanceLog = lazy(() => import("@/components/dashboard/MaintenanceLog"));
const PropertyTimeline = lazy(() => import("@/components/dashboard/PropertyTimeline"));
const ContractorLinks = lazy(() => import("@/components/dashboard/ContractorLinks"));
const DocumentsHub = lazy(() => import("@/components/dashboard/documents/DocumentsHub"));
const SavingsTracking = lazy(() => import("@/components/dashboard/SavingsTracking"));
const TaxInvestmentPage = lazy(() => import("@/components/dashboard/TaxInvestmentPage"));
const HomeContacts = lazy(() => import("@/components/dashboard/HomeContacts"));
const PropertyUtilities = lazy(() => import("@/components/dashboard/PropertyUtilities"));
const RecurringTemplates = lazy(() => import("@/components/dashboard/RecurringTemplates"));
const PropertySharing = lazy(() => import("@/components/dashboard/PropertySharing"));
const ExportReports = lazy(() => import("@/components/dashboard/ExportReports"));
const AnalyticsInsights = lazy(() => import("@/components/dashboard/AnalyticsInsights"));
const ContractorSubmissions = lazy(() => import("@/components/dashboard/ContractorSubmissions"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 60_000, retry: 1 } },
});

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
  </div>
);

const App = () => {
  React.useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.toString?.().includes("MetaMask")) event.preventDefault();
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
              <Suspense fallback={<Spinner />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/service-log/:token" element={<ContractorServiceLog />} />

                  {/* Root shortcut for signed-in users */}
                  <Route path="/home" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />

                  {/* Onboarding / admin (unchanged behavior) */}
                  <Route path="/persona" element={<ProtectedRoute><PersonaSelection /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

                  {/* Portfolio (cross-property, read-only) */}
                  <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />

                  {/* Account-level */}
                  <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                  {/* Explicit lost-access screen */}
                  <Route path="/no-access/:slug" element={<ProtectedRoute><NoAccess /></ProtectedRoute>} />

                  {/* Property-scoped subtree — slug in the URL is the source of scope */}
                  <Route path="/p/:slug" element={<ProtectedRoute><PropertyLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="home" element={<Navigate to="details" replace />} />
                    <Route path="home/details" element={<PropertyCards />} />
                    <Route path="home/systems" element={<HomeSystemsSettings />} />
                    <Route path="home/inventory" element={<HomeInventoryPage />} />
                    <Route path="activity" element={<Navigate to="log" replace />} />
                    <Route path="activity/log" element={<MaintenanceLog />} />
                    <Route path="activity/timeline" element={<PropertyTimeline />} />
                    <Route path="activity/contractors" element={<ContractorLinks />} />
                    <Route path="money" element={<Navigate to="forecast" replace />} />
                    <Route path="money/forecast" element={<SavingsTracking />} />
                    <Route path="money/equity" element={<TaxInvestmentPage />} />
                    <Route path="money/basis" element={<TaxInvestmentPage />} />
                    <Route path="money/tax" element={<TaxInvestmentPage />} />
                    <Route path="documents" element={<DocumentsHub />} />
                    <Route path="sharing" element={<PropertySharing />} />
                    {/* Preserved feature routes not in the primary tab set */}
                    <Route path="contacts" element={<HomeContacts />} />
                    <Route path="utilities" element={<PropertyUtilities />} />
                    <Route path="recurring" element={<RecurringTemplates />} />
                    <Route path="export" element={<ExportReports />} />
                    <Route path="analytics" element={<AnalyticsInsights />} />
                    <Route path="contractor-submissions" element={<ContractorSubmissions />} />
                  </Route>

                  {/* Legacy top-level redirects — every old /dashboard?section=X target maps here.
                      Resolution uses last-visited slug -> only-one-property -> /portfolio. */}
                  <Route path="/dashboard" element={<ProtectedRoute><LegacyRedirect subpath="" /></ProtectedRoute>} />
                  <Route path="/properties" element={<ProtectedRoute><LegacyRedirect subpath="home/details" /></ProtectedRoute>} />
                  <Route path="/home-details" element={<ProtectedRoute><LegacyRedirect subpath="home/details" /></ProtectedRoute>} />
                  <Route path="/inventory" element={<ProtectedRoute><LegacyRedirect subpath="home/inventory" /></ProtectedRoute>} />
                  <Route path="/systems" element={<ProtectedRoute><LegacyRedirect subpath="home/systems" /></ProtectedRoute>} />
                  <Route path="/maintenance" element={<ProtectedRoute><LegacyRedirect subpath="activity/log" /></ProtectedRoute>} />
                  <Route path="/logs" element={<ProtectedRoute><LegacyRedirect subpath="activity/log" /></ProtectedRoute>} />
                  <Route path="/timeline" element={<ProtectedRoute><LegacyRedirect subpath="activity/timeline" /></ProtectedRoute>} />
                  <Route path="/contractor-links" element={<ProtectedRoute><LegacyRedirect subpath="activity/contractors" /></ProtectedRoute>} />
                  <Route path="/documents" element={<ProtectedRoute><LegacyRedirect subpath="documents" /></ProtectedRoute>} />
                  <Route path="/savings" element={<ProtectedRoute><LegacyRedirect subpath="money/forecast" /></ProtectedRoute>} />
                  <Route path="/home-value" element={<ProtectedRoute><LegacyRedirect subpath="money/equity" /></ProtectedRoute>} />
                  <Route path="/equity" element={<ProtectedRoute><LegacyRedirect subpath="money/equity" /></ProtectedRoute>} />
                  <Route path="/cost-basis" element={<ProtectedRoute><LegacyRedirect subpath="money/basis" /></ProtectedRoute>} />
                  <Route path="/capital-improvements" element={<ProtectedRoute><LegacyRedirect subpath="money/basis" /></ProtectedRoute>} />
                  <Route path="/tax" element={<ProtectedRoute><LegacyRedirect subpath="money/tax" /></ProtectedRoute>} />
                  <Route path="/tax-investment" element={<ProtectedRoute><LegacyRedirect subpath="money/tax" /></ProtectedRoute>} />
                  <Route path="/sharing" element={<ProtectedRoute><LegacyRedirect subpath="sharing" /></ProtectedRoute>} />
                  <Route path="/contacts" element={<ProtectedRoute><LegacyRedirect subpath="contacts" /></ProtectedRoute>} />
                  <Route path="/utilities" element={<ProtectedRoute><LegacyRedirect subpath="utilities" /></ProtectedRoute>} />
                  <Route path="/recurring" element={<ProtectedRoute><LegacyRedirect subpath="recurring" /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><LegacyRedirect subpath="analytics" /></ProtectedRoute>} />
                  <Route path="/export" element={<ProtectedRoute><LegacyRedirect subpath="export" /></ProtectedRoute>} />
                  <Route path="/settings" element={<Navigate to="/account" replace />} />

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
