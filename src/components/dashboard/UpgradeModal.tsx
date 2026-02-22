import { Lock, Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription, SUBSCRIPTION_CONFIG } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  "Unlimited properties",
  "Export & Reports (CSV downloads)",
  "Analytics & Insights dashboard",
  "Priority support",
];

const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Crown className="h-5 w-5 text-accent" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="font-body">
            Unlock the full power of HomeLog
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
            <div className="mb-3 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">$4.99</span>
              <span className="font-body text-sm text-muted-foreground">/month</span>
            </div>

            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 font-body text-sm">
                  <Check className="h-4 w-4 text-accent flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crown className="mr-2 h-4 w-4" />
            )}
            {loading ? "Redirecting..." : "Upgrade Now"}
          </Button>

          <p className="text-center font-body text-xs text-muted-foreground">
            Cancel anytime. Secure checkout via Stripe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
