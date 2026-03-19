import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCostBasisSummary } from "@/hooks/useCostBasisSummary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, TrendingUp, ChevronDown, Paperclip, ArrowUpRight, Info, FileText } from "lucide-react";
import ValueAppreciationChart from "@/components/dashboard/ValueAppreciationChart";
import ImprovementROISection from "@/components/dashboard/ImprovementROISection";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import TaxReportDialog from "@/components/dashboard/TaxReportDialog";
import HomeValuationSection from "@/components/dashboard/HomeValuationSection";
import type { Tables } from "@/integrations/supabase/types";

const fmtCurrency = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$—";

const TaxInvestmentPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: summaries = [] } = useCostBasisSummary();
  const [repairsOpen, setRepairsOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "cost">("date");
  const [reportOpen, setReportOpen] = useState(false);

  // Fetch properties for valuation section
  const { data: allProperties = [] } = useQuery({
    queryKey: ["properties_for_tax", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data as Tables<"properties">[];
    },
    enabled: !!user,
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  // Aggregate across all properties
  const agg = useMemo(() => {
    if (!summaries.length) return null;
    return summaries.reduce(
      (acc, s) => ({
        purchasePrice: acc.purchasePrice + (s.purchase_price ?? 0),
        closingCosts: acc.closingCosts + (s.purchase_closing_costs ?? 0),
        improvements: acc.improvements + (s.total_improvements ?? 0),
        improvementCount: acc.improvementCount + (s.improvement_count ?? 0),
        adjustedBasis: acc.adjustedBasis + (s.adjusted_basis ?? 0),
        repairs: acc.repairs + (s.total_repairs ?? 0),
        repairCount: acc.repairCount + (s.repair_count ?? 0),
        salePrice: acc.salePrice + (s.sale_price ?? 0),
        saleClosing: acc.saleClosing + (s.sale_closing_costs ?? 0),
        agentComm: acc.agentComm + (s.agent_commissions ?? 0),
        estimatedGain: acc.estimatedGain + (s.estimated_gain ?? 0),
        hasPurchase: acc.hasPurchase || s.purchase_price != null,
        hasSale: acc.hasSale || s.sale_price != null,
      }),
      {
        purchasePrice: 0, closingCosts: 0, improvements: 0, improvementCount: 0,
        adjustedBasis: 0, repairs: 0, repairCount: 0, salePrice: 0,
        saleClosing: 0, agentComm: 0, estimatedGain: 0, hasPurchase: false, hasSale: false,
      }
    );
  }, [summaries]);

  // Fetch improvement entries
  const { data: improvementLogs = [] } = useQuery({
    queryKey: ["tax_improvements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, home_contacts(name, company), properties(name, address)")
        .eq("expense_type", "capital_improvement")
        .order("completed_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch repair entries
  const { data: repairLogs = [] } = useQuery({
    queryKey: ["tax_repairs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, home_contacts(name, company), properties(name, address)")
        .eq("expense_type", "repair")
        .not("cost", "is", null)
        .order("completed_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch document counts per maintenance_log_id
  const { data: docCounts = {} } = useQuery({
    queryKey: ["tax_doc_counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("maintenance_log_id")
        .not("maintenance_log_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d) => {
        if (d.maintenance_log_id) {
          counts[d.maintenance_log_id] = (counts[d.maintenance_log_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user,
  });

  // Derive available years and categories from improvement logs
  const years = useMemo(() => {
    const set = new Set<string>();
    improvementLogs.forEach((l: any) => {
      const d = l.completed_date || l.scheduled_date || l.created_at;
      if (d) set.add(format(parseISO(d), "yyyy"));
    });
    return Array.from(set).sort().reverse();
  }, [improvementLogs]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    improvementLogs.forEach((l: any) => set.add(l.category));
    return Array.from(set).sort();
  }, [improvementLogs]);

  // Filter + sort
  const filteredImprovements = useMemo(() => {
    let items = [...improvementLogs];
    if (yearFilter !== "all") {
      items = items.filter((l: any) => {
        const d = l.completed_date || l.scheduled_date || l.created_at;
        return d && format(parseISO(d), "yyyy") === yearFilter;
      });
    }
    if (categoryFilter !== "all") {
      items = items.filter((l: any) => l.category === categoryFilter);
    }
    items.sort((a: any, b: any) => {
      if (sortBy === "cost") return (Number(b.cost) || 0) - (Number(a.cost) || 0);
      const da = a.completed_date || a.scheduled_date || a.created_at;
      const db = b.completed_date || b.scheduled_date || b.created_at;
      return new Date(db).getTime() - new Date(da).getTime();
    });
    return items;
  }, [improvementLogs, yearFilter, categoryFilter, sortBy]);

  // Group by year for "By Year" tab
  const byYear = useMemo(() => {
    const groups: Record<string, { items: any[]; total: number }> = {};
    filteredImprovements.forEach((l: any) => {
      const d = l.completed_date || l.scheduled_date || l.created_at;
      const yr = d ? format(parseISO(d), "yyyy") : "Unknown";
      if (!groups[yr]) groups[yr] = { items: [], total: 0 };
      groups[yr].items.push(l);
      groups[yr].total += Number(l.cost) || 0;
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredImprovements]);

  const filteredTotal = filteredImprovements.reduce((s: number, l: any) => s + (Number(l.cost) || 0), 0);

  const reclassify = async (logId: string) => {
    const { error } = await supabase
      .from("maintenance_logs")
      .update({ expense_type: "capital_improvement" })
      .eq("id", logId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reclassified as capital improvement" });
      queryClient.invalidateQueries({ queryKey: ["tax_improvements"] });
      queryClient.invalidateQueries({ queryKey: ["tax_repairs"] });
      queryClient.invalidateQueries({ queryKey: ["cost_basis_summary"] });
    }
  };

  const EntryRow = ({ log, showReclassify = false }: { log: any; showReclassify?: boolean }) => {
    const d = log.completed_date || log.scheduled_date || log.created_at;
    const docCount = (docCounts as Record<string, number>)[log.id] || 0;
    const contractor = log.home_contacts?.company || log.home_contacts?.name || null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border/50 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body text-xs text-muted-foreground">{d ? format(parseISO(d), "MMM d, yyyy") : "—"}</span>
            <Badge variant="secondary" className="text-[10px] capitalize">{log.category}</Badge>
            {docCount > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
                <Paperclip className="h-3 w-3" /> {docCount}
              </span>
            )}
          </div>
          <p className="font-body text-sm font-medium truncate">{log.title}</p>
          {log.description && <p className="font-body text-xs text-muted-foreground truncate">{log.description}</p>}
          {contractor && <p className="font-body text-xs text-muted-foreground">Contractor: {contractor}</p>}
          {log.tax_notes && (
            <div className="mt-1 flex items-start gap-1 rounded bg-accent/5 p-1.5">
              <Info className="h-3 w-3 text-accent shrink-0 mt-0.5" />
              <p className="font-body text-[11px] text-muted-foreground">{log.tax_notes}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-display text-sm font-bold">{fmtCurrency(Number(log.cost))}</span>
          {showReclassify && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => reclassify(log.id)}>
              <ArrowUpRight className="h-3 w-3 mr-1" /> Reclassify
            </Button>
          )}
        </div>
      </div>
    );
  };

  const FilterBar = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={yearFilter} onValueChange={setYearFilter}>
        <SelectTrigger className="w-28 h-8 text-xs font-body"><SelectValue placeholder="Year" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Years</SelectItem>
          {years.map((y) => <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-32 h-8 text-xs font-body capitalize"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Categories</SelectItem>
          {categories.map((c) => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "cost")}>
        <SelectTrigger className="w-28 h-8 text-xs font-body"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="date" className="text-xs">By Date</SelectItem>
          <SelectItem value="cost" className="text-xs">By Cost</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Receipt className="h-7 w-7 text-accent shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-2xl font-bold">Home Investment & Tax Tracker</h2>
            <p className="font-body text-sm text-muted-foreground">Track capital improvements to reduce your capital gains tax when you sell.</p>
          </div>
        </div>
        <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body shrink-0" onClick={() => setReportOpen(true)}>
          <FileText className="h-4 w-4 mr-2" /> Generate Tax Report
        </Button>
      </div>

      {/* Home Value + Mortgage & Equity Section */}
      {allProperties.length > 0 && (
        <div className="mb-6">
          {allProperties.length > 1 && (
            <div className="mb-3">
              <Select value={selectedPropertyId || allProperties[0]?.id || ""} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-56 h-8 text-xs font-body"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {allProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <HomeValuationSection
            properties={allProperties}
            selectedPropertyId={selectedPropertyId || allProperties[0]?.id || ""}
          />
        </div>
      )}

      {/* Appreciation Chart */}
      {allProperties.length > 0 && (
        <div className="mb-6">
          <ValueAppreciationChart
            property={allProperties.find((p) => p.id === (selectedPropertyId || allProperties[0]?.id)) || allProperties[0]}
          />
        </div>
      )}

      {/* Improvement ROI Correlation */}
      {allProperties.length > 0 && (
        <div className="mb-6">
          <ImprovementROISection
            property={allProperties.find((p) => p.id === (selectedPropertyId || allProperties[0]?.id)) || allProperties[0]}
          />
        </div>
      )}

      {/* Summary Breakdown */}
      <Card className="mb-6 border-border/50">
        <CardContent className="p-5 font-mono text-sm">
          <div className="space-y-1">
            <Row label="Purchase Price" value={agg?.hasPurchase ? fmtCurrency(agg.purchasePrice) : "Not set"} />
            <Row label="+ Purchase Closing Costs" value={agg?.hasPurchase ? fmtCurrency(agg.closingCosts) : "$—"} />
            <Row label={`+ Capital Improvements (${agg?.improvementCount ?? 0})`} value={fmtCurrency(agg?.improvements)} />
            <div className="border-t border-border my-2" />
            <Row label="= Adjusted Cost Basis" value={fmtCurrency(agg?.adjustedBasis)} bold />
            <div className="h-3" />
            <Row label="Estimated Sale Price" value={agg?.hasSale ? fmtCurrency(agg.salePrice) : "$—"} />
            <Row label="- Sale Costs & Commissions" value={agg?.hasSale ? fmtCurrency(agg.saleClosing + agg.agentComm) : "$—"} />
            <Row label="- Adjusted Cost Basis" value={fmtCurrency(agg?.adjustedBasis)} />
            <div className="border-t border-border my-2" />
            <Row
              label="= Estimated Taxable Gain"
              value={agg?.hasSale ? fmtCurrency(agg.estimatedGain) : "Not yet calculated"}
              bold
              className={agg?.hasSale ? (agg.estimatedGain > 0 ? "text-destructive" : "text-sage") : ""}
            />
          </div>
          <p className="mt-4 font-body text-xs text-muted-foreground italic">
            Consult a tax professional for your specific situation. HomeLog provides documentation support, not tax advice.
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Total repairs & maintenance (not basis-eligible): {fmtCurrency(agg?.repairs)}
          </p>
        </CardContent>
      </Card>

      {/* Capital Improvements */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="font-body text-xs">All Improvements</TabsTrigger>
          <TabsTrigger value="by-year" className="font-body text-xs">By Year</TabsTrigger>
        </TabsList>

        <FilterBar />

        <TabsContent value="all">
          {filteredImprovements.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">No capital improvements recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredImprovements.map((l: any) => <EntryRow key={l.id} log={l} />)}
            </div>
          )}
          {filteredImprovements.length > 0 && (
            <div className="mt-3 text-right font-display text-sm font-bold">
              Total: {fmtCurrency(filteredTotal)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-year">
          {byYear.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">No capital improvements recorded yet.</p>
          ) : (
            <div className="space-y-6">
              {byYear.map(([year, group]) => (
                <div key={year}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display text-base font-bold">{year}</h4>
                    <span className="font-display text-sm font-semibold text-accent">{fmtCurrency(group.total)}</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((l: any) => <EntryRow key={l.id} log={l} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Repairs section */}
      <Collapsible open={repairsOpen} onOpenChange={setRepairsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 font-body text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <span>Repairs & Maintenance ({repairLogs.length} entries, {fmtCurrency(agg?.repairs)} total)</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${repairsOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <p className="font-body text-xs text-muted-foreground mb-3 italic">
            These entries maintain your home but generally do not qualify as capital improvements for tax purposes. However, keep records as some may qualify depending on your situation — consult your tax advisor.
          </p>
          {repairLogs.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-4">No repair entries found.</p>
          ) : (
            <div className="space-y-2">
              {repairLogs.map((l: any) => <EntryRow key={l.id} log={l} showReclassify />)}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <TaxReportDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
};

const Row = ({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) => (
  <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className ?? ""}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default TaxInvestmentPage;
