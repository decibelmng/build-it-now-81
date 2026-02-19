import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; persona: string | null } | null>(null);

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-accent" />
            <span className="font-display text-xl font-bold">HomeLog</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-body text-sm text-muted-foreground">
              {profile?.display_name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <h1 className="mb-2 font-display text-3xl font-bold">
          Welcome, {profile?.display_name ?? "there"}! 👋
        </h1>
        <p className="font-body text-muted-foreground">
          Your {profile?.persona} dashboard is ready. Start building your home's digital passport.
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
