import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PersonaSelection = () => {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setPersona = async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ persona: "homeowner" })
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
      } else {
        navigate("/dashboard", { replace: true });
      }
    };

    setPersona();
  }, [user, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-section-warm">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
    </div>
  );
};

export default PersonaSelection;
