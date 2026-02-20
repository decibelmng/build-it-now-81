import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth, addMonths, isBefore, isAfter } from "date-fns";
import { CalendarDays, TrendingUp, PieChart as PieIcon, BarChart3, AlertCircle } from "lucide-react";

const COLORS = [
  "hsl(38, 92%, 50%)",   // accent
  "hsl(150, 20%, 45%)",  // sage
  "hsl(220, 25%, 14%)",  // navy
  "hsl(0, 84%, 60%)",    // destructive
  "hsl(200, 60%, 50%)",  // blue
  "hsl(280, 50%, 55%)",  // purple
  "hsl(160, 50%, 40%)",  // teal
];

const AnalyticsInsights = () => {
  const { user } = useAuth();

  const { data: logs = [] } = useQuery({
    queryKey: ["analytics_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["analytics_properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["analytics_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_templates")
        .select("*")
        .eq("active", true)
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Spending over time (last 12 months)
  const spendingByMonth = (() => {
    const now = new Date();
    const months: { month: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = addMonths(startOfMonth(now), -i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM");
      const total = logs
        .filter((l) => l.cost && l.completed_date && format(parseISO(l.completed_date), "yyyy-MM") === key)
        .reduce((sum, l) => sum + (l.cost || 0), 0);
      months.push({ month: label, total });
    }
    return months;
  })();

  // Category breakdown
  const categoryData = (() => {
    const map: Record<string, number> = {};
    logs.forEach((l) => {
      if (l.cost) map[l.category] = (map[l.category] || 0) + l.cost;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  // Property comparison
  const propertyComparison = properties.map((p) => {
    const total = logs
      .filter((l) => l.property_id === p.id && l.cost)
      .reduce((sum, l) => sum + (l.cost || 0), 0);
    return { name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name, total };
  });

  // Upcoming schedule (next 60 days)
  const now = new Date();
  const sixtyDaysOut = addMonths(now, 2);
  const upcomingTasks = [
    ...logs
      .filter((l) => l.scheduled_date && l.status !== "completed" && isAfter(parseISO(l.scheduled_date), now) && isBefore(parseISO(l.scheduled_date), sixtyDaysOut))
      .map((l) => ({ title: l.title, date: l.scheduled_date!, type: "scheduled" as const, category: l.category })),
    ...templates
      .filter((t) => isAfter(parseISO(t.next_due_date), now) && isBefore(parseISO(t.next_due_date), sixtyDaysOut))
      .map((t) => ({ title: t.title, date: t.next_due_date, type: "recurring" as const, category: t.category })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalSpend = logs.reduce((s, l) => s + (l.cost || 0), 0);

  const spendingConfig = { total: { label: "Spending", color: "hsl(38, 92%, 50%)" } };
  const comparisonConfig = { total: { label: "Total Cost", color: "hsl(150, 20%, 45%)" } };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Analytics & Insights</h2>
        <p className="text-sm text-muted-foreground">Track spending, compare properties, and stay ahead of maintenance</p>
      </div>

      {/* Summary stat */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-lg bg-accent/10 p-3">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Maintenance Spend</p>
            <p className="text-3xl font-bold">${totalSpend.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending over time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-accent" /> Spending Over Time
            </CardTitle>
            <CardDescription>Monthly maintenance costs (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={spendingConfig} className="h-[250px] w-full">
              <BarChart data={spendingByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieIcon className="h-4 w-4 text-accent" /> Category Breakdown
            </CardTitle>
            <CardDescription>Spending distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No cost data yet</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="font-medium">${c.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-sage" /> Property Comparison
            </CardTitle>
            <CardDescription>Side-by-side cost comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {propertyComparison.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Add properties to compare</p>
            ) : (
              <ChartContainer config={comparisonConfig} className="h-[250px] w-full">
                <BarChart data={propertyComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="hsl(150, 20%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Upcoming schedule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-accent" /> Upcoming Schedule
            </CardTitle>
            <CardDescription>Scheduled & recurring tasks (next 60 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No upcoming tasks</p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {upcomingTasks.map((t, i) => {
                  const daysUntil = Math.ceil((new Date(t.date).getTime() - now.getTime()) / 86400000);
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(t.date), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.type === "recurring" ? "outline" : "secondary"} className="text-xs">
                          {t.type}
                        </Badge>
                        {daysUntil <= 7 && (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsInsights;
