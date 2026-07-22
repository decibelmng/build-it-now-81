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
import { Download, Home as HomeIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n: number | null | undefined) =>
  n != null && !Number.isNaN(n)
    ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const prettyService = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

interface Props {
  property: Property;
}

const TaxPackageSection = ({ property }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState<number>(currentYear - 1);
  const [officeSqft, setOfficeSqft] = useState<string>(
    property.home_office_sqft != null ? String(property.home_office_sqft) : ""
  );

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

  // Improvements for CSV
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

  // Years available across payments (past 6 years default fallback)
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (let y = currentYear; y >= currentYear - 6; y--) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [currentYear]);

  // Build expense grid (columns) and income
  const grid = useMemo(() => {
    // key by service_type
    const expenseCols = new Map<string, { group: string; monthly: number[]; total: number }>();
    let incomeTotal = 0;
    const incomeByMonth = new Array(12).fill(0);

    payments.forEach((p: any) => {
      const svc = p.property_utilities?.service_type;
      const grp = p.property_utilities?.account_group ?? "other";
      const isIncome = p.property_utilities?.is_income === true;
      const amt = Number(p.amount) || 0;
      const m = new Date(p.payment_month + "T00:00:00").getMonth();
      if (isIncome || grp === "income") {
        incomeTotal += amt;
        incomeByMonth[m] += amt;
        return;
      }
      if (!svc) return;
      if (!expenseCols.has(svc)) {
        expenseCols.set(svc, { group: grp, monthly: new Array(12).fill(0), total: 0 });
      }
      const col = expenseCols.get(svc)!;
      col.monthly[m] += amt;
      col.total += amt;
    });

    const cols = Array.from(expenseCols.entries())
      .filter(([, v]) => v.total > 0)
      .sort(([a], [b]) => a.localeCompare(b));

    return { cols, incomeTotal, incomeByMonth };
  }, [payments]);

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

  // 1098 checklist state (local + persist on blur)
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

  // Auto-derive from payments
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

  const exportTaxPackage = () => {
    const rows: (string | number)[][] = [];
    const propSlug = (property.name || "home").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    rows.push([`HomeLog Tax Package — ${property.name} — ${taxYear}`]);
    rows.push([`Address`, property.address ?? ""]);
    rows.push([`Total sqft`, property.sqft ?? ""]);
    rows.push([`Home office sqft`, property.home_office_sqft ?? ""]);
    rows.push([`Home office %`, officePct != null ? `${officePct.toFixed(1)}%` : "—"]);
    rows.push([]);

    // Monthly grid
    rows.push(["Monthly utilities & accounts"]);
    const header = ["Month", ...grid.cols.map(([svc]) => prettyService(svc))];
    rows.push(header);
    for (let m = 0; m < 12; m++) {
      rows.push([MONTHS[m], ...grid.cols.map(([, v]) => v.monthly[m].toFixed(2))]);
    }
    rows.push(["Annual Total", ...grid.cols.map(([, v]) => v.total.toFixed(2))]);
    if (officePct != null) {
      rows.push([
        `Deductible at ${officePct.toFixed(1)}%`,
        ...grid.cols.map(([, v]) =>
          DEDUCTIBLE_GROUPS.has(v.group) && !EXCLUDED_GROUPS.has(v.group)
            ? ((v.total * officePct) / 100).toFixed(2)
            : ""
        ),
      ]);
    }
    rows.push([]);
    rows.push(["Rental income received", grid.incomeTotal.toFixed(2)]);
    rows.push([]);

    // 1098 items
    rows.push(["Form 1098 / Schedule A items"]);
    rows.push(["Mortgage interest", mortInt || "0"]);
    rows.push(["Real estate taxes", realTax || "0"]);
    rows.push(["Homeowners insurance", homeIns || "0"]);
    if (notes) rows.push(["Notes", notes]);
    rows.push([]);

    // Capital improvements
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

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold">Annual Tax Package</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(taxYear)} onValueChange={(v) => setTaxYear(Number(v))}>
                <SelectTrigger className="w-28 h-9 text-xs font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={exportTaxPackage}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body h-9"
              >
                <Download className="h-4 w-4 mr-2" /> Tax Package (CSV)
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

          {/* Utilities Grid */}
          <div className="rounded-lg border border-border/50 overflow-x-auto mb-4">
            <div className="p-3 border-b border-border/50">
              <h4 className="font-display text-sm font-semibold">Annual Utilities Grid — {taxYear}</h4>
            </div>
            {grid.cols.length === 0 ? (
              <p className="p-4 font-body text-xs text-muted-foreground">
                No account payments logged for {taxYear}. Add payments in Accounts & Utilities.
              </p>
            ) : (
              <table className="w-full text-xs font-body">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 font-medium">Month</th>
                    {grid.cols.map(([svc]) => (
                      <th key={svc} className="text-right p-2 font-medium whitespace-nowrap">{prettyService(svc)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((m, i) => (
                    <tr key={m} className="border-t border-border/40">
                      <td className="p-2 text-muted-foreground">{m}</td>
                      {grid.cols.map(([svc, v]) => (
                        <td key={svc} className="p-2 text-right tabular-nums">
                          {v.monthly[i] > 0 ? fmt(v.monthly[i]) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold bg-muted/20">
                    <td className="p-2">Annual Total</td>
                    {grid.cols.map(([svc, v]) => (
                      <td key={svc} className="p-2 text-right tabular-nums">{fmt(v.total)}</td>
                    ))}
                  </tr>
                  {officePct != null && (
                    <tr className="border-t border-border/40 bg-accent/5">
                      <td className="p-2 text-accent">Deductible at {officePct.toFixed(1)}%</td>
                      {grid.cols.map(([svc, v]) => (
                        <td key={svc} className="p-2 text-right tabular-nums text-accent">
                          {DEDUCTIBLE_GROUPS.has(v.group) && !EXCLUDED_GROUPS.has(v.group)
                            ? fmt((v.total * officePct) / 100)
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {grid.incomeTotal > 0 && (
              <div className="p-3 border-t border-border/50 flex justify-between font-body text-xs">
                <span className="text-muted-foreground">Rental income received ({taxYear})</span>
                <span className="font-semibold text-sage">{fmt(grid.incomeTotal)}</span>
              </div>
            )}
          </div>

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
    </div>
  );
};

export default TaxPackageSection;
