import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Building2, ClipboardCheck, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const personas = [
  {
    value: "homeowner" as const,
    label: "Homeowner",
    description: "Track maintenance, store documents, and manage your home's history.",
    icon: Home,
  },
  {
    value: "agent" as const,
    label: "Real Estate Agent",
    description: "Create compelling property records and streamline transactions.",
    icon: Building2,
  },
  {
    value: "inspector" as const,
    label: "Home Inspector",
    description: "Document inspections and share findings with clients.",
    icon: ClipboardCheck,
  },
];

const PersonaSelection = () => {
  const [selected, setSelected] = useState<"homeowner" | "agent" | "inspector" | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!selected || !user) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ persona: selected })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-section-warm px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
            How will you use <span className="text-gradient-amber">HomeLog</span>?
          </h1>
          <p className="font-body text-muted-foreground">
            Choose your role to personalize your experience.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {personas.map((persona) => (
            <Card
              key={persona.value}
              onClick={() => setSelected(persona.value)}
              className={`cursor-pointer border-2 transition-all hover:shadow-card-hover ${
                selected === persona.value
                  ? "border-accent shadow-premium"
                  : "border-border/50 hover:border-accent/40"
              }`}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                    selected === persona.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <persona.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-1 font-display text-lg font-semibold">{persona.label}</h3>
                <p className="font-body text-sm text-muted-foreground">{persona.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="rounded-full bg-accent px-10 py-6 font-body text-base font-semibold text-accent-foreground hover:bg-accent/90 shadow-premium"
          >
            {loading ? "Saving..." : "Continue"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelection;
