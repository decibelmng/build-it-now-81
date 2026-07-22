import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSubscription, isProFeature } from "@/hooks/useSubscription";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import FeatureGate from "@/components/dashboard/FeatureGate";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import SearchCommandPalette from "@/components/dashboard/SearchCommandPalette";
import SecurityFooter from "@/components/layout/SecurityFooter";
import { useToast } from "@/hooks/use-toast";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { PropertyFilterProvider } from "@/hooks/usePropertyFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DashboardOverview = lazy(() => import("@/components/dashboard/DashboardOverview"));
const PropertyCards = lazy(() => import("@/components/dashboard/PropertyCards"));
const MaintenanceLogSection = lazy(() => import("@/components/dashboard/MaintenanceLog"));
const DocumentsHub = lazy(() => import("@/components/dashboard/documents/DocumentsHub"));
const SavingsTracking = lazy(() => import("@/components/dashboard/SavingsTracking"));
const HomeContacts = lazy(() => import("@/components/dashboard/HomeContacts"));
const PropertyTimeline = lazy(() => import("@/components/dashboard/PropertyTimeline"));
const ProfileSettings = lazy(() => import("@/components/dashboard/ProfileSettings"));
const RecurringTemplates = lazy(() => import("@/components/dashboard/RecurringTemplates"));
const PropertySharing = lazy(() => import("@/components/dashboard/PropertySharing"));
const ExportReports = lazy(() => import("@/components/dashboard/ExportReports"));
const AnalyticsInsights = lazy(() => import("@/components/dashboard/AnalyticsInsights"));
const PropertyUtilities = lazy(() => import("@/components/dashboard/PropertyUtilities"));
const ContractorLinks = lazy(() => import("@/components/dashboard/ContractorLinks"));
const ContractorSubmissions = lazy(() => import("@/components/dashboard/ContractorSubmissions"));
const HomeInventoryPage = lazy(() => import("@/components/dashboard/HomeInventoryPage"));
const TaxInvestmentPage = lazy(() => import("@/components/dashboard/TaxInvestmentPage"));

type Section = "overview" | "properties" | "home-inventory" | "maintenance" | "documents" | "savings" | "tax-investment" | "contacts" | "utilities" | "timeline" | "recurring" | "sharing" | "export" | "analytics" | "settings" | "search" | "contractor-links" | "contractor-submissions";

const VALID_SECTIONS: Set<string> = new Set<string>(["overview","properties","home-inventory","maintenance","documents","savings","tax-investment","contacts","utilities","timeline","recurring","sharing","export","analytics","settings","search","contractor-links","contractor-submissions"]);
const isValidSection = (s: string): s is Section => VALID_SECTIONS.has(s);

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { tier, refreshSubscription } = useSubscription();
  const { showWarning, resetTimer } = useSessionTimeout();
  const [profile, setProfile] = useState<{ display_name: string | null; persona: string | null } | null>(null);

  // Derive activeSection from URL search params so browser back/forward works
  const sectionParam = searchParams.get("section") as Section | null;
  const activeSection: Section = sectionParam && isValidSection(sectionParam) ? sectionParam : "overview";

  const setActiveSection = useCallback((section: Section) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (section === "overview") {
        next.delete("section");
      } else {
        next.set("section", section);
      }
      return next;
    });
  }, [setSearchParams]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Cmd+K shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Handle upgrade success/cancel from Stripe redirect
  useEffect(() => {
    const upgradeStatus = searchParams.get("upgrade");
    if (upgradeStatus === "success") {
      toast({ title: "Welcome to Pro! 🎉", description: "Your subscription is now active." });
      refreshSubscription();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, persona")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !data.persona) {
          navigate("/persona");
        } else {
          setProfile(data);
        }
      });
  }, [user, navigate]);

  const { data: properties, isSuccess: propertiesLoaded } = useQuery({
    queryKey: ["properties_onboarding", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id").limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!profile,
  });

  useEffect(() => {
    if (propertiesLoaded && properties && properties.length === 0) {
      setShowOnboarding(true);
    }
  }, [propertiesLoaded, properties]);

  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent).detail as Section;
      setActiveSection(section);
    };
    window.addEventListener("navigate-section", handler);
    return () => window.removeEventListener("navigate-section", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSearchNavigate = useCallback((section: string) => {
    setActiveSection(section as Section);
    setSearchOpen(false);
  }, []);

  const handleQuickAdd = useCallback(() => {
    setActiveSection("maintenance");
    // Small delay to ensure the component mounts, then trigger add
    setTimeout(() => {
      setQuickAddOpen(true);
    }, 100);
  }, []);

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return (
    <PropertyFilterProvider>
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={handleSignOut}
        displayName={profile?.display_name ?? null}
        onOpenSearch={() => setSearchOpen(true)}
        onQuickAdd={handleQuickAdd}
      />

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl px-3 py-4 sm:px-8 sm:py-8">
          <Suspense fallback={<div className="p-8"><div className="h-8 w-48 rounded bg-muted animate-pulse mb-4" /><div className="h-64 rounded bg-muted animate-pulse" /></div>}>
            {activeSection === "overview" && <DashboardOverview onNavigate={(s: string) => setActiveSection(s as Section)} />}
            {activeSection === "properties" && <PropertyCards onNavigate={(s: string) => setActiveSection(s as Section)} />}
            {activeSection === "home-inventory" && <HomeInventoryPage onNavigate={(s: string) => setActiveSection(s as Section)} />}
            {activeSection === "maintenance" && <MaintenanceLogSection onNavigate={(s: string) => setActiveSection(s as Section)} />}
            {activeSection === "documents" && <DocumentsHub />}
            {activeSection === "savings" && <SavingsTracking onNavigate={(s: string) => setActiveSection(s as Section)} />}
            {activeSection === "tax-investment" && <TaxInvestmentPage />}
            {activeSection === "contacts" && <HomeContacts />}
            {activeSection === "utilities" && <PropertyUtilities />}
            {activeSection === "timeline" && <PropertyTimeline />}
            {activeSection === "recurring" && <RecurringTemplates />}
            {activeSection === "sharing" && <PropertySharing />}
            {activeSection === "export" && (
              tier === "pro" ? <ExportReports /> : <FeatureGate featureName="Export & Reports" onUpgrade={() => setShowUpgrade(true)} />
            )}
            {activeSection === "analytics" && (
              tier === "pro" ? <AnalyticsInsights /> : <FeatureGate featureName="Analytics & Insights" onUpgrade={() => setShowUpgrade(true)} />
            )}
            {activeSection === "settings" && <ProfileSettings />}
            {activeSection === "search" && <SearchCommandPalette open={true} onOpenChange={() => setActiveSection("overview")} onNavigate={handleSearchNavigate} />}
            {activeSection === "contractor-links" && <ContractorLinks />}
            {activeSection === "contractor-submissions" && <ContractorSubmissions />}
          </Suspense>
        </div>
        <SecurityFooter />
      </main>

      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} onNavigate={handleSearchNavigate} />
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      <Dialog open={showWarning} onOpenChange={(open) => { if (!open) resetTimer(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Session expiring soon</DialogTitle>
            <DialogDescription>
              You've been inactive for 25 minutes. Your session will expire in 5 minutes for security. Click Continue to stay signed in.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full" onClick={resetTimer}>Continue session</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
