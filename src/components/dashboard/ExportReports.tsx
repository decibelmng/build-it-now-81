import { useState } from "react";
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
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
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

      if (selectedProperty !== "all") {
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

      if (selectedProperty !== "all") {
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
      const propsToExport = selectedProperty === "all" ? properties : properties.filter((p) => p.id === selectedProperty);

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
          "Property", p.name, p.address,
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
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Export & Reports</h2>
          <p className="font-body text-sm text-muted-foreground">Download CSV reports for your records</p>
        </div>
        {properties.length > 1 && (
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48 font-body">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-body">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Download className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add properties and data to start exporting</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
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
