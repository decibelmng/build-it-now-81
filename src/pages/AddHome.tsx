import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";

const AddHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = async () => {
    if (!user) return navigate("/portfolio");
    const { data } = await supabase
      .from("properties")
      .select("slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    navigate(data?.slug ? `/p/${data.slug}` : "/portfolio", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <OnboardingWizard onComplete={handleComplete} />
      </div>
    </div>
  );
};

export default AddHome;
