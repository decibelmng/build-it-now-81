import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import PropertyCards from "@/components/dashboard/PropertyCards";
import MaintenanceLogSection from "@/components/dashboard/MaintenanceLog";
import DocumentVault from "@/components/dashboard/DocumentVault";
import SavingsTracking from "@/components/dashboard/SavingsTracking";
import HomeContacts from "@/components/dashboard/HomeContacts";
import PropertyTimeline from "@/components/dashboard/PropertyTimeline";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import RecurringTemplates from "@/components/dashboard/RecurringTemplates";
import PropertySharing from "@/components/dashboard/PropertySharing";
import ExportReports from "@/components/dashboard/ExportReports";
import AnalyticsInsights from "@/components/dashboard/AnalyticsInsights";
import PropertyMap from "@/components/dashboard/PropertyMap";

type Section = "overview" | "properties" | "map" | "maintenance" | "documents" | "savings" | "contacts" | "timeline" | "recurring" | "sharing" | "export" | "analytics" | "settings" | "search";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; persona: string | null } | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Check if user has any properties — show onboarding if not
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={handleSignOut}
        displayName={profile?.display_name ?? null}
      />

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl px-3 py-4 sm:px-8 sm:py-8">
          {activeSection === "overview" && <DashboardOverview />}
          {activeSection === "properties" && <PropertyCards />}
          {activeSection === "map" && <PropertyMap />}
          {activeSection === "maintenance" && <MaintenanceLogSection />}
          {activeSection === "documents" && <DocumentVault />}
          {activeSection === "savings" && <SavingsTracking />}
          {activeSection === "contacts" && <HomeContacts />}
          {activeSection === "timeline" && <PropertyTimeline />}
          {activeSection === "recurring" && <RecurringTemplates />}
          {activeSection === "sharing" && <PropertySharing />}
          {activeSection === "export" && <ExportReports />}
          {activeSection === "analytics" && <AnalyticsInsights />}
          {activeSection === "settings" && <ProfileSettings />}
          {activeSection === "search" && <DashboardSearch />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
