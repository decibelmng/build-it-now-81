import { Lock, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureGateProps {
  featureName: string;
  onUpgrade: () => void;
}

const FeatureGate = ({ featureName, onUpgrade }: FeatureGateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <Lock className="h-8 w-8 text-accent" />
      </div>
      <h3 className="mb-2 font-display text-xl font-bold">{featureName} is a Pro Feature</h3>
      <p className="mb-6 max-w-sm text-center font-body text-sm text-muted-foreground">
        Upgrade to HomeLog Pro to unlock {featureName.toLowerCase()}, unlimited properties, and more.
      </p>
      <Button
        onClick={onUpgrade}
        className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold px-8"
      >
        <Crown className="mr-2 h-4 w-4" />
        Upgrade to Pro — $4.99/mo
      </Button>
    </div>
  );
};

export default FeatureGate;
