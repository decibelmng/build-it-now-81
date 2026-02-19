import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wrench, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";

const SavingsTracking = () => {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance_logs_savings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("cost, category, status, created_at, completed_date")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Stats
  const totalSpent = logs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const completedCount = logs.filter((l) => l.status === "completed").length;
  const pendingCount = logs.filter((l) => l.status !== "completed").length;
  const avgCost = logs.filter((l) => l.cost).length > 0
    ? totalSpent / logs.filter((l) => l.cost).length
    : 0;

  // Monthly spending chart data
  const monthlyMap = new Map<string, number>();
  logs.forEach((l) => {
    if (!l.cost) return;
    const month = format(startOfMonth(parseISO(l.created_at)), "yyyy-MM");
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

  // Spending by category
  const categoryMap = new Map<string, number>();
  logs.forEach((l) => {
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
        <p className="font-body text-sm text-muted-foreground">Track your maintenance costs over time</p>
      </div>

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
      ) : logs.length === 0 || totalSpent === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No cost data yet</h3>
            <p className="font-body text-sm text-muted-foreground">Add maintenance entries with costs to see spending trends</p>
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
