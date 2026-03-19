import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface PropertyEquityData {
  property_id: string;
  user_id: string | null;
  name: string | null;
  address: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  current_estimated_value: number | null;
  value_last_updated: string | null;
  mortgage_balance: number | null;
  mortgage_last_updated: string | null;
  mortgage_rate: number | null;
  mortgage_payment: number | null;
  original_loan_amount: number | null;
  loan_term_months: number | null;
  appreciation: number | null;
  appreciation_pct: number | null;
  estimated_equity: number | null;
  equity_pct: number | null;
  latest_appraisal_value: number | null;
  latest_appraisal_date: string | null;
  valuation_count: number | null;
}

export function usePropertyEquity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property_equity_summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_equity_summary")
        .select("*");
      if (error) throw error;
      return (data ?? []) as PropertyEquityData[];
    },
    enabled: !!user,
  });
}

export function usePropertyEquityForProperty(propertyId: string | undefined) {
  const { data: all, ...rest } = usePropertyEquity();
  const summary = all?.find((s) => s.property_id === propertyId) ?? null;
  return { data: summary, ...rest };
}
