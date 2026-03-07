import { useCostBasisForProperty } from "@/hooks/useCostBasisSummary";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "$0";

const CostBasisSummarySection = ({ propertyId }: { propertyId: string }) => {
  const { data: summary } = useCostBasisForProperty(propertyId);

  if (!summary || !summary.purchase_price) return null;

  const purchasePrice = summary.purchase_price ?? 0;
  const closingCosts = summary.purchase_closing_costs ?? 0;
  const improvements = summary.total_improvements ?? 0;
  const adjustedBasis = summary.adjusted_basis ?? 0;
  const totalRepairs = summary.total_repairs ?? 0;
  const estimatedGain = summary.estimated_gain;
  const hasSaleInfo = summary.sale_price != null;

  // Calculate bar segments as percentages
  const total = adjustedBasis || 1;
  const purchasePct = (purchasePrice / total) * 100;
  const closingPct = (closingCosts / total) * 100;
  const improvementPct = (improvements / total) * 100;

  return (
    <Card className="border-border/50 mt-6">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h3 className="font-display text-base font-semibold">Cost Basis Summary</h3>
        </div>

        {/* Stacked bar */}
        <div className="mb-3">
          <div className="flex h-6 w-full overflow-hidden rounded-full">
            <div
              className="bg-accent/70 transition-all"
              style={{ width: `${purchasePct}%` }}
              title={`Purchase Price: ${fmt(purchasePrice)}`}
            />
            <div
              className="bg-accent/40 transition-all"
              style={{ width: `${closingPct}%` }}
              title={`Closing Costs: ${fmt(closingCosts)}`}
            />
            <div
              className="bg-sage transition-all"
              style={{ width: `${improvementPct}%` }}
              title={`Improvements: ${fmt(improvements)}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" /> Purchase: {fmt(purchasePrice)}
            </span>
            {closingCosts > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent/40" /> Closing: {fmt(closingCosts)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sage" /> Improvements: {fmt(improvements)}
            </span>
          </div>
        </div>

        <div className="space-y-1 font-body text-sm">
          <p className="font-semibold">
            Adjusted Cost Basis: <span className="text-accent">{fmt(adjustedBasis)}</span>
          </p>
          {totalRepairs > 0 && (
            <p className="text-muted-foreground text-xs">
              Total repairs & maintenance (not added to basis): {fmt(totalRepairs)}
            </p>
          )}
          {hasSaleInfo && estimatedGain != null && (
            <p className={`text-sm font-medium ${estimatedGain > 0 ? "text-destructive" : "text-sage"}`}>
              Estimated taxable gain: {fmt(estimatedGain)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CostBasisSummarySection;
