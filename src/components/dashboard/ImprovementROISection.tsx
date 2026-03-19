import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePropertyValuations } from "@/hooks/usePropertyValuations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, DollarSign, ArrowUpRight, PiggyBank } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  property: Tables<"properties">;
}

const fmtK = (v: number) => `$${(v / 1000).toFixed(0)}k`;
const fmtCurrency = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ImprovementROISection = ({ property }: Props) => {
  const { user } = useAuth();
  const { data: valuations = [] } = usePropertyValuations(property.id);

  // Fetch capital improvements with cost
  const { data: improvements = [] } = useQuery({
    queryKey: ["roi_improvements", property.id],
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

  const hasImprovements = improvements.length >= 1;
  const hasValuations = valuations.length >= 2;

  // Build chart data: years with improvement spending + valuation points
  const chartData = useMemo(() => {
    const yearMap = new Map<string, { year: string; improvements: number; value: number | null }>();

    // Aggregate improvements by year
    improvements.forEach((imp: any) => {
      const d = imp.completed_date || imp.scheduled_date || imp.created_at;
      const yr = d ? format(parseISO(typeof d === "string" && d.includes("T") ? d : `${d}T00:00:00`), "yyyy") : null;
      if (!yr) return;
      const existing = yearMap.get(yr);
      if (existing) {
        existing.improvements += Number(imp.cost);
      } else {
        yearMap.set(yr, { year: yr, improvements: Number(imp.cost), value: null });
      }
    });

    // Add valuation points by year (use latest per year)
    valuations.forEach((v) => {
      const yr = format(parseISO(v.valuation_date), "yyyy");
      const existing = yearMap.get(yr);
      if (existing) {
        if (existing.value === null || Number(v.value) > existing.value) {
          existing.value = Number(v.value);
        }
      } else {
        yearMap.set(yr, { year: yr, improvements: 0, value: Number(v.value) });
      }
    });

    // Add purchase year if not present
    if (property.purchase_date && property.purchase_price) {
      const yr = format(parseISO(property.purchase_date), "yyyy");
      if (!yearMap.has(yr)) {
        yearMap.set(yr, { year: yr, improvements: 0, value: Number(property.purchase_price) });
      } else {
        const existing = yearMap.get(yr)!;
        if (existing.value === null) {
          existing.value = Number(property.purchase_price);
        }
      }
    }

    const sorted = Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));

    // Interpolate null values forward
    let lastValue: number | null = null;
    sorted.forEach((point) => {
      if (point.value !== null) {
        lastValue = point.value;
      } else if (lastValue !== null) {
        point.value = lastValue;
      }
    });

    return sorted;
  }, [improvements, valuations, property.purchase_date, property.purchase_price]);

  // ROI calculations
  const totalInvested = improvements.reduce((s: number, i: any) => s + Number(i.cost), 0);
  const purchasePrice = property.purchase_price ? Number(property.purchase_price) : null;
  const latestValue = property.current_estimated_value
    ? Number(property.current_estimated_value)
    : valuations.length > 0
    ? Number(valuations[0].value)
    : null;
  const valueIncrease = latestValue && purchasePrice ? latestValue - purchasePrice : null;
  const apparentReturn = valueIncrease != null && totalInvested > 0 ? valueIncrease / totalInvested : null;
  const netValueCreated = valueIncrease != null ? valueIncrease - totalInvested : null;

  const returnColor =
    apparentReturn != null
      ? apparentReturn >= 1.0
        ? "text-sage"
        : apparentReturn >= 0.5
        ? "text-amber-500"
        : "text-destructive"
      : "text-muted-foreground";

  const netColor =
    netValueCreated != null
      ? netValueCreated >= 0
        ? "text-sage"
        : "text-destructive"
      : "text-muted-foreground";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
        <p className="font-body text-xs font-semibold text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="font-body text-xs text-muted-foreground">
              {p.dataKey === "improvements" ? "Improvements" : "Home Value"}:
            </span>
            <span className="font-display text-xs font-bold">{fmtCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          Improvement ROI Correlation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Combined Chart */}
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={fmtK}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fontFamily: "DM Sans" }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={fmtK}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontFamily: "DM Sans", fontSize: 11 }}
              formatter={(value: string) => (value === "improvements" ? "Improvements" : "Home Value")}
            />
            <Bar
              yAxisId="left"
              dataKey="improvements"
              fill="hsl(var(--sage))"
              radius={[4, 4, 0, 0]}
              barSize={32}
              opacity={0.8}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--accent))", stroke: "hsl(var(--background))", strokeWidth: 2, r: 4 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* ROI Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total Invested */}
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-body text-[11px] text-muted-foreground">Total Invested</p>
              </div>
              <p className="font-display text-lg font-bold">{fmtCurrency(totalInvested)}</p>
            </CardContent>
          </Card>

          {/* Value Increase */}
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-body text-[11px] text-muted-foreground">Value Increase</p>
              </div>
              <p className={`font-display text-lg font-bold ${valueIncrease != null && valueIncrease >= 0 ? "text-sage" : "text-destructive"}`}>
                {valueIncrease != null ? `${valueIncrease >= 0 ? "+" : ""}${fmtCurrency(valueIncrease)}` : "$—"}
              </p>
            </CardContent>
          </Card>

          {/* Apparent Return */}
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-body text-[11px] text-muted-foreground">Apparent Return</p>
              </div>
              <p className={`font-display text-3xl font-bold ${returnColor}`}>
                {apparentReturn != null ? `${apparentReturn.toFixed(1)}x` : "—"}
              </p>
            </CardContent>
          </Card>

          {/* Net Value Created */}
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <PiggyBank className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-body text-[11px] text-muted-foreground">Net Value Created</p>
              </div>
              <p className={`font-display text-lg font-bold ${netColor}`}>
                {netValueCreated != null ? `${netValueCreated >= 0 ? "+" : ""}${fmtCurrency(netValueCreated)}` : "$—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="font-body text-[11px] text-muted-foreground leading-relaxed">
            This is a simplified correlation, not a causal analysis. Home values are affected by market conditions, location, and many factors beyond improvements. Consult a real estate professional for accurate valuation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImprovementROISection;