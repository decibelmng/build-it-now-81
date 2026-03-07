import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DollarSign, TrendingUp, Wrench, CheckCircle2,
  Droplets, Zap, Wind, Hammer, TreePine, Cog, Gem, Package, PlugZap,
} from "lucide-react";
import { useCostBasisAggregated } from "@/hooks/useCostBasisSummary";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import SavingsForecast from "./SavingsForecast";

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  plumbing: { label: "Plumbing", icon: Droplets },
  electrical: { label: "Electrical", icon: Zap },
  hvac: { label: "HVAC", icon: Wind },
  roofing: { label: "Roofing", icon: Hammer },
  landscaping: { label: "Landscaping", icon: TreePine },
  appliance: { label: "Appliance", icon: Cog },
  personal: { label: "Personal", icon: Gem },
  structural: { label: "Structural", icon: Package },
  exterior: { label: "Exterior", icon: Package },
  utility: { label: "Utility", icon: PlugZap },
  general: { label: "General", icon: Wrench },
};

const SavingsTracking = ({ onNavigate }: { onNavigate?: (section: string) => void }) => {
  const { user } = useAuth();
  const { data: costBasis } = useCostBasisAggregated();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance_logs_savings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("cost, category, status, created_at, completed_date, scheduled_date")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Discover all categories present in data
  const allCategories = Array.from(new Set(logs.map((l) => l.category)));
  const [enabledCategories, setEnabledCategories] = useState<Set<string> | null>(null);

  // Initialize on first data load
  const activeCategories = enabledCategories ?? new Set(allCategories);

  const toggleCategory = (cat: string) => {
    setEnabledCategories((prev) => {
      const base = prev ?? new Set(allCategories);
      const next = new Set(base);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Filter logs by enabled categories
  const filtered = logs.filter((l) => activeCategories.has(l.category));

  // Stats
  const totalSpent = filtered.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const completedCount = filtered.filter((l) => l.status === "completed").length;
  const pendingCount = filtered.filter((l) => l.status !== "completed").length;
  const avgCost = filtered.filter((l) => l.cost).length > 0
    ? totalSpent / filtered.filter((l) => l.cost).length
    : 0;

  // Monthly spending chart data
  const monthlyMap = new Map<string, number>();
  filtered.forEach((l) => {
    if (!l.cost) return;
    // Use the actual service date: completed_date > scheduled_date > created_at
    const dateStr = l.completed_date || l.scheduled_date || l.created_at;
    const month = format(startOfMonth(parseISO(dateStr)), "yyyy-MM");
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(l.cost));
  });
  const monthlyData = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: format(parseISO(month + "-01"), "MMM yyyy"),
      total: Number(total.toFixed(2)),
    }));

  // Cumulative spending
  let cumulative = 0;
  const cumulativeData = monthlyData.map((d) => {
    cumulative += d.total;
    return { month: d.month, cumulative: Number(cumulative.toFixed(2)) };
  });

  // Spending by category (only enabled)
  const categoryMap = new Map<string, number>();
  filtered.forEach((l) => {
    if (!l.cost) return;
    categoryMap.set(l.category, (categoryMap.get(l.category) || 0) + Number(l.cost));
  });
  const categoryData = Array.from(categoryMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([category, total]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      total: Number(total.toFixed(2)),
    }));

  const statCards = [
    { label: "Total Spent", value: `$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-accent" },
    { label: "Avg per Task", value: `$${avgCost.toFixed(2)}`, icon: TrendingUp, color: "text-sage" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle2, color: "text-sage" },
    { label: "Pending", value: pendingCount.toString(), icon: Wrench, color: "text-muted-foreground" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Savings & Spending</h2>
        <p className="font-body text-sm text-muted-foreground">Forecast future costs and track your maintenance spending</p>
      </div>

      {/* Predictive Forecast Section */}
      <SavingsForecast onNavigate={onNavigate} />

      {/* Cost basis callout */}
      {costBasis && costBasis.totalImprovements > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-sage/30 bg-sage/5 px-4 py-3">
          <TrendingUp className="h-4 w-4 text-sage shrink-0 mt-0.5" />
          <p className="font-body text-sm text-muted-foreground">
            Of your total spending, <strong className="text-foreground">${costBasis.totalImprovements.toLocaleString()}</strong> qualifies as capital improvements that increase your cost basis.
          </p>
        </div>
      )}

      {/* Category Toggles */}
      {allCategories.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {allCategories.map((cat) => {
            const cfg = categoryConfig[cat] ?? { label: cat.charAt(0).toUpperCase() + cat.slice(1), icon: Wrench };
            const Icon = cfg.icon;
            const active = activeCategories.has(cat);
            return (
              <div key={cat} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`savings-${cat}`} className="font-body text-xs font-medium cursor-pointer">{cfg.label}</Label>
                </div>
                <Switch
                  id={`savings-${cat}`}
                  checked={active}
                  onCheckedChange={() => toggleCategory(cat)}
                  className="scale-75"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-display text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardContent className="p-6"><div className="h-56 rounded-lg bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 || totalSpent === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-1 font-display text-lg font-semibold">Your financial picture starts with data</h3>
            <p className="font-body text-sm text-muted-foreground text-center max-w-md mb-4">
              Add maintenance entries with costs to see spending trends and savings forecasts.
            </p>
            <Button
              variant="outline"
              className="rounded-full font-body"
              onClick={() => onNavigate?.("maintenance")}
            >
              <Wrench className="mr-2 h-4 w-4" /> Go to Maintenance
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Spending */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold">Monthly Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontFamily: "DM Sans", fontSize: 13 }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cumulative Spending */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold">Cumulative Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontFamily: "DM Sans", fontSize: 13 }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                  />
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--accent))" fill="url(#colorCumulative)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Spending by Category */}
          {categoryData.length > 0 && (
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base font-semibold">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fontFamily: "DM Sans" }} stroke="hsl(var(--muted-foreground))" width={90} />
                    <Tooltip
                      contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontFamily: "DM Sans", fontSize: 13 }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--sage))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SavingsTracking;
