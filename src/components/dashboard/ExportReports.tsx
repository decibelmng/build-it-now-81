import { useState } from "react";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, DollarSign, Home, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";

type Property = Tables<"properties">;

const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ExportReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedPropertyId: selectedProperty } = usePropertyFilter();
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  const exportMaintenanceHistory = async () => {
    setExporting("maintenance");
    try {
      let query = supabase
        .from("maintenance_logs")
        .select("*, properties(name)")
        .order("scheduled_date", { ascending: false, nullsFirst: false });

      if (selectedProperty) {
        query = query.eq("property_id", selectedProperty);
      }

      const { data, error } = await query;
      if (error) throw error;

      const headers = ["Service Date", "Property", "Title", "Category", "Status", "Cost", "Scheduled Date", "Completed Date", "Description"];
      const rows = (data || []).map((log: any) => [
        format(new Date(log.scheduled_date || log.completed_date || log.created_at), "yyyy-MM-dd"),
        log.properties?.name || "",
        log.title,
        log.category,
        log.status,
        log.cost ? `$${Number(log.cost).toFixed(2)}` : "",
        log.scheduled_date ? format(new Date(log.scheduled_date), "yyyy-MM-dd") : "",
        log.completed_date ? format(new Date(log.completed_date), "yyyy-MM-dd") : "",
        log.description || "",
      ]);

      downloadCSV(`maintenance-history-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
      toast({ title: "Maintenance history exported!" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportCostSummary = async () => {
    setExporting("cost");
    try {
      let query = supabase
        .from("maintenance_logs")
        .select("*, properties(name)")
        .not("cost", "is", null);

      if (selectedProperty) {
        query = query.eq("property_id", selectedProperty);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by category
      const categoryTotals = new Map<string, { count: number; total: number }>();
      const propertyTotals = new Map<string, { count: number; total: number }>();

      (data || []).forEach((log: any) => {
        const cost = Number(log.cost);
        const cat = log.category;
        const prop = log.properties?.name || "Unknown";

        const catEntry = categoryTotals.get(cat) || { count: 0, total: 0 };
        catEntry.count++;
        catEntry.total += cost;
        categoryTotals.set(cat, catEntry);

        const propEntry = propertyTotals.get(prop) || { count: 0, total: 0 };
        propEntry.count++;
        propEntry.total += cost;
        propertyTotals.set(prop, propEntry);
      });

      const headers = ["Group", "Type", "Tasks", "Total Cost", "Average Cost"];
      const rows: string[][] = [];

      categoryTotals.forEach((val, key) => {
        rows.push(["Category", key, val.count.toString(), `$${val.total.toFixed(2)}`, `$${(val.total / val.count).toFixed(2)}`]);
      });
      propertyTotals.forEach((val, key) => {
        rows.push(["Property", key, val.count.toString(), `$${val.total.toFixed(2)}`, `$${(val.total / val.count).toFixed(2)}`]);
      });

      downloadCSV(`cost-summary-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
      toast({ title: "Cost summary exported!" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportPropertyDetails = async () => {
    setExporting("property");
    try {
      const propsToExport = properties.filter((p) => p.id === selectedProperty);

      // Get contacts for these properties
      const propIds = propsToExport.map((p) => p.id);
      const { data: contacts } = await supabase
        .from("home_contacts")
        .select("*, properties(name)")
        .in("property_id", propIds);

      const { data: docs } = await supabase
        .from("documents")
        .select("*, properties(name)")
        .in("property_id", propIds);

      const headers = ["Type", "Property", "Name", "Detail 1", "Detail 2", "Detail 3"];
      const rows: string[][] = [];

      propsToExport.forEach((p) => {
        rows.push([
          "Property", getPropertyDisplayName(p), p.address,
          `${p.bedrooms || "?"} bed / ${p.bathrooms || "?"} bath`,
          `${p.sqft?.toLocaleString() || "?"} sqft`,
          p.year_built ? `Built ${p.year_built}` : "",
        ]);
      });

      (contacts || []).forEach((c: any) => {
        rows.push([
          "Contact", c.properties?.name || "", c.name,
          c.role, c.phone || "", c.email || "",
        ]);
      });

      (docs || []).forEach((d: any) => {
        rows.push([
          "Document", d.properties?.name || "", d.name,
          d.category, format(new Date(d.created_at), "yyyy-MM-dd"), "",
        ]);
      });

      downloadCSV(`property-details-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
      toast({ title: "Property details exported!" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const exportTaxPackage = async () => {
    setExporting("taxpkg");
    try {
      const year = new Date().getFullYear() - 1;
      const start = `${year}-01-01`;
      const end = `${year + 1}-01-01`;
      const targets = properties.filter((p) => p.id === selectedProperty);
      if (!targets.length) throw new Error("No properties to export");

      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const DEDUCTIBLE = new Set(["utilities","connectivity","services","energy","security"]);

      for (const p of targets) {
        const [paymentsRes, taxRes, improvementsRes] = await Promise.all([
          supabase
            .from("utility_payments")
            .select("amount, payment_month, property_utilities!inner(service_type, account_group, is_income)")
            .eq("property_id", p.id).gte("payment_month", start).lt("payment_month", end),
          supabase
            .from("property_tax_year").select("*")
            .eq("property_id", p.id).eq("tax_year", year).maybeSingle(),
          supabase
            .from("maintenance_logs").select("title, category, cost, completed_date")
            .eq("property_id", p.id).eq("expense_type", "capital_improvement")
            .gte("completed_date", start).lt("completed_date", end),
        ]);

        const payments = (paymentsRes.data ?? []) as any[];
        const tax = taxRes.data as any;
        const improvements = (improvementsRes.data ?? []) as any[];

        const cols = new Map<string, { group: string; monthly: number[]; total: number }>();
        let incomeTotal = 0;
        payments.forEach((pay: any) => {
          const svc = pay.property_utilities?.service_type;
          const grp = pay.property_utilities?.account_group ?? "other";
          const isIncome = pay.property_utilities?.is_income === true;
          const amt = Number(pay.amount) || 0;
          const m = new Date(pay.payment_month + "T00:00:00").getMonth();
          if (isIncome || grp === "income") { incomeTotal += amt; return; }
          if (!svc) return;
          if (!cols.has(svc)) cols.set(svc, { group: grp, monthly: new Array(12).fill(0), total: 0 });
          const c = cols.get(svc)!;
          c.monthly[m] += amt; c.total += amt;
        });
        const colEntries = Array.from(cols.entries()).sort(([a],[b]) => a.localeCompare(b));

        const sqft = p.sqft ?? 0;
        const officeSqft = (p as any).home_office_sqft ?? 0;
        const officePct = sqft > 0 && officeSqft > 0 ? (officeSqft / sqft) * 100 : null;

        const rows: (string | number)[][] = [];
        rows.push([`HomeLog Tax Package — ${getPropertyDisplayName(p)} — ${year}`]);
        rows.push(["Address", p.address ?? ""]);
        rows.push(["Total sqft", sqft || ""]);
        rows.push(["Home office sqft", officeSqft || ""]);
        rows.push(["Home office %", officePct != null ? `${officePct.toFixed(1)}%` : "—"]);
        rows.push([]);
        rows.push(["Monthly utilities & accounts"]);
        rows.push(["Month", ...colEntries.map(([svc]) => svc.replace(/_/g," "))]);
        for (let m = 0; m < 12; m++) {
          rows.push([MONTHS[m], ...colEntries.map(([, v]) => v.monthly[m].toFixed(2))]);
        }
        rows.push(["Annual Total", ...colEntries.map(([, v]) => v.total.toFixed(2))]);
        if (officePct != null) {
          rows.push([
            `Deductible at ${officePct.toFixed(1)}%`,
            ...colEntries.map(([, v]) => DEDUCTIBLE.has(v.group) ? ((v.total * officePct) / 100).toFixed(2) : ""),
          ]);
        }
        rows.push([]);
        rows.push(["Rental income received", incomeTotal.toFixed(2)]);
        rows.push([]);
        rows.push(["Form 1098 / Schedule A items"]);
        rows.push(["Mortgage interest", tax?.mortgage_interest ?? 0]);
        rows.push(["Real estate taxes", tax?.real_estate_taxes ?? 0]);
        rows.push(["Homeowners insurance", tax?.homeowners_insurance ?? 0]);
        if (tax?.notes) rows.push(["Notes", tax.notes]);
        rows.push([]);
        rows.push(["Capital improvements"]);
        rows.push(["Date","Title","Category","Cost"]);
        let impTotal = 0;
        improvements.forEach((i: any) => {
          impTotal += Number(i.cost) || 0;
          rows.push([i.completed_date ?? "", i.title ?? "", i.category ?? "", (Number(i.cost) || 0).toFixed(2)]);
        });
        rows.push(["","","Total", impTotal.toFixed(2)]);

        const escape = (val: any) => {
          const s = String(val ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
        };
        const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const slug = (p.name || "home").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        a.href = url; a.download = `homelog-tax-${slug}-${year}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: "Tax package exported!" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const printReport = () => {
    window.print();
  };

  const reports = [
    {
      id: "maintenance",
      title: "Maintenance History",
      description: "All maintenance logs with dates, costs, categories, and status",
      icon: FileText,
      action: exportMaintenanceHistory,
    },
    {
      id: "cost",
      title: "Cost Summary Report",
      description: "Aggregated spending by category and property",
      icon: DollarSign,
      action: exportCostSummary,
    },
    {
      id: "property",
      title: "Property Details",
      description: "Property info, contacts, and document listing",
      icon: Home,
      action: exportPropertyDetails,
    },
    {
      id: "taxpkg",
      title: "Tax Package (CSV)",
      description: `Full ${new Date().getFullYear() - 1} tax package: monthly utilities grid, deductibles, 1098 items, and improvements`,
      icon: Receipt,
      action: exportTaxPackage,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Export & Reports</h2>
          <p className="font-body text-sm text-muted-foreground">Download CSV reports for your records</p>
        </div>
      </div>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Download className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add properties and data to start exporting</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    <Icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="mb-1 font-display text-base font-semibold">{report.title}</h3>
                  <p className="mb-4 font-body text-xs text-muted-foreground">{report.description}</p>
                  <Button
                    onClick={report.action}
                    disabled={exporting === report.id}
                    className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exporting === report.id ? "Exporting..." : "Export CSV"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" className="rounded-full font-body" onClick={printReport}>
          Print Current Page as PDF
        </Button>
      </div>
    </div>
  );
};

export default ExportReports;
