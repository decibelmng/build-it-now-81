import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Wrench, DollarSign, Clock, CheckCircle2, AlertTriangle, FileText, Users, TrendingUp, X, Shield, Sparkles, ArrowUpRight, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCostBasisAggregated } from "@/hooks/useCostBasisSummary";
import { usePropertyEquity } from "@/hooks/usePropertyEquity";
import QuickStartChecklist from "./QuickStartChecklist";
import QuickLogCard from "./QuickLogCard";
import WarrantyAlerts from "./WarrantyAlerts";
import ComponentBackfillCard from "./ComponentBackfillCard";
import RegistryMigrationCard from "./RegistryMigrationCard";
import PortfolioRollup from "./PortfolioRollup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DashboardOverview = ({ onNavigate }: { onNavigate?: (section: string) => void }) => {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance_logs_overview", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, status, cost, category, created_at, completed_date, scheduled_date, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Sort by service date (scheduled_date > completed_date > created_at)
      return (data ?? []).sort((a, b) => {
        const dateA = a.scheduled_date || a.completed_date || a.created_at;
        const dateB = b.scheduled_date || b.completed_date || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    },
    enabled: !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents_count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts_count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_contacts").select("id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalSpent = logs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const pendingCount = logs.filter((l) => l.status === "pending").length;
  const inProgressCount = logs.filter((l) => l.status === "in_progress").length;
  const completedCount = logs.filter((l) => l.status === "completed").length;
  const recentLogs = logs.slice(0, 5);

  const fmtCurrency = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const { data: equityData = [] } = usePropertyEquity();
  const { data: costBasis } = useCostBasisAggregated();

  const [dismissedBanner, setDismissedBanner] = useState(false);
  const hasCosts = totalSpent > 0;
  const hasPurchasePrice = costBasis?.hasPurchasePrice ?? false;
  const showOnboardingBanner = hasCosts && !hasPurchasePrice && !dismissedBanner;

  // Aggregate equity across all properties
  const totalValue = equityData.reduce((s, e) => s + (Number(e.current_estimated_value) || 0), 0);
  const totalEquity = equityData.reduce((s, e) => s + (Number(e.estimated_equity) || 0), 0);
  const totalAppreciation = equityData.reduce((s, e) => s + (Number(e.appreciation) || 0), 0);
  const totalPurchasePrice = equityData.reduce((s, e) => s + (Number(e.purchase_price) || 0), 0);
  const appreciationPct = totalPurchasePrice > 0 ? (totalAppreciation / totalPurchasePrice) * 100 : 0;
  const hasFinancialData = equityData.some(
    (e) => e.purchase_price != null || e.current_estimated_value != null
  );

  const financialCards = hasFinancialData
    ? [
        {
          label: "Home Value",
          value: totalValue > 0 ? fmtCurrency(totalValue) : "Add value",
          icon: Home,
          color: "text-accent",
        },
        {
          label: "Equity",
          value: totalEquity > 0 ? fmtCurrency(totalEquity) : fmtCurrency(totalValue),
          icon: TrendingUp,
          color: "text-sage",
        },
        {
          label: "Appreciation",
          value: totalAppreciation !== 0
            ? `${totalAppreciation > 0 ? "+" : ""}${fmtCurrency(totalAppreciation)}`
            : "$0",
          subValue: totalPurchasePrice > 0
            ? `(${appreciationPct > 0 ? "+" : ""}${appreciationPct.toFixed(1)}%)`
            : undefined,
          icon: ArrowUpRight,
          color: totalAppreciation >= 0 ? "text-sage" : "text-destructive",
        },
        {
          label: "Cost Basis",
          value: costBasis?.totalAdjustedBasis ? fmtCurrency(costBasis.totalAdjustedBasis) : "$0",
          icon: Receipt,
          color: "text-accent",
        },
        {
          label: "Pending Tasks",
          value: (pendingCount + inProgressCount).toString(),
          icon: Clock,
          color: "text-destructive",
        },
        {
          label: "Monthly Savings",
          value: "—",
          icon: Shield,
          color: "text-accent",
        },
      ]
    : null;

  const defaultCards = [
    { label: "Properties", value: properties.length.toString(), icon: Home, color: "text-accent" },
    { label: "Total Spent", value: fmtCurrency(totalSpent), icon: DollarSign, color: "text-accent" },
    { label: "Pending Tasks", value: (pendingCount + inProgressCount).toString(), icon: Clock, color: "text-destructive" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle2, color: "text-sage" },
    { label: "Documents", value: documents.length.toString(), icon: FileText, color: "text-muted-foreground" },
    { label: "Contacts", value: contacts.length.toString(), icon: Users, color: "text-muted-foreground" },
  ];

  const statCards = financialCards || defaultCards;

  const statusIcon: Record<string, React.ElementType> = {
    pending: Clock,
    in_progress: AlertTriangle,
    completed: CheckCircle2,
  };

  const statusColor: Record<string, string> = {
    pending: "text-muted-foreground",
    in_progress: "text-amber-500",
    completed: "text-sage",
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <p className="font-body text-sm text-muted-foreground">Your home management at a glance</p>
      </div>

      {/* Quick Start Checklist */}
      <QuickStartChecklist onNavigate={(s) => onNavigate?.(s)} />

      {/* Onboarding banner — missing purchase price */}
      {showOnboardingBanner && (
        <div className="mb-6 relative flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-body text-sm">
              You've logged <strong>{fmtCurrency(totalSpent)}</strong> in home expenses. Add your purchase price to start tracking your adjusted cost basis — this could save you thousands on capital gains tax when you sell.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 rounded-full font-body text-xs"
              onClick={() => onNavigate?.("properties")}
            >
              Add Purchase Price
            </Button>
          </div>
          <button onClick={() => setDismissedBanner(true)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Investment Tracker Card */}
      <Card className="mb-8 border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h3 className="font-display text-base font-semibold">Your Home Investment</h3>
          </div>
          {hasPurchasePrice ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="font-body text-xs text-muted-foreground">Purchase Price</p>
                  <p className="font-display text-lg font-bold">{fmtCurrency(costBasis!.totalPurchasePrice)}</p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Total Improvements</p>
                  <p className="font-display text-lg font-bold text-sage">{fmtCurrency(costBasis!.totalImprovements)}</p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Adjusted Cost Basis</p>
                  <p className="font-display text-xl font-bold text-accent">{fmtCurrency(costBasis!.totalAdjustedBasis)}</p>
                </div>
              </div>
              <p className="font-body text-xs text-muted-foreground">
                {costBasis!.improvementCount} capital improvement{costBasis!.improvementCount !== 1 ? "s" : ""} totaling {fmtCurrency(costBasis!.totalImprovements)}
                {costBasis!.earliestPurchaseDate ? ` since ${format(parseISO(costBasis!.earliestPurchaseDate), "MMM yyyy")}` : ""}
              </p>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="font-body text-sm text-muted-foreground mb-3">
                Track your home investment to save on taxes when you sell. Homeowners save an average of $5,000–$15,000 by properly documenting capital improvements.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-body"
                onClick={() => onNavigate?.("properties")}
              >
                Get Started
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
                <p className={`font-display text-lg font-bold ${stat.color}`}>
                  {stat.value}
                  {"subValue" in stat && (stat as any).subValue && (
                    <span className="text-sm font-normal ml-1">{(stat as any).subValue}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Registry Migration Card */}
      {properties[0]?.id && <RegistryMigrationCard propertyId={properties[0].id} bathroomCount={(properties[0] as any).bathrooms || undefined} onNavigate={(s) => onNavigate?.(s)} />}

      {/* Component Backfill Card */}
      <ComponentBackfillCard propertyId={properties[0]?.id} onNavigate={(s) => onNavigate?.(s)} />

      {/* Quick Log */}
      <QuickLogCard />

      {/* Warranty Alerts */}
      <WarrantyAlerts onNavigate={(s) => onNavigate?.(s)} />

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Recent Activity</h3>
          {recentLogs.length === 0 ? (
            <div className="py-8 text-center">
              <Wrench className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <h4 className="font-display text-base font-semibold mb-1">Your maintenance timeline starts here</h4>
              <p className="font-body text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Log your first repair, service call, or improvement to start building your home's history.
              </p>
              <Button
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
                onClick={() => onNavigate?.("maintenance")}
              >
                <Wrench className="mr-2 h-4 w-4" /> Log First Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log: any) => {
                const StatusIcon = statusIcon[log.status] ?? Clock;
                const sColor = statusColor[log.status] ?? "text-muted-foreground";
                return (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <StatusIcon className={`h-4 w-4 shrink-0 ${sColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium truncate">{log.title}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {log.properties?.name && <span>{log.properties.name} · </span>}
                        {format(parseISO(log.created_at), "MMM d, yyyy")}
                        {log.cost ? ` · $${Number(log.cost).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <span className={`font-body text-xs font-medium capitalize ${sColor}`}>
                      {log.status?.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
