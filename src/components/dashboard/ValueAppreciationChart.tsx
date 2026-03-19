import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, ReferenceLine,
} from "recharts";
import { usePropertyValuations } from "@/hooks/usePropertyValuations";
import { usePropertyEquityForProperty } from "@/hooks/usePropertyEquity";
import { format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

interface ValueAppreciationChartProps {
  property: Tables<"properties">;
}

const fmtK = (v: number) => `$${(v / 1000).toFixed(0)}k`;
const fmtCurrency = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TYPE_COLORS: Record<string, string> = {
  purchase_appraisal: "hsl(210, 70%, 55%)",
  refinance_appraisal: "hsl(270, 60%, 55%)",
  tax_assessment: "hsl(38, 80%, 50%)",
  professional_appraisal: "hsl(170, 50%, 45%)",
  estimate: "hsl(220, 10%, 55%)",
  comparative_market_analysis: "hsl(150, 50%, 45%)",
};

const TYPE_LABELS: Record<string, string> = {
  purchase_appraisal: "Purchase Appraisal",
  refinance_appraisal: "Refinance Appraisal",
  tax_assessment: "Tax Assessment",
  professional_appraisal: "Professional Appraisal",
  estimate: "Estimate",
  comparative_market_analysis: "CMA",
};

const ValueAppreciationChart = ({ property }: ValueAppreciationChartProps) => {
  const { user } = useAuth();
  const { data: valuations = [] } = usePropertyValuations(property.id);
  const { data: equitySummary } = usePropertyEquityForProperty(property.id);

  // Fetch major improvements (>= $5000)
  const { data: improvements = [] } = useQuery({
    queryKey: ["major_improvements_chart", property.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, cost, completed_date, scheduled_date, created_at")
        .eq("property_id", property.id)
        .eq("expense_type", "capital_improvement")
        .gte("cost", 5000)
        .order("completed_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const purchasePrice = property.purchase_price ? Number(property.purchase_price) : null;
  const purchaseDate = property.purchase_date;
  const currentValue = property.current_estimated_value ? Number(property.current_estimated_value) : null;
  const valueLastUpdated = property.value_last_updated;
  const mortgageBalance = property.mortgage_balance ? Number(property.mortgage_balance) : null;

  // Build timeline data points
  const { chartData, dotData } = useMemo(() => {
    const points: { date: string; value: number; type: string; source?: string | null }[] = [];

    // Add purchase price as starting point
    if (purchasePrice && purchaseDate) {
      points.push({ date: purchaseDate, value: purchasePrice, type: "purchase_appraisal", source: "Purchase" });
    }

    // Add all valuations
    valuations.forEach((v) => {
      points.push({ date: v.valuation_date, value: Number(v.value), type: v.valuation_type, source: v.source });
    });

    // Add current estimated value as end point if newer than last valuation
    if (currentValue && valueLastUpdated) {
      const lastValDate = valuations.length > 0 ? valuations[0].valuation_date : null;
      if (!lastValDate || valueLastUpdated > lastValDate) {
        points.push({ date: valueLastUpdated, value: currentValue, type: "estimate", source: "Current estimate" });
      }
    }

    // Sort by date
    points.sort((a, b) => a.date.localeCompare(b.date));

    // Deduplicate by date (keep higher value)
    const uniqueMap = new Map<string, typeof points[0]>();
    points.forEach((p) => {
      const existing = uniqueMap.get(p.date);
      if (!existing || p.value > existing.value) {
        uniqueMap.set(p.date, p);
      }
    });

    const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const chart = sorted.map((p) => ({
      date: p.date,
      value: p.value,
      label: format(parseISO(p.date), "MMM yyyy"),
    }));

    const dots = sorted.map((p) => ({
      date: p.date,
      value: p.value,
      type: p.type,
      source: p.source,
      label: format(parseISO(p.date), "MMM d, yyyy"),
    }));

    return { chartData: chart, dotData: dots };
  }, [valuations, purchasePrice, purchaseDate, currentValue, valueLastUpdated]);

  // Improvement markers
  const improvementMarkers = useMemo(() => {
    return improvements.map((imp: any) => {
      const d = imp.completed_date || imp.scheduled_date || imp.created_at;
      return {
        date: d ? d.substring(0, 10) : "",
        cost: Number(imp.cost),
        title: imp.title,
      };
    }).filter((m) => m.date);
  }, [improvements]);

  // Calculate appreciation
  const appreciation = equitySummary?.appreciation ? Number(equitySummary.appreciation) : null;
  const appreciationPct = equitySummary?.appreciation_pct ? Number(equitySummary.appreciation_pct) : null;
  const isPositive = (appreciation ?? 0) >= 0;

  // Need at least 2 data points
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
                ? "Add a current estimate to see your appreciation chart."
                : "Add your purchase price and a current estimate to see your appreciation chart."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const dot = dotData.find((d) => d.date === data.date);
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
        <p className="font-body text-xs text-muted-foreground">{dot?.label || data.label}</p>
        {dot && (
          <Badge
            className="mt-1 text-[10px]"
            style={{ backgroundColor: TYPE_COLORS[dot.type] || "hsl(var(--muted))", color: "#fff" }}
          >
            {TYPE_LABELS[dot.type] || dot.type}
          </Badge>
        )}
        <p className="font-display text-sm font-bold mt-1">{fmtCurrency(data.value)}</p>
        {dot?.source && <p className="font-body text-[11px] text-muted-foreground">{dot.source}</p>}
      </div>
    );
  };

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
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={fmtK}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--accent))"
              fill="url(#valueGradient)"
              strokeWidth={2}
            />

            {/* Purchase price reference line */}
            {purchasePrice && (
              <ReferenceLine
                y={purchasePrice}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 3"
                strokeWidth={1}
                label={{
                  value: "Purchase price",
                  position: "right",
                  fontSize: 10,
                  fontFamily: "DM Sans",
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            )}

            {/* Mortgage balance reference line */}
            {mortgageBalance && (
              <ReferenceLine
                y={mortgageBalance}
                stroke="hsl(var(--sage))"
                strokeDasharray="5 3"
                strokeWidth={1}
                label={{
                  value: "Current mortgage",
                  position: "right",
                  fontSize: 10,
                  fontFamily: "DM Sans",
                  fill: "hsl(var(--sage))",
                }}
              />
            )}

            {/* Valuation dots */}
            {dotData.map((dot, i) => (
              <ReferenceDot
                key={i}
                x={dot.label || ""}
                y={dot.value}
                r={5}
                fill={TYPE_COLORS[dot.type] || "hsl(var(--accent))"}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        {/* Improvement markers below chart */}
        {improvementMarkers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {improvementMarkers.map((m, i) => (
              <Badge key={i} variant="outline" className="font-body text-[10px] gap-1 text-sage border-sage/30">
                {format(parseISO(m.date), "MMM yyyy")}: {m.title} — {fmtCurrency(m.cost)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValueAppreciationChart;
