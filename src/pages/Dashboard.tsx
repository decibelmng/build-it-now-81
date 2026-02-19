import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PropertyCards from "@/components/dashboard/PropertyCards";
import MaintenanceLogSection from "@/components/dashboard/MaintenanceLog";
import DocumentVault from "@/components/dashboard/DocumentVault";

type Section = "properties" | "maintenance" | "documents";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; persona: string | null } | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("properties");

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={handleSignOut}
        displayName={profile?.display_name ?? null}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          {activeSection === "properties" && <PropertyCards />}
          {activeSection === "maintenance" && <MaintenanceLogSection />}
          {activeSection === "documents" && <DocumentVault />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
