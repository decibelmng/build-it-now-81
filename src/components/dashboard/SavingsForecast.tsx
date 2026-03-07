import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, Shield, Lightbulb, AlertTriangle, ChevronRight,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { calculateForecast } from "@/lib/savingsForecast";
import type { HomeItem, PropertyInfo } from "@/lib/savingsForecast";

interface SavingsForecastProps {
  onNavigate?: (section: string) => void;
}

const SavingsForecast = ({ onNavigate }: SavingsForecastProps) => {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties_forecast", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, year_built, purchase_price, sqft")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: homeItems = [] } = useQuery({
    queryKey: ["home_items_forecast", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("id, name, category, install_date, expected_replacement, estimated_value")
        .eq("item_type", "home_component");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (properties.length === 0) return null;

  // Aggregate across all properties (use primary/first property for age & value)
  const primary = properties[0];
  const propertyInfo: PropertyInfo = {
    year_built: primary.year_built,
    purchase_price: properties.reduce((sum, p) => sum + (Number(p.purchase_price) || 0), 0) || null,
    sqft: properties.reduce((sum, p) => sum + (Number(p.sqft) || 0), 0) || null,
  };

  const items: HomeItem[] = homeItems.map((i: any) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    install_date: i.install_date,
    expected_replacement: i.expected_replacement,
    estimated_value: i.estimated_value ? Number(i.estimated_value) : null,
  }));

  const forecast = calculateForecast(propertyInfo, items);

  // Chart data
  const chartData = forecast.yearlyTotals.map((yt) => ({
    year: yt.year.toString(),
    predicted: yt.predicted,
    baseline: yt.baseline,
  }));

  // Find spike years (replacement events)
  const spikeYears = forecast.events
    .filter((e) => e.cost >= 2000)
    .map((e) => ({
      year: e.year.toString(),
      cost: forecast.yearlyTotals.find((yt) => yt.year === e.year)?.predicted || 0,
      label: e.label,
    }));

  const confidenceLabel = forecast.confidence >= 80 ? "High" : forecast.confidence >= 50 ? "Moderate" : "Low";
  const confidenceColor = forecast.confidence >= 80 ? "text-sage" : forecast.confidence >= 50 ? "text-accent" : "text-muted-foreground";

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Your Savings Forecast
          </h3>
          <p className="font-body text-sm text-muted-foreground">
            Predicted future costs based on your home's age and tracked systems
          </p>
        </div>
        <Badge variant="outline" className={`font-body text-xs ${confidenceColor}`}>
          {confidenceLabel} Confidence
        </Badge>
      </div>

      {/* Top cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">Recommended Monthly Savings</p>
                <p className="font-display text-2xl font-bold">${forecast.recommendedMonthlySavings.toLocaleString()}<span className="font-body text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <TrendingUp className="h-5 w-5 text-sage" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">Annual Baseline</p>
                <p className="font-display text-2xl font-bold">${forecast.annualBaseline.toLocaleString()}<span className="font-body text-sm font-normal text-muted-foreground">/yr</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs text-muted-foreground mb-1.5">Forecast Confidence</p>
                <Progress value={forecast.confidence} className="h-2 mb-1" />
                <p className="font-body text-xs text-muted-foreground">{forecast.confidence}% — {forecast.personalizedCategories.size} system{forecast.personalizedCategories.size !== 1 ? "s" : ""} tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 10-year forecast chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold">10-Year Cost Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontFamily: "DM Sans", fontSize: 13 }}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  name === "predicted" ? "Predicted Cost" : "Baseline",
                ]}
              />
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--sage))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--sage))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="baseline" stroke="hsl(var(--sage))" fill="url(#baselineGradient)" strokeWidth={1.5} strokeDasharray="5 3" />
              <Area type="monotone" dataKey="predicted" stroke="hsl(var(--accent))" fill="url(#forecastGradient)" strokeWidth={2} />
              {spikeYears.map((spike, i) => (
                <ReferenceDot
                  key={i}
                  x={spike.year}
                  y={spike.cost}
                  r={5}
                  fill="hsl(var(--accent))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          {/* Upcoming major events legend */}
          {forecast.events.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {forecast.events.slice(0, 5).map((event, i) => (
                <Badge
                  key={i}
                  variant={event.isPersonalized ? "default" : "outline"}
                  className="font-body text-[10px] gap-1"
                >
                  {event.isPersonalized ? null : <AlertTriangle className="h-3 w-3" />}
                  {event.year}: {event.label} — ${event.cost.toLocaleString()}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions to improve accuracy */}
      {forecast.suggestedItems.length > 0 && (
        <Card className="border-border/50 bg-secondary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-accent" />
              <p className="font-display text-sm font-semibold">Improve Your Forecast</p>
            </div>
            <div className="space-y-2">
              {forecast.suggestedItems.map((item, i) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2.5 text-left hover:border-accent/50 transition-colors group"
                  onClick={() => {
                    if (item.label.includes("purchase price")) {
                      onNavigate?.("properties");
                    } else {
                      onNavigate?.("home-inventory");
                    }
                  }}
                >
                  <div>
                    <p className="font-body text-sm font-medium">{item.label}</p>
                    <p className="font-body text-xs text-muted-foreground">{item.impact}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SavingsForecast;
