import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

const ERROR_LABELS: Record<string, string> = {
  invalid: "That code isn't valid.",
  expired: "That code has expired.",
  exhausted: "That code has reached its redemption limit.",
  already_redeemed: "You've already redeemed a beta code.",
  unauthenticated: "Please sign in to redeem a code.",
};

interface Props {
  compact?: boolean;
  onRedeemed?: () => void;
}

const BetaCodeRedeem = ({ compact, onRedeemed }: Props) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshSubscription } = useSubscription();
  const { toast } = useToast();

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_beta_code", { p_code: trimmed });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string } | null;
      if (result?.ok) {
        toast({ title: "Beta access unlocked 🎉", description: "Enjoy full Pro features." });
        setCode("");
        await refreshSubscription();
        onRedeemed?.();
      } else {
        toast({
          title: "Couldn't redeem",
          description: ERROR_LABELS[result?.error || ""] || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "flex gap-2" : "space-y-3"}>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Beta code"
        className="font-body uppercase tracking-wider"
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <Button
        onClick={submit}
        disabled={loading || !code.trim()}
        variant="outline"
        className="font-body font-semibold shrink-0"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Redeem
      </Button>
    </div>
  );
};

export default BetaCodeRedeem;
