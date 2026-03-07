import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface TaxReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmtCurrency = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$—";

const TaxReportDialog = ({ open, onOpenChange }: TaxReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("all");
  const [includeRepairs, setIncludeRepairs] = useState(true);
  const [includePurchase, setIncludePurchase] = useState(true);
  const [includeSale, setIncludeSale] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);

  // Derive available years from improvements
  const { data: allLogs = [] } = useQuery({
    queryKey: ["tax_report_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, home_contacts(name, company), properties(name, address)")
        .not("cost", "is", null)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("display_name").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const { data: docCounts = {} } = useQuery({
    queryKey: ["tax_doc_counts_report", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("maintenance_log_id")
        .not("maintenance_log_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d) => {
        if (d.maintenance_log_id) counts[d.maintenance_log_id] = (counts[d.maintenance_log_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user && open,
  });

  const years = Array.from(new Set(allLogs.map((l: any) => {
    const d = l.scheduled_date || l.completed_date || l.created_at;
    return d ? format(parseISO(d), "yyyy") : null;
  }).filter(Boolean) as string[])).sort().reverse();

  const filterByRange = (logs: any[]) => {
    if (dateRange === "all") return logs;
    return logs.filter((l: any) => {
      const d = l.scheduled_date || l.completed_date || l.created_at;
      return d && format(parseISO(d), "yyyy") === dateRange;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const improvements = filterByRange(allLogs.filter((l: any) => l.expense_type === "capital_improvement"));
      const repairs = includeRepairs ? filterByRange(allLogs.filter((l: any) => l.expense_type === "repair")) : [];

      if (exportFormat === "csv") {
        exportCSV(improvements, repairs);
      } else {
        exportPDF(improvements, repairs);
      }
      toast({ title: `${exportFormat.toUpperCase()} report generated!` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = (improvements: any[], repairs: any[]) => {
    const headers = ["Date", "Title", "Description", "Category", "Contractor", "Cost", "Expense Type", "Receipt Count", "Tax Notes"];
    const toRow = (l: any) => {
      const d = l.scheduled_date || l.completed_date || l.created_at;
      const contractor = l.home_contacts?.company || l.home_contacts?.name || "";
      const docCount = (docCounts as Record<string, number>)[l.id] || 0;
      return [
        d ? format(parseISO(d), "yyyy-MM-dd") : "",
        l.title,
        l.description || "",
        l.category,
        contractor,
        l.cost ? `$${Number(l.cost).toFixed(2)}` : "",
        l.expense_type || "",
        docCount.toString(),
        l.tax_notes || "",
      ];
    };

    const rows = [...improvements.map(toRow), ...repairs.map(toRow)];
    const escape = (val: string) => (val.includes(",") || val.includes('"') || val.includes("\n")) ? `"${val.replace(/"/g, '""')}"` : val;
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = (improvements: any[], repairs: any[]) => {
    // Generate a printable HTML document and open for printing
    const prop = properties[0];
    const ownerName = profile?.display_name || "Homeowner";
    const dateLabel = dateRange === "all" ? "All Time" : `Tax Year ${dateRange}`;

    const impTotal = improvements.reduce((s, l: any) => s + (Number(l.cost) || 0), 0);
    const repTotal = repairs.reduce((s, l: any) => s + (Number(l.cost) || 0), 0);

    const tableRows = (entries: any[]) => entries.map((l: any, i: number) => {
      const d = l.scheduled_date || l.completed_date || l.created_at;
      const contractor = l.home_contacts?.company || l.home_contacts?.name || "—";
      const docCount = (docCounts as Record<string, number>)[l.id] || 0;
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${d ? format(parseISO(d), "MM/dd/yyyy") : "—"}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${l.title}${l.description ? `<br><small style="color:#888">${l.description}</small>` : ""}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${l.category}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${contractor}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${fmtCurrency(Number(l.cost))}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${docCount > 0 ? docCount : "—"}</td>
      </tr>`;
    }).join("");

    const purchaseSection = includePurchase && prop ? `
      <h2 style="margin-top:24px">Property Summary</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:4px 8px"><strong>Address:</strong></td><td>${prop.address || "—"}</td></tr>
        <tr><td style="padding:4px 8px"><strong>Purchase Date:</strong></td><td>${prop.purchase_date ? format(parseISO(prop.purchase_date), "MM/dd/yyyy") : "Not provided"}</td></tr>
        <tr><td style="padding:4px 8px"><strong>Purchase Price:</strong></td><td>${prop.purchase_price ? fmtCurrency(Number(prop.purchase_price)) : "Not provided"}</td></tr>
        <tr><td style="padding:4px 8px"><strong>Closing Costs:</strong></td><td>${prop.purchase_closing_costs ? fmtCurrency(Number(prop.purchase_closing_costs)) : "—"}</td></tr>
        ${includeSale && prop.sale_price ? `
          <tr><td style="padding:4px 8px"><strong>Sale Date:</strong></td><td>${prop.sale_date ? format(parseISO(prop.sale_date), "MM/dd/yyyy") : "—"}</td></tr>
          <tr><td style="padding:4px 8px"><strong>Sale Price:</strong></td><td>${fmtCurrency(Number(prop.sale_price))}</td></tr>
        ` : ""}
      </table>
    ` : "";

    const repairSection = repairs.length > 0 ? `
      <h2 style="margin-top:24px">Repairs & Maintenance</h2>
      <p style="color:#888;font-size:12px;margin-bottom:8px">Generally not basis-eligible — included for complete records.</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px 8px;text-align:left">Date</th>
          <th style="padding:6px 8px;text-align:left">Description</th>
          <th style="padding:6px 8px;text-align:left">Category</th>
          <th style="padding:6px 8px;text-align:left">Contractor</th>
          <th style="padding:6px 8px;text-align:right">Cost</th>
          <th style="padding:6px 8px;text-align:center">Docs</th>
        </tr></thead>
        <tbody>${tableRows(repairs)}</tbody>
        <tfoot><tr style="font-weight:bold;border-top:2px solid #333">
          <td colspan="4" style="padding:6px 8px">Total</td>
          <td style="padding:6px 8px;text-align:right">${fmtCurrency(repTotal)}</td>
          <td></td>
        </tr></tfoot>
      </table>
    ` : "";

    const html = `<!DOCTYPE html><html><head><title>Tax Report</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #222; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table { font-size: 13px; }
        .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 10px; color: #999; }
        @media print { .footer { position: fixed; } }
      </style>
    </head><body>
      <h1>Home Investment & Capital Improvements Report</h1>
      <p style="color:#888;margin-bottom:4px">${prop?.address || "Property"} · ${dateLabel}</p>
      <p style="color:#888;margin-bottom:4px">Prepared for: ${ownerName}</p>
      <p style="color:#888;margin-bottom:16px">Generated by HomeLog · ${format(new Date(), "MMMM d, yyyy")}</p>

      ${purchaseSection}

      <h2 style="margin-top:24px">Capital Improvements</h2>
      ${improvements.length === 0 ? "<p>No capital improvements recorded.</p>" : `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:6px 8px;text-align:left">Date</th>
            <th style="padding:6px 8px;text-align:left">Description</th>
            <th style="padding:6px 8px;text-align:left">Category</th>
            <th style="padding:6px 8px;text-align:left">Contractor</th>
            <th style="padding:6px 8px;text-align:right">Cost</th>
            <th style="padding:6px 8px;text-align:center">Docs</th>
          </tr></thead>
          <tbody>${tableRows(improvements)}</tbody>
          <tfoot><tr style="font-weight:bold;border-top:2px solid #333">
            <td colspan="4" style="padding:6px 8px">Total</td>
            <td style="padding:6px 8px;text-align:right">${fmtCurrency(impTotal)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      `}

      ${repairSection}

      <div class="footer">
        Generated by HomeLog — homelogapp.com · This report is for informational purposes only and does not constitute tax advice.
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  const handleEmail = () => {
    const prop = properties[0];
    const subject = encodeURIComponent(`Home Investment Report - ${prop?.address || "Property"}`);
    const body = encodeURIComponent(`Attached is my Home Investment & Capital Improvements Report for ${prop?.address || "my property"}, generated by HomeLog.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Generate Tax Report</DialogTitle>
          <DialogDescription className="font-body text-xs">
            Export your capital improvements and cost basis data for tax preparation. This report is for informational purposes only and does not constitute tax advice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="font-body text-xs mb-1 block">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-sm font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All Time</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y} className="text-sm">Tax Year {y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-body text-xs">Include</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked disabled id="inc-imp" />
              <label htmlFor="inc-imp" className="font-body text-sm">Capital improvements</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={includeRepairs} onCheckedChange={(v) => setIncludeRepairs(v === true)} id="inc-rep" />
              <label htmlFor="inc-rep" className="font-body text-sm">Repairs & maintenance</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={includePurchase} onCheckedChange={(v) => setIncludePurchase(v === true)} id="inc-pur" />
              <label htmlFor="inc-pur" className="font-body text-sm">Property purchase details</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={includeSale} onCheckedChange={(v) => setIncludeSale(v === true)} id="inc-sale" />
              <label htmlFor="inc-sale" className="font-body text-sm">Property sale details</label>
            </div>
          </div>

          <div>
            <Label className="font-body text-xs mb-1 block">Format</Label>
            <div className="flex gap-2">
              <Button
                variant={exportFormat === "csv" ? "default" : "outline"}
                size="sm"
                className="font-body text-xs flex-1"
                onClick={() => setExportFormat("csv")}
              >
                CSV
              </Button>
              <Button
                variant={exportFormat === "pdf" ? "default" : "outline"}
                size="sm"
                className="font-body text-xs flex-1"
                onClick={() => setExportFormat("pdf")}
              >
                PDF (Print)
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" className="font-body text-xs" onClick={handleEmail}>
            <Mail className="h-3.5 w-3.5 mr-1" /> Email to Tax Preparer
          </Button>
          <Button
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Generating…" : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaxReportDialog;
