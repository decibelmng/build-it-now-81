import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Home as HomeIcon, FileText, CalendarPlus, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import TaxBackfillDialog from "./TaxBackfillDialog";
import { useNavigate } from "react-router-dom";

type Property = Tables<"properties">;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n: number | null | undefined) =>
  n != null && !Number.isNaN(n)
    ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const prettyService = (s: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DEDUCTIBLE_GROUPS = new Set(["utilities", "connectivity", "services", "energy", "security"]);
const EXCLUDED_GROUPS = new Set(["financial", "insurance", "income"]);

const downloadCSV = (filename: string, rows: (string | number)[][]) => {
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Read HSL CSS variable and convert to hex for jsPDF
const readHslVarAsHex = (name: string, fallback: [number, number, number]): [number, number, number] => {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const parts = raw.split(/\s+/);
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if ([h, s, l].some(Number.isNaN)) return fallback;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  } catch {
    return fallback;
  }
};

interface Props {
  property: Property;
}

const TaxPackageSection = ({ property }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState<number>(currentYear - 1);
  const [officeSqft, setOfficeSqft] = useState<string>(
    property.home_office_sqft != null ? String(property.home_office_sqft) : ""
  );
  const [backfillOpen, setBackfillOpen] = useState(false);

  useEffect(() => {
    setOfficeSqft(property.home_office_sqft != null ? String(property.home_office_sqft) : "");
  }, [property.id, property.home_office_sqft]);

  // Payments for this property + year
  const { data: payments = [] } = useQuery({
    queryKey: ["tax_payments", property.id, taxYear],
    queryFn: async () => {
      const start = `${taxYear}-01-01`;
      const end = `${taxYear + 1}-01-01`;
      const { data, error } = await supabase
        .from("utility_payments")
        .select("amount, payment_month, utility_id, property_utilities!inner(service_type, account_group, is_income, provider_name)")
        .eq("property_id", property.id)
        .gte("payment_month", start)
        .lt("payment_month", end);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!property.id,
  });

  // All accounts on property matching status logic for the year
  const { data: accounts = [] } = useQuery({
    queryKey: ["tax_pkg_accounts", property.id, taxYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_utilities")
        .select("id, provider_name, service_type, account_group, is_income, status, status_date")
        .eq("property_id", property.id);
      if (error) throw error;
      const yearStart = `${taxYear}-01-01`;
      return (data ?? []).filter((a: any) => {
        const status = a.status || "active";
        if (status === "active") return true;
        if (["cancelled", "transferred", "paid_off"].includes(status)) {
          return a.status_date && a.status_date >= yearStart;
        }
        return true;
      }) as any[];
    },
    enabled: !!user && !!property.id,
  });

  // Tax year record
  const { data: taxRecord } = useQuery({
    queryKey: ["property_tax_year", property.id, taxYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tax_year")
        .select("*")
        .eq("property_id", property.id)
        .eq("tax_year", taxYear)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!property.id,
  });

  // Improvements for CSV/PDF
  const { data: improvements = [] } = useQuery({
    queryKey: ["tax_pkg_improvements", property.id, taxYear],
    queryFn: async () => {
      const start = `${taxYear}-01-01`;
      const end = `${taxYear + 1}-01-01`;
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("title, category, cost, completed_date")
        .eq("property_id", property.id)
        .eq("expense_type", "capital_improvement")
        .gte("completed_date", start)
        .lt("completed_date", end);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!property.id,
  });

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (let y = currentYear; y >= currentYear - 6; y--) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [currentYear]);

  // Build expense grid using ALL matching accounts (even zero-total)
  const grid = useMemo(() => {
    const expenseAccounts = accounts.filter((a: any) => !a.is_income);
    const cols = expenseAccounts.map((a: any) => ({
      id: a.id,
      service_type: a.service_type,
      provider_name: a.provider_name,
      group: a.account_group || "other",
      monthly: new Array(12).fill(0) as number[],
      total: 0,
    }));
    const byId = new Map(cols.map((c) => [c.id, c]));

    let incomeTotal = 0;
    const incomeByMonth = new Array(12).fill(0);

    payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      const m = new Date(p.payment_month + "T00:00:00").getMonth();
      const isIncome = p.property_utilities?.is_income === true;
      if (isIncome) {
        incomeTotal += amt;
        incomeByMonth[m] += amt;
        return;
      }
      const col = byId.get(p.utility_id);
      if (!col) return;
      col.monthly[m] += amt;
      col.total += amt;
    });

    // sort by provider name for stable output
    cols.sort((a, b) => (a.provider_name || a.service_type).localeCompare(b.provider_name || b.service_type));
    return { cols, incomeTotal, incomeByMonth };
  }, [payments, accounts]);

  const hasAnyPayments = payments.length > 0;

  const sqft = property.sqft ?? 0;
  const officeSqftNum = Number(officeSqft) || 0;
  const officePct = sqft > 0 && officeSqftNum > 0 ? (officeSqftNum / sqft) * 100 : null;

  const persistOfficeSqft = async () => {
    const val = officeSqft === "" ? null : Number(officeSqft);
    if (val != null && (Number.isNaN(val) || val < 0)) return;
    if ((val ?? null) === (property.home_office_sqft ?? null)) return;
    const { error } = await supabase
      .from("properties")
      .update({ home_office_sqft: val })
      .eq("id", property.id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Home office saved" });
      qc.invalidateQueries({ queryKey: ["properties_for_tax"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    }
  };

  const [mortInt, setMortInt] = useState<string>("");
  const [realTax, setRealTax] = useState<string>("");
  const [homeIns, setHomeIns] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    setMortInt(taxRecord?.mortgage_interest != null ? String(taxRecord.mortgage_interest) : "");
    setRealTax(taxRecord?.real_estate_taxes != null ? String(taxRecord.real_estate_taxes) : "");
    setHomeIns(taxRecord?.homeowners_insurance != null ? String(taxRecord.homeowners_insurance) : "");
    setNotes(taxRecord?.notes ?? "");
  }, [taxRecord?.id, property.id, taxYear]);

  const propertyTaxFromPayments = useMemo(() => {
    return payments
      .filter((p: any) => p.property_utilities?.service_type === "property_tax")
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  }, [payments]);

  const insuranceFromPayments = useMemo(() => {
    return payments
      .filter((p: any) => p.property_utilities?.service_type === "homeowners_insurance")
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  }, [payments]);

  const saveTaxRecord = async (patch: Partial<Tables<"property_tax_year">>) => {
    if (!user) return;
    const payload = {
      property_id: property.id,
      user_id: user.id,
      tax_year: taxYear,
      mortgage_interest: mortInt === "" ? null : Number(mortInt),
      real_estate_taxes: realTax === "" ? null : Number(realTax),
      homeowners_insurance: homeIns === "" ? null : Number(homeIns),
      notes: notes || null,
      ...patch,
    };
    const { error } = await supabase
      .from("property_tax_year")
      .upsert(payload, { onConflict: "property_id,tax_year" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["property_tax_year", property.id, taxYear] });
    }
  };

  const propSlug = (property.name || "home").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const generatedOn = new Date().toLocaleString();

  const exportTaxPackageCSV = () => {
    const rows: (string | number)[][] = [];
    rows.push([`HomeLog Tax Package — ${property.name} — ${taxYear}`]);
    rows.push([`Property`, property.name ?? ""]);
    rows.push([`Address`, property.address ?? ""]);
    rows.push([`Generated`, generatedOn]);
    rows.push([`Total sqft`, property.sqft ?? ""]);
    rows.push([`Home office sqft`, property.home_office_sqft ?? ""]);
    rows.push([`Home office %`, officePct != null ? `${officePct.toFixed(1)}%` : "—"]);
    rows.push([]);

    rows.push(["Monthly utilities & accounts"]);
    const header = ["Month", ...grid.cols.map((c) => `${c.provider_name || prettyService(c.service_type)} (${prettyService(c.service_type)})`)];
    rows.push(header);

    if (!hasAnyPayments) {
      rows.push([`No payments logged for ${taxYear} — use Log a full year to backfill`]);
    }

    for (let m = 0; m < 12; m++) {
      rows.push([MONTHS[m], ...grid.cols.map((c) => c.monthly[m].toFixed(2))]);
    }
    rows.push(["Annual Total", ...grid.cols.map((c) => c.total.toFixed(2))]);
    if (officePct != null) {
      rows.push([
        `Deductible at ${officePct.toFixed(1)}%`,
        ...grid.cols.map((c) =>
          DEDUCTIBLE_GROUPS.has(c.group) && !EXCLUDED_GROUPS.has(c.group)
            ? ((c.total * officePct) / 100).toFixed(2)
            : ""
        ),
      ]);
    }
    rows.push([]);
    rows.push(["Rental income received", grid.incomeTotal.toFixed(2)]);
    rows.push([]);

    rows.push(["Form 1098 / Schedule A items"]);
    rows.push(["Mortgage interest", mortInt || "0"]);
    rows.push(["Real estate taxes", realTax || "0"]);
    rows.push(["Homeowners insurance", homeIns || "0"]);
    if (notes) rows.push(["Notes", notes]);
    rows.push([]);

    rows.push(["Capital improvements"]);
    rows.push(["Date", "Title", "Category", "Cost"]);
    let improvementTotal = 0;
    improvements.forEach((i: any) => {
      improvementTotal += Number(i.cost) || 0;
      rows.push([i.completed_date ?? "", i.title ?? "", i.category ?? "", (Number(i.cost) || 0).toFixed(2)]);
    });
    rows.push(["", "", "Total", improvementTotal.toFixed(2)]);

    downloadCSV(`homelog-tax-${propSlug}-${taxYear}.csv`, rows);
    toast({ title: "Tax package exported" });
  };

  const exportTaxPackagePDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const primary = readHslVarAsHex("--primary", [36, 45, 65]);
    const accent = readHslVarAsHex("--accent", [245, 158, 11]);
    const muted = readHslVarAsHex("--muted", [235, 233, 225]);

    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header band
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("HomeLog", 40, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Annual Tax Package", 40, 54);
    doc.setFontSize(10);
    doc.text(`${property.name ?? ""}${property.address ? "  ·  " + property.address : ""}`, 40, 70);
    doc.text(`Tax Year ${taxYear}  ·  Generated ${generatedOn}`, 40, 84);

    let y = 118;
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Property Summary", 40, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 10 },
      body: [
        ["Total sqft", sqft > 0 ? sqft.toLocaleString() : "—"],
        ["Home office sqft", property.home_office_sqft != null ? String(property.home_office_sqft) : "—"],
        ["Home office %", officePct != null ? `${officePct.toFixed(1)}%` : "—"],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    // Monthly grid
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Monthly Utilities & Accounts — ${taxYear}`, 40, y);
    y += 6;

    const gridHead = [["Month", ...grid.cols.map((c) => `${c.provider_name || prettyService(c.service_type)}\n${prettyService(c.service_type)}`)]];
    const gridBody: any[] = [];
    if (!hasAnyPayments) {
      gridBody.push([
        {
          content: `No payments logged for ${taxYear} — use Log a full year to backfill.`,
          colSpan: 1 + grid.cols.length,
          styles: { fontStyle: "italic", textColor: [120, 120, 120] },
        },
      ]);
    }
    for (let m = 0; m < 12; m++) {
      gridBody.push([MONTHS[m], ...grid.cols.map((c) => (c.monthly[m] > 0 ? c.monthly[m].toFixed(2) : "—"))]);
    }
    const totalRow: any[] = [{ content: "Annual Total", styles: { fontStyle: "bold" } }];
    grid.cols.forEach((c) => totalRow.push({ content: c.total.toFixed(2), styles: { fontStyle: "bold" } }));
    gridBody.push(totalRow);
    if (officePct != null) {
      const dedRow: any[] = [{ content: `Deductible at ${officePct.toFixed(1)}%`, styles: { fillColor: [accent[0], accent[1], accent[2]], textColor: [30, 30, 30] } }];
      grid.cols.forEach((c) => {
        const val = DEDUCTIBLE_GROUPS.has(c.group) && !EXCLUDED_GROUPS.has(c.group)
          ? ((c.total * officePct) / 100).toFixed(2)
          : "—";
        dedRow.push({ content: val, styles: { fillColor: [accent[0], accent[1], accent[2]], textColor: [30, 30, 30] } });
      });
      gridBody.push(dedRow);
    }
    autoTable(doc, {
      startY: y,
      head: gridHead,
      body: gridBody,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
      alternateRowStyles: { fillColor: [muted[0], muted[1], muted[2]] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    // Income + 1098
    if (y > pageH - 200) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rental Income & Form 1098 / Schedule A", 40, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255] },
      head: [["Item", "Amount"]],
      body: [
        ["Rental income received", `$${grid.incomeTotal.toFixed(2)}`],
        ["Mortgage interest", `$${Number(mortInt || 0).toFixed(2)}`],
        ["Real estate taxes", `$${Number(realTax || 0).toFixed(2)}`],
        ["Homeowners insurance", `$${Number(homeIns || 0).toFixed(2)}`],
        ...(notes ? [["Notes", notes]] : []),
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 20;

    // Capital improvements
    if (y > pageH - 160) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Capital Improvements", 40, y);
    y += 6;
    let improvementTotal = 0;
    const impRows = improvements.map((i: any) => {
      const cost = Number(i.cost) || 0;
      improvementTotal += cost;
      return [i.completed_date ?? "", i.title ?? "", i.category ?? "", `$${cost.toFixed(2)}`];
    });
    autoTable(doc, {
      startY: y,
      head: [["Date", "Title", "Category", "Cost"]],
      body: impRows.length ? impRows : [[{ content: "No capital improvements logged.", colSpan: 4, styles: { fontStyle: "italic", textColor: [120, 120, 120] } }]],
      foot: [[
        { content: "Total", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
        { content: `$${improvementTotal.toFixed(2)}`, styles: { fontStyle: "bold" } },
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255] },
      footStyles: { fillColor: [muted[0], muted[1], muted[2]], textColor: [30, 30, 30] },
    });

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const footer1 = "Prepared with HomeLog — homelogapp.com · Informational only, not tax advice. Consult a tax professional.";
      doc.text(footer1, pageW / 2, pageH - 24, { align: "center" });
      doc.text(`Page ${p} of ${pageCount}`, pageW - 40, pageH - 12, { align: "right" });
    }

    doc.save(`homelog-tax-${propSlug}-${taxYear}.pdf`);
    toast({ title: "Tax package PDF ready" });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold">Annual Tax Package</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(taxYear)} onValueChange={(v) => setTaxYear(Number(v))}>
                <SelectTrigger className="w-28 h-9 text-xs font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setBackfillOpen(true)}
                className="rounded-full font-body h-9"
              >
                <CalendarPlus className="h-4 w-4 mr-2" /> Log a full year
              </Button>
              <Button
                onClick={exportTaxPackageCSV}
                variant="outline"
                className="rounded-full font-body h-9"
              >
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
              <Button
                onClick={exportTaxPackagePDF}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body h-9"
              >
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </div>

          {/* Home Office */}
          <div className="rounded-lg border border-border/50 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <HomeIcon className="h-4 w-4 text-accent" />
              <h4 className="font-display text-sm font-semibold">Home Office</h4>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <Label className="font-body text-xs text-muted-foreground">Home office square footage</Label>
                <Input
                  type="number"
                  min={0}
                  value={officeSqft}
                  onChange={(e) => setOfficeSqft(e.target.value)}
                  onBlur={persistOfficeSqft}
                  placeholder="e.g. 150"
                  className="mt-1 h-9 font-body"
                />
              </div>
              <div className="flex-1">
                <Label className="font-body text-xs text-muted-foreground">Total home sqft</Label>
                <p className="mt-1 font-body text-sm">{sqft > 0 ? sqft.toLocaleString() : "— (set on My Home)"}</p>
              </div>
              <div className="flex-1">
                <Label className="font-body text-xs text-muted-foreground">Percentage</Label>
                <p className="mt-1 font-display text-base font-bold text-accent">
                  {officePct != null ? `Office is ${officePct.toFixed(1)}% of your home` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Utilities Grid or Empty State */}
          {!hasAnyPayments ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 mb-4 text-center bg-muted/20">
              <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h4 className="font-display text-base font-semibold mb-1">Nothing logged for {taxYear} yet</h4>
              <p className="font-body text-xs text-muted-foreground mb-4">
                Backfill your accounts for the year, or head to Accounts & Utilities to add payments as they happen.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => setBackfillOpen(true)}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body h-9"
                >
                  <CalendarPlus className="h-4 w-4 mr-2" /> Log a full year
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard?section=utilities")}
                  className="rounded-full font-body h-9"
                >
                  Go to Accounts
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-x-auto mb-4">
              <div className="p-3 border-b border-border/50">
                <h4 className="font-display text-sm font-semibold">Annual Utilities Grid — {taxYear}</h4>
              </div>
              <table className="w-full text-xs font-body">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 font-medium">Month</th>
                    {grid.cols.map((c) => (
                      <th key={c.id} className="text-right p-2 font-medium whitespace-nowrap">
                        <div>{c.provider_name || prettyService(c.service_type)}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{prettyService(c.service_type)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((m, i) => (
                    <tr key={m} className="border-t border-border/40">
                      <td className="p-2 text-muted-foreground">{m}</td>
                      {grid.cols.map((c) => (
                        <td key={c.id} className="p-2 text-right tabular-nums">
                          {c.monthly[i] > 0 ? fmt(c.monthly[i]) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold bg-muted/20">
                    <td className="p-2">Annual Total</td>
                    {grid.cols.map((c) => (
                      <td key={c.id} className="p-2 text-right tabular-nums">{fmt(c.total)}</td>
                    ))}
                  </tr>
                  {officePct != null && (
                    <tr className="border-t border-border/40 bg-accent/5">
                      <td className="p-2 text-accent">Deductible at {officePct.toFixed(1)}%</td>
                      {grid.cols.map((c) => (
                        <td key={c.id} className="p-2 text-right tabular-nums text-accent">
                          {DEDUCTIBLE_GROUPS.has(c.group) && !EXCLUDED_GROUPS.has(c.group)
                            ? fmt((c.total * officePct) / 100)
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
              {grid.incomeTotal > 0 && (
                <div className="p-3 border-t border-border/50 flex justify-between font-body text-xs">
                  <span className="text-muted-foreground">Rental income received ({taxYear})</span>
                  <span className="font-semibold text-sage">{fmt(grid.incomeTotal)}</span>
                </div>
              )}
            </div>
          )}

          {/* Form 1098 Checklist */}
          <div className="rounded-lg border border-border/50 p-4">
            <h4 className="font-display text-sm font-semibold mb-3">Form 1098 / Schedule A Checklist</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="font-body text-xs text-muted-foreground">Mortgage interest</Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={mortInt}
                  onChange={(e) => setMortInt(e.target.value)}
                  onBlur={() => saveTaxRecord({})}
                  placeholder="$0.00"
                  className="mt-1 h-9 font-body"
                />
              </div>
              <div>
                <Label className="font-body text-xs text-muted-foreground">Real estate taxes</Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={realTax}
                  onChange={(e) => setRealTax(e.target.value)}
                  onBlur={() => saveTaxRecord({})}
                  placeholder="$0.00"
                  className="mt-1 h-9 font-body"
                />
                {propertyTaxFromPayments > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRealTax(propertyTaxFromPayments.toFixed(2));
                      saveTaxRecord({ real_estate_taxes: propertyTaxFromPayments });
                    }}
                    className="mt-1 text-[11px] text-accent hover:underline"
                  >
                    Use payments total: {fmt(propertyTaxFromPayments)}
                  </button>
                )}
              </div>
              <div>
                <Label className="font-body text-xs text-muted-foreground">Homeowners insurance</Label>
                <Input
                  type="number" step="0.01" min={0}
                  value={homeIns}
                  onChange={(e) => setHomeIns(e.target.value)}
                  onBlur={() => saveTaxRecord({})}
                  placeholder="$0.00"
                  className="mt-1 h-9 font-body"
                />
                {insuranceFromPayments > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHomeIns(insuranceFromPayments.toFixed(2));
                      saveTaxRecord({ homeowners_insurance: insuranceFromPayments });
                    }}
                    className="mt-1 text-[11px] text-accent hover:underline"
                  >
                    Use payments total: {fmt(insuranceFromPayments)}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3">
              <Label className="font-body text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => saveTaxRecord({})}
                placeholder="Optional notes for this tax year"
                className="mt-1 font-body text-sm"
                rows={2}
              />
            </div>
          </div>

          <p className="mt-4 font-body text-xs text-muted-foreground italic">
            Informational only — not tax advice. Deductibility of home-office expenses depends on your specific situation. Consult a qualified tax professional.
          </p>
        </CardContent>
      </Card>

      <TaxBackfillDialog
        open={backfillOpen}
        onOpenChange={setBackfillOpen}
        propertyId={property.id}
        year={taxYear}
        accounts={accounts as any}
        existingPayments={payments as any}
      />
    </div>
  );
};

export default TaxPackageSection;
