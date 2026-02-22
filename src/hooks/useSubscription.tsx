import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro";

interface SubscriptionContextType {
  tier: SubscriptionTier;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Feature gating config
const PRO_FEATURES: string[] = ["export", "analytics"];
const FREE_PROPERTY_LIMIT = 1;

export const SUBSCRIPTION_CONFIG = {
  PRO_FEATURES,
  FREE_PROPERTY_LIMIT,
  PRO_PRICE_ID: "price_1T3SZ4E1mxPcjQJHSzIn7LEF",
  PRO_PRODUCT_ID: "prod_U1Vah4TcF6SV8v",
  PRO_PRICE: "$4.99/mo",
};

export const isProFeature = (section: string): boolean => {
  return PRO_FEATURES.includes(section);
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setTier("free");
      setSubscribed(false);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setTier(data.tier || "free");
      setSubscribed(data.subscribed || false);
      setSubscriptionEnd(data.subscription_end || null);
    } catch (err) {
      console.error("Failed to check subscription:", err);
      setTier("free");
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

  return (
    <SubscriptionContext.Provider value={{ tier, subscribed, subscriptionEnd, loading, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};
