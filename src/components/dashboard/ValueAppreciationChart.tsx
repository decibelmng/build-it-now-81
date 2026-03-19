import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, ReferenceLine, Legend,
} from "recharts";
import { usePropertyValuations } from "@/hooks/usePropertyValuations";
import { usePropertyEquityForProperty } from "@/hooks/usePropertyEquity";
import { format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

interface ValueAppreciationChartProps {
  property: Tables<"properties">;
}

const fmtK = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  return `$${(v / 1000).toFixed(0)}k`;
};
const fmtCurrency = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MARKET_TYPES = [
  "bank_appraisal", "refinance_appraisal", "purchase_appraisal",
  "tax_assessment", "owner_estimate", "cma", "estimate",
  "professional_appraisal", "comparative_market_analysis",
];

const TYPE_COLORS: Record<string, string> = {
  purchase_appraisal: "hsl(210, 70%, 55%)",
  bank_appraisal: "hsl(210, 70%, 55%)",
  refinance_appraisal: "hsl(270, 60%, 55%)",
  tax_assessment: "hsl(38, 80%, 50%)",
  professional_appraisal: "hsl(170, 50%, 45%)",
  owner_estimate: "hsl(170, 50%, 45%)",
  estimate: "hsl(220, 10%, 55%)",
  cma: "hsl(150, 50%, 45%)",
  comparative_market_analysis: "hsl(150, 50%, 45%)",
};

const TYPE_LABELS: Record<string, string> = {
  purchase_appraisal: "Purchase Appraisal",
  bank_appraisal: "Bank Appraisal",
  refinance_appraisal: "Refinance Appraisal",
  tax_assessment: "Tax Assessment",
  professional_appraisal: "Professional Appraisal",
  owner_estimate: "Your Estimate",
  estimate: "Estimate",
  cma: "CMA",
  comparative_market_analysis: "CMA",
};

const ValueAppreciationChart = ({ property }: ValueAppreciationChartProps) => {
  const { user } = useAuth();
  const { data: valuations = [] } = usePropertyValuations(property.id);
  const { data: equitySummary } = usePropertyEquityForProperty(property.id);

  // Fetch capital improvements for cost basis line
  const { data: improvements = [] } = useQuery({
    queryKey: ["cost_basis_improvements_chart", property.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, cost, completed_date, scheduled_date, created_at")
        .eq("property_id", property.id)
        .eq("expense_type", "capital_improvement")
        .not("cost", "is", null)
        .order("completed_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const purchasePrice = property.purchase_price ? Number(property.purchase_price) : null;
  const purchaseDate = property.purchase_date;
  const closingCosts = property.purchase_closing_costs ? Number(property.purchase_closing_costs) : 0;
  const currentValue = property.current_estimated_value ? Number(property.current_estimated_value) : null;
  const valueLastUpdated = property.value_last_updated;
  const mortgageBalance = property.mortgage_balance ? Number(property.mortgage_balance) : null;

  // Build unified timeline with market value + cost basis
  const { chartData, dotData, yDomain, xTicks } = useMemo(() => {
    // Collect all dates we need data points for
    const dateMap = new Map<string, { marketValue?: number; costBasis?: number; type?: string; source?: string | null }>();

    // Market value points from valuations
    const marketPoints: { date: string; value: number; type: string; source?: string | null }[] = [];

    valuations
      .filter((v) => MARKET_TYPES.includes(v.valuation_type))
      .forEach((v) => {
        marketPoints.push({ date: v.valuation_date, value: Number(v.value), type: v.valuation_type, source: v.source });
      });

    // Add current estimated value if newer
    if (currentValue && valueLastUpdated) {
      const lastValDate = marketPoints.length > 0
        ? marketPoints.sort((a, b) => b.date.localeCompare(a.date))[0].date
        : null;
      if (!lastValDate || valueLastUpdated > lastValDate) {
        marketPoints.push({ date: valueLastUpdated, value: currentValue, type: "estimate", source: "Current estimate" });
      }
    }

    // Sort market points
    marketPoints.sort((a, b) => a.date.localeCompare(b.date));

    // Build cost basis staircase: purchase_price + closing_costs + cumulative improvements
    const costBasisPoints: { date: string; value: number }[] = [];
    if (purchasePrice && purchaseDate) {
      const startingBasis = purchasePrice + closingCosts;
      costBasisPoints.push({ date: purchaseDate, value: startingBasis });

      let runningTotal = startingBasis;
      improvements.forEach((imp: any) => {
        const d = (imp.completed_date || imp.scheduled_date || imp.created_at)?.substring(0, 10);
        if (d && Number(imp.cost) > 0) {
          runningTotal += Number(imp.cost);
          costBasisPoints.push({ date: d, value: runningTotal });
        }
      });

      // Extend cost basis to the latest date on the chart (market or today)
      const today = new Date().toISOString().slice(0, 10);
      const lastMarketDate = marketPoints.length > 0 ? marketPoints[marketPoints.length - 1].date : null;
      const extendTo = lastMarketDate && lastMarketDate > today ? lastMarketDate : today;
      const lastCostDate = costBasisPoints[costBasisPoints.length - 1]?.date;
      if (lastCostDate && extendTo > lastCostDate) {
        costBasisPoints.push({ date: extendTo, value: runningTotal });
      }
    }

    // Merge all dates
    const allDates = new Set<string>();
    marketPoints.forEach((p) => allDates.add(p.date));
    costBasisPoints.forEach((p) => allDates.add(p.date));

    const sortedDates = Array.from(allDates).sort();

    // Interpolate market values (carry forward)
    let lastMarket: number | undefined;
    const marketByDate = new Map<string, { value: number; type: string; source?: string | null }>();
    marketPoints.forEach((p) => marketByDate.set(p.date, p));

    // Interpolate cost basis (carry forward - staircase)
    let lastCost: number | undefined;
    const costByDate = new Map<string, number>();
    costBasisPoints.forEach((p) => costByDate.set(p.date, p.value));

    const chart: { date: string; marketValue?: number; costBasis?: number }[] = [];
    const dots: { date: string; value: number; type: string; source?: string | null; label: string }[] = [];

    sortedDates.forEach((date) => {
      const mp = marketByDate.get(date);
      if (mp) {
        lastMarket = mp.value;
        dots.push({
          date,
          value: mp.value,
          type: mp.type,
          source: mp.source,
          label: format(parseISO(date), "MMM d, yyyy"),
        });
      }

      const cb = costByDate.get(date);
      if (cb !== undefined) lastCost = cb;

      chart.push({
        date,
        marketValue: lastMarket,
        costBasis: lastCost,
      });
    });

    // Build deduplicated X-axis ticks
    const uniqueMonths: string[] = [];
    const seenMonths = new Set<string>();
    sortedDates.forEach((d) => {
      const key = d.substring(0, 7); // YYYY-MM
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        uniqueMonths.push(d);
      }
    });
    // Limit to ~6 ticks max
    let xTicks = uniqueMonths;
    if (uniqueMonths.length > 6) {
      const step = Math.ceil(uniqueMonths.length / 6);
      xTicks = uniqueMonths.filter((_, i) => i % step === 0);
      if (xTicks[xTicks.length - 1] !== uniqueMonths[uniqueMonths.length - 1]) {
        xTicks.push(uniqueMonths[uniqueMonths.length - 1]);
      }
    }

    // Calculate Y-axis domain
    const allValues = [
      ...chart.map((c) => c.marketValue).filter(Boolean) as number[],
      ...chart.map((c) => c.costBasis).filter(Boolean) as number[],
      ...(mortgageBalance ? [mortgageBalance] : []),
    ];
    const yMin = allValues.length > 0 ? Math.floor(Math.min(...allValues) * 0.85 / 10000) * 10000 : 0;
    const yMax = allValues.length > 0 ? Math.ceil(Math.max(...allValues) * 1.05 / 10000) * 10000 : 0;

    return { chartData: chart, dotData: dots, yDomain: [yMin, yMax] as [number, number], xTicks };
  }, [valuations, purchasePrice, purchaseDate, closingCosts, currentValue, valueLastUpdated, improvements, mortgageBalance]);

  // Calculate appreciation
  const appreciation = equitySummary?.appreciation ? Number(equitySummary.appreciation) : null;
  const appreciationPct = equitySummary?.appreciation_pct ? Number(equitySummary.appreciation_pct) : null;
  const isPositive = (appreciation ?? 0) >= 0;

  // Need at least 2 data points for a meaningful chart
  if (chartData.length < 2) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Home Value Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {chartData.length === 1
                ? "Add a current estimate or upload an appraisal to see your appreciation chart."
                : "Add your purchase price and a current estimate to see your value chart."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;
    const dot = dotData.find((d) => d.date === data.date);
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
        <p className="font-body text-xs text-muted-foreground">{dot?.label || (data.date ? format(parseISO(data.date), "MMM d, yyyy") : "")}</p>
        {dot && (
          <Badge
            className="mt-1 text-[10px]"
            style={{ backgroundColor: TYPE_COLORS[dot.type] || "hsl(var(--muted))", color: "#fff" }}
          >
            {TYPE_LABELS[dot.type] || dot.type}
          </Badge>
        )}
        {data.marketValue != null && (
          <p className="font-display text-sm font-bold mt-1">Market: {fmtCurrency(data.marketValue)}</p>
        )}
        {data.costBasis != null && (
          <p className="font-body text-xs text-muted-foreground">Investment: {fmtCurrency(data.costBasis)}</p>
        )}
        {data.marketValue != null && data.costBasis != null && (
          <p className="font-body text-xs mt-0.5" style={{ color: data.marketValue >= data.costBasis ? "hsl(var(--sage))" : "hsl(var(--destructive))" }}>
            {data.marketValue >= data.costBasis ? "+" : ""}{fmtCurrency(data.marketValue - data.costBasis)} unrealized
          </p>
        )}
        {dot?.source && <p className="font-body text-[11px] text-muted-foreground mt-0.5">{dot.source}</p>}
      </div>
    );
  };

  const CustomLegend = () => (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 justify-center">
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-5 rounded-full" style={{ backgroundColor: "hsl(var(--accent))" }} />
        <span className="font-body text-[11px] text-muted-foreground">Market value</span>
      </div>
      {purchasePrice && (
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-muted-foreground" />
          <span className="font-body text-[11px] text-muted-foreground">Your investment</span>
        </div>
      )}
      {mortgageBalance && (
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full border-t-2 border-dashed" style={{ borderColor: "hsl(0, 60%, 55%)" }} />
          <span className="font-body text-[11px] text-muted-foreground">Mortgage balance</span>
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Home Value Over Time
            </CardTitle>
            {appreciation != null && (
              <p className={`font-body text-sm mt-0.5 ${isPositive ? "text-sage" : "text-destructive"}`}>
                {isPositive ? "+" : ""}{fmtCurrency(appreciation)} ({isPositive ? "+" : ""}
                {appreciationPct?.toFixed(1)}%) since purchase
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
              ticks={xTicks}
              tickFormatter={(d: string) => {
                try { return format(parseISO(d), "MMM yyyy"); } catch { return d; }
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={fmtK}
              domain={yDomain}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* LINE 1: Market Value (solid accent with gradient fill) */}
            <Area
              type="monotone"
              dataKey="marketValue"
              stroke="hsl(var(--accent))"
              fill="url(#valueGradient)"
              strokeWidth={2}
              connectNulls
              name="Market Value"
            />

            {/* LINE 2: Cost Basis (gray dashed staircase) */}
            <Line
              type="stepAfter"
              dataKey="costBasis"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              name="Cost Basis"
            />

            {/* LINE 3: Mortgage reference line (red dashed) */}
            {mortgageBalance && (
              <ReferenceLine
                y={mortgageBalance}
                stroke="hsl(0, 60%, 55%)"
                strokeDasharray="5 3"
                strokeWidth={1}
                label={{
                  value: `Mortgage ${fmtCurrency(mortgageBalance)}`,
                  position: "right",
                  fontSize: 10,
                  fontFamily: "DM Sans",
                  fill: "hsl(0, 60%, 55%)",
                }}
              />
            )}

            {/* Valuation dots on market value line */}
            {dotData.map((dot, i) => (
              <ReferenceDot
                key={i}
                x={dot.label ? format(parseISO(dot.date), "MMM yyyy") : ""}
                y={dot.value}
                r={5}
                fill={TYPE_COLORS[dot.type] || "hsl(var(--accent))"}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        <CustomLegend />
      </CardContent>
    </Card>
  );
};

export default ValueAppreciationChart;
