import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface CostBasisData {
  property_id: string;
  purchase_price: number | null;
  purchase_date: string | null;
  purchase_closing_costs: number | null;
  sale_price: number | null;
  sale_date: string | null;
  sale_closing_costs: number | null;
  agent_commissions: number | null;
  total_improvements: number | null;
  total_repairs: number | null;
  improvement_count: number | null;
  repair_count: number | null;
  adjusted_basis: number | null;
  estimated_gain: number | null;
}

export function useCostBasisSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cost_basis_summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_basis_summary")
        .select("*");
      if (error) throw error;
      return (data ?? []) as CostBasisData[];
    },
    enabled: !!user,
  });
}

export function useCostBasisForProperty(propertyId: string | undefined) {
  const { data: allSummaries, ...rest } = useCostBasisSummary();
  const summary = allSummaries?.find((s) => s.property_id === propertyId) ?? null;
  return { data: summary, ...rest };
}

export function useCostBasisAggregated() {
  const { data: allSummaries, ...rest } = useCostBasisSummary();
  
  const aggregated = allSummaries?.reduce(
    (acc, s) => ({
      totalPurchasePrice: acc.totalPurchasePrice + (s.purchase_price ?? 0),
      totalImprovements: acc.totalImprovements + (s.total_improvements ?? 0),
      totalRepairs: acc.totalRepairs + (s.total_repairs ?? 0),
      totalAdjustedBasis: acc.totalAdjustedBasis + (s.adjusted_basis ?? 0),
      totalEstimatedGain: acc.totalEstimatedGain + (s.estimated_gain ?? 0),
      improvementCount: acc.improvementCount + (s.improvement_count ?? 0),
      repairCount: acc.repairCount + (s.repair_count ?? 0),
      hasPurchasePrice: acc.hasPurchasePrice || s.purchase_price != null,
      earliestPurchaseDate: !s.purchase_date ? acc.earliestPurchaseDate :
        (!acc.earliestPurchaseDate || s.purchase_date < acc.earliestPurchaseDate) ? s.purchase_date : acc.earliestPurchaseDate,
    }),
    {
      totalPurchasePrice: 0,
      totalImprovements: 0,
      totalRepairs: 0,
      totalAdjustedBasis: 0,
      totalEstimatedGain: 0,
      improvementCount: 0,
      repairCount: 0,
      hasPurchasePrice: false,
      earliestPurchaseDate: null as string | null,
    }
  );

  return { data: aggregated, ...rest };
}
