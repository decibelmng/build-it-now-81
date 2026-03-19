import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMFA = () => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verifiedTotp = data?.totp?.find((f) => f.status === "verified");
      setIsEnrolled(!!verifiedTotp);
      setFactorId(verifiedTotp?.id ?? null);
    } catch {
      setIsEnrolled(false);
      setFactorId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isEnrolled, factorId, loading, refresh };
};
