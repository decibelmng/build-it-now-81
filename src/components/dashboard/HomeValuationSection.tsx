import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePropertyEquityForProperty } from "@/hooks/usePropertyEquity";
import {
  usePropertyValuations,
  useAddValuation,
  useUpdateValuation,
  useDeleteValuation,
  type PropertyValuation,
} from "@/hooks/usePropertyValuations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  TrendingUp, Building, Pencil, Plus, Paperclip, Trash2, Info,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { valuationSchema } from "@/lib/schemas";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "$—";

const fmtDate = (d: string | null | undefined) =>
  d ? format(parseISO(d), "MMM yyyy") : "";

const CurrencyInput = ({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
    <Input id={id} type="number" step="0.01" min="0" className="pl-7 font-body" placeholder={placeholder || "0.00"} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const VALUATION_TYPE_LABELS: Record<string, string> = {
  purchase_price: "Purchase Price",
  purchase_appraisal: "Purchase Appraisal",
  bank_appraisal: "Bank Appraisal",
  refinance_appraisal: "Refinance Appraisal",
  tax_assessment: "Tax Assessment",
  professional_appraisal: "Professional Appraisal",
  owner_estimate: "Your Estimate",
  estimate: "Estimate",
  comparative_market_analysis: "CMA",
  cma: "CMA",
};

const VALUATION_TYPE_COLORS: Record<string, string> = {
  purchase_price: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  purchase_appraisal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  bank_appraisal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  refinance_appraisal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  tax_assessment: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  professional_appraisal: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  owner_estimate: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  estimate: "bg-muted text-muted-foreground",
  comparative_market_analysis: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cma: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const ADD_VALUATION_TYPES = [
  { value: "purchase_price", label: "Purchase Price" },
  { value: "bank_appraisal", label: "Bank Appraisal" },
  { value: "refinance_appraisal", label: "Refinance Appraisal" },
  { value: "tax_assessment", label: "Tax Assessment" },
  { value: "owner_estimate", label: "Your Estimate" },
  { value: "cma", label: "Comparative Market Analysis (CMA)" },
];

interface Props {
  properties: Property[];
  selectedPropertyId: string;
}

const HomeValuationSection = ({ properties, selectedPropertyId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const property = properties.find((p) => p.id === selectedPropertyId);
  const { data: equity } = usePropertyEquityForProperty(selectedPropertyId);
  const { data: valuations = [], isFetched: valuationsFetched } = usePropertyValuations(selectedPropertyId);
  const addValuation = useAddValuation();
  const updateValuation = useUpdateValuation();
  const deleteValuation = useDeleteValuation();

  const [valueDialog, setValueDialog] = useState(false);
  const [mortgageDialog, setMortgageDialog] = useState(false);
  const [valuationDialog, setValuationDialog] = useState(false);
  const [editingValuation, setEditingValuation] = useState<PropertyValuation | null>(null);

  // Auto-seed purchase appraisal (only once per property, guarded properly)
  const seededPropertyId = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !property || !property.purchase_price || !property.purchase_date) return;
    if (seededPropertyId.current === property.id) return;
    // Wait for valuations query to actually finish loading
    if (!valuationsFetched) return;
    const hasPurchaseAppraisal = valuations.some((v) => v.valuation_type === "purchase_appraisal");
    seededPropertyId.current = property.id;
    if (!hasPurchaseAppraisal) {
      addValuation.mutate({
        property_id: property.id,
        valuation_type: "purchase_appraisal",
        valuation_date: property.purchase_date!,
        value: Number(property.purchase_price),
        source: "Purchase price",
      });
    }
  }, [user, property?.id, property?.purchase_price, property?.purchase_date, valuations, valuationsFetched]);

  // Fetch mortgage-related docs for linking
  const { data: mortgageDocs = [] } = useQuery({
    queryKey: ["mortgage_docs", selectedPropertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, name, category")
        .eq("property_id", selectedPropertyId)
        .in("category", ["mortgage_statement", "mortgage_lien"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!selectedPropertyId,
  });

  // Fetch appraisal-related docs for linking
  const { data: appraisalDocs = [] } = useQuery({
    queryKey: ["appraisal_docs", selectedPropertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, name, category")
        .eq("property_id", selectedPropertyId)
        .in("category", ["appraisal", "tax_records"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!selectedPropertyId,
  });

  if (!property) return null;

  const hasValue = property.current_estimated_value != null;
  const hasMortgage = property.mortgage_balance != null;
  const appreciationPositive = (equity?.appreciation ?? 0) >= 0;

  // ── CARD A: HOME VALUE ──
  const HomeValueCard = () => {
    if (!hasValue) {
      return (
        <Card className="border-border/50 flex-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h3 className="font-display text-base font-semibold">Home Value</h3>
            </div>
            <p className="font-display text-lg font-bold mb-1">What's your home worth today?</p>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Add your current estimated value to start tracking equity and appreciation. Check Zillow, Redfin, or your latest tax assessment.
            </p>
            <Button
              onClick={() => setValueDialog(true)}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
            >
              Add home value
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-border/50 flex-1">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h3 className="font-display text-base font-semibold">Home Value</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setValueDialog(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="font-display text-2xl font-bold">{fmt(property.current_estimated_value)}</p>

          {equity?.appreciation != null && property.purchase_price && (
            <div className="mt-2">
              <Badge className={`${appreciationPositive ? "bg-sage/20 text-sage hover:bg-sage/30" : "bg-destructive/10 text-destructive hover:bg-destructive/20"} font-body text-xs`}>
                {appreciationPositive ? "+" : ""}{fmt(equity.appreciation)} ({appreciationPositive ? "+" : ""}{equity.appreciation_pct}%) since purchase
              </Badge>
              <p className="font-body text-xs text-muted-foreground mt-1.5">
                Purchased for {fmt(property.purchase_price)}{property.purchase_date ? ` on ${format(parseISO(property.purchase_date), "MMM yyyy")}` : ""}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
            {property.value_last_updated && (
              <p className="font-body text-xs text-muted-foreground">
                Last updated {fmtDate(property.value_last_updated)}
              </p>
            )}
            {(equity?.valuation_count ?? 0) > 0 && (
              <button
                onClick={() => document.getElementById("valuation-history")?.scrollIntoView({ behavior: "smooth" })}
                className="font-body text-xs text-accent hover:underline"
              >
                View {equity?.valuation_count} appraisal{(equity?.valuation_count ?? 0) > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── CARD B: MORTGAGE & EQUITY ──
  const MortgageEquityCard = () => {
    if (!hasMortgage) {
      return (
        <Card className="border-border/50 flex-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-4 w-4 text-accent" />
              <h3 className="font-display text-base font-semibold">Mortgage & Equity</h3>
            </div>
            <p className="font-display text-lg font-bold mb-1">Track your equity</p>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Add your mortgage balance to see how much equity you've built. Upload a mortgage statement and we'll ask you a few quick questions.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setMortgageDialog(true)}
                className="rounded-full font-body"
              >
                Enter manually
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const equityAmount = equity?.estimated_equity ?? 0;
    const equityPct = equity?.equity_pct ?? 0;
    const mortgagePct = 100 - equityPct;
    const loanTermYears = property.loan_term_months ? Math.round(property.loan_term_months / 12) : null;

    return (
      <Card className="border-border/50 flex-1">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-accent" />
              <h3 className="font-display text-base font-semibold">Mortgage & Equity</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMortgageDialog(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="font-display text-2xl font-bold">{fmt(equityAmount)}</p>

          {/* Equity progress bar */}
          {hasValue && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-sage transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, equityPct))}%` }}
                />
              </div>
              <p className="font-body text-xs text-muted-foreground mt-1.5">
                {fmt(property.mortgage_balance)} owed / {fmt(property.current_estimated_value)} value ({equityPct}% equity)
              </p>
            </div>
          )}

          <div className="mt-2 space-y-0.5">
            <p className="font-body text-xs text-muted-foreground">
              {property.mortgage_rate != null && `Rate: ${property.mortgage_rate}%`}
              {property.mortgage_payment != null && ` | Payment: ${fmt(property.mortgage_payment)}/mo`}
              {loanTermYears && ` | Term: ${loanTermYears}yr`}
            </p>
            {property.mortgage_last_updated && (
              <p className="font-body text-xs text-muted-foreground">
                Balance as of {fmtDate(property.mortgage_last_updated)}
              </p>
            )}
          </div>

          {property.mortgage_document_id && (
            <div className="mt-2 flex items-center gap-1.5 text-accent">
              <Paperclip className="h-3 w-3" />
              <span className="font-body text-xs">Linked to mortgage statement</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── VALUE EDIT DIALOG ──
  const ValueEditDialog = () => {
    const [estValue, setEstValue] = useState(property.current_estimated_value != null ? String(property.current_estimated_value) : "");
    const [asOf, setAsOf] = useState(property.value_last_updated || new Date().toISOString().split("T")[0]);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      const val = parseFloat(estValue);
      if (!val || val <= 0) {
        toast({ title: "Enter a valid value", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        await supabase.from("properties").update({
          current_estimated_value: val,
          value_last_updated: asOf,
        }).eq("id", property.id);

        await supabase.from("property_valuations").insert({
          property_id: property.id,
          user_id: user!.id,
          valuation_type: "estimate",
          valuation_date: asOf,
          value: val,
          source: "Manual estimate",
        });

        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
        queryClient.invalidateQueries({ queryKey: ["property_valuations", property.id] });
        toast({ title: "Home value updated" });
        setValueDialog(false);
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={valueDialog} onOpenChange={setValueDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Update Home Value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Current estimated value</Label>
              <CurrencyInput value={estValue} onChange={setEstValue} />
            </div>
            <div className="space-y-2">
              <Label className="font-body">As of</Label>
              <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="font-body" />
            </div>
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="font-body text-xs text-muted-foreground">
                Check Zillow, Redfin, or your latest tax assessment for a current estimate.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setValueDialog(false)} className="rounded-full font-body">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── MORTGAGE EDIT DIALOG ──
  const MortgageEditDialog = () => {
    const [balance, setBalance] = useState(property.mortgage_balance != null ? String(property.mortgage_balance) : "");
    const [origAmount, setOrigAmount] = useState(property.original_loan_amount != null ? String(property.original_loan_amount) : "");
    const [rate, setRate] = useState(property.mortgage_rate != null ? String(property.mortgage_rate) : "");
    const [payment, setPayment] = useState(property.mortgage_payment != null ? String(property.mortgage_payment) : "");
    const [stmtDate, setStmtDate] = useState(property.mortgage_last_updated || new Date().toISOString().split("T")[0]);
    const [loanTerm, setLoanTerm] = useState(property.loan_term_months != null ? String(property.loan_term_months) : "");
    const [customTerm, setCustomTerm] = useState("");
    const [docId, setDocId] = useState(property.mortgage_document_id || "");
    const [saving, setSaving] = useState(false);

    const showOrigAmount = property.original_loan_amount == null;
    const showLoanTerm = property.loan_term_months == null;

    const handleSave = async () => {
      const updates: Record<string, any> = {
        mortgage_last_updated: stmtDate,
      };
      if (balance) updates.mortgage_balance = parseFloat(balance);
      if (rate) updates.mortgage_rate = parseFloat(rate);
      if (payment) updates.mortgage_payment = parseFloat(payment);
      if (showOrigAmount && origAmount) updates.original_loan_amount = parseFloat(origAmount);
      if (docId) updates.mortgage_document_id = docId;

      const termValue = loanTerm === "other" ? (customTerm ? parseInt(customTerm) : undefined) : (loanTerm ? parseInt(loanTerm) : undefined);
      if (showLoanTerm && termValue) updates.loan_term_months = termValue;

      setSaving(true);
      try {
        const { error } = await supabase.from("properties").update(updates).eq("id", property.id);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
        toast({ title: "Mortgage details updated" });
        setMortgageDialog(false);
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={mortgageDialog} onOpenChange={setMortgageDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Update Mortgage Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Remaining balance</Label>
                <CurrencyInput value={balance} onChange={setBalance} />
                <p className="font-body text-[11px] text-muted-foreground">The principal balance on your statement</p>
              </div>
              {showOrigAmount ? (
                <div className="space-y-2">
                  <Label className="font-body">Original loan amount</Label>
                  <CurrencyInput value={origAmount} onChange={setOrigAmount} />
                  <p className="font-body text-[11px] text-muted-foreground">The total amount borrowed at closing</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="font-body text-muted-foreground">Original loan amount</Label>
                  <p className="font-body text-sm">${Number(property.original_loan_amount).toLocaleString()}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="font-body">Interest rate</Label>
                <div className="relative">
                  <Input type="number" step="0.001" min="0" max="30" className="pr-7 font-body" placeholder="6.250" value={rate} onChange={(e) => setRate(e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Monthly payment</Label>
                <CurrencyInput value={payment} onChange={setPayment} />
              </div>
            </div>

            <div className={`grid gap-3 ${showLoanTerm ? "grid-cols-1 sm:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                <Label className="font-body">As of</Label>
                <Input type="date" value={stmtDate} onChange={(e) => setStmtDate(e.target.value)} className="font-body" />
              </div>
              {showLoanTerm && (
                <div className="space-y-2">
                  <Label className="font-body">Loan term</Label>
                  <Select value={loanTerm} onValueChange={setLoanTerm}>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Select term" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360" className="font-body">30 years</SelectItem>
                      <SelectItem value="240" className="font-body">20 years</SelectItem>
                      <SelectItem value="180" className="font-body">15 years</SelectItem>
                      <SelectItem value="120" className="font-body">10 years</SelectItem>
                      <SelectItem value="other" className="font-body">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {loanTerm === "other" && (
                    <Input type="number" min="12" max="600" placeholder="Months" value={customTerm} onChange={(e) => setCustomTerm(e.target.value)} className="font-body mt-2" />
                  )}
                </div>
              )}
            </div>

            {mortgageDocs.length > 0 && (
              <div className="space-y-2">
                <Label className="font-body">Link to document</Label>
                <Select value={docId || "none"} onValueChange={(v) => setDocId(v === "none" ? "" : v)}>
                  <SelectTrigger className="font-body text-xs"><SelectValue placeholder="Select document" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-body text-xs">No document</SelectItem>
                    {mortgageDocs.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} className="font-body text-xs">{d.title || d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
                {saving ? "Saving..." : "Save mortgage details"}
              </Button>
              <Button variant="outline" onClick={() => setMortgageDialog(false)} className="rounded-full font-body">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── VALUATION ADD/EDIT DIALOG ──
  const ValuationEditDialog = () => {
    const isEdit = !!editingValuation;

    // Check if a purchase_price valuation already exists
    const existingPurchaseVal = valuations.find((v) => v.valuation_type === "purchase_price");

    const [vType, setVType] = useState(editingValuation?.valuation_type || "bank_appraisal");
    const [vDate, setVDate] = useState(editingValuation?.valuation_date || new Date().toISOString().split("T")[0]);
    const [vValue, setVValue] = useState(editingValuation ? String(editingValuation.value) : "");
    const [vSource, setVSource] = useState(editingValuation?.source || "");
    const [vNotes, setVNotes] = useState(editingValuation?.notes || "");
    const [vDocId, setVDocId] = useState(editingValuation?.document_id || "");
    const [saving, setSaving] = useState(false);

    // When type changes to purchase_price and an existing record exists, pre-fill
    const handleTypeChange = (newType: string) => {
      setVType(newType);
      if (newType === "purchase_price" && existingPurchaseVal && !isEdit) {
        setVValue(String(existingPurchaseVal.value));
        setVDate(existingPurchaseVal.valuation_date);
        setVSource(existingPurchaseVal.source || "");
        setVNotes(existingPurchaseVal.notes || "");
        setVDocId(existingPurchaseVal.document_id || "");
      }
    };

    const isPurchasePrice = vType === "purchase_price";
    const isEditingExistingPurchase = isPurchasePrice && (isEdit || !!existingPurchaseVal);

    const dialogTitle = isEdit
      ? (isPurchasePrice ? "Edit purchase price" : "Edit Valuation")
      : (isPurchasePrice && existingPurchaseVal ? "Edit purchase price" : "Add Valuation");
    const saveLabel = isEditingExistingPurchase ? "Update" : isEdit ? "Update" : "Add to value history";

    const handleSave = async () => {
      const val = parseFloat(vValue);
      const v = valuationSchema.safeParse({
        valuation_type: vType,
        valuation_date: vDate,
        value: val,
        source: vSource || undefined,
        notes: vNotes || undefined,
        property_id: property.id,
      });
      if (!v.success) {
        toast({ title: v.error.errors[0]?.message || "Validation failed", variant: "destructive" });
        return;
      }

      setSaving(true);
      try {
        if (isPurchasePrice) {
          // Upsert purchase_price valuation
          const { data: existing } = await supabase
            .from("property_valuations")
            .select("id")
            .eq("property_id", property.id)
            .eq("valuation_type", "purchase_price")
            .maybeSingle();

          if (existing?.id) {
            await supabase.from("property_valuations")
              .update({
                value: val,
                valuation_date: vDate,
                source: vSource || null,
                notes: vNotes || null,
                document_id: vDocId || null,
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("property_valuations").insert({
              property_id: property.id,
              user_id: user!.id,
              valuation_type: "purchase_price",
              valuation_date: vDate,
              value: val,
              source: vSource || null,
              notes: vNotes || null,
              document_id: vDocId || null,
            });
          }

          // Sync to properties table
          await supabase.from("properties")
            .update({ purchase_price: val, purchase_date: vDate })
            .eq("id", property.id);

          // Also sync any existing purchase_appraisal record
          const { data: existingAppraisal } = await supabase
            .from("property_valuations")
            .select("id")
            .eq("property_id", property.id)
            .eq("valuation_type", "purchase_appraisal")
            .maybeSingle();

          if (existingAppraisal?.id) {
            await supabase.from("property_valuations")
              .update({ value: val, valuation_date: vDate })
              .eq("id", existingAppraisal.id);
          }

          queryClient.invalidateQueries({ queryKey: ["property_valuations"] });
          queryClient.invalidateQueries({ queryKey: ["properties"] });
          queryClient.invalidateQueries({ queryKey: ["cost_basis_summary"] });
          queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
          toast({ title: `Purchase price ${existing?.id ? "updated" : "recorded"} — ${fmt(val)}` });
        } else if (isEdit) {
          await updateValuation.mutateAsync({
            id: editingValuation!.id,
            propertyId: property.id,
            valuation_type: vType,
            valuation_date: vDate,
            value: val,
            source: vSource || null,
            notes: vNotes || null,
            document_id: vDocId || null,
          });

          // If editing a purchase_appraisal, also sync properties
          if (editingValuation!.valuation_type === "purchase_appraisal" || editingValuation!.valuation_type === "purchase_price") {
            await supabase.from("properties")
              .update({ purchase_price: val, purchase_date: vDate })
              .eq("id", property.id);
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["cost_basis_summary"] });
          }
        } else {
          await addValuation.mutateAsync({
            property_id: property.id,
            valuation_type: vType,
            valuation_date: vDate,
            value: val,
            source: vSource || null,
            notes: vNotes || null,
            document_id: vDocId || null,
          });
        }
        setValuationDialog(false);
        setEditingValuation(null);
      } finally {
        setSaving(false);
      }
    };

    return (
      <Dialog open={valuationDialog} onOpenChange={(v) => { setValuationDialog(v); if (!v) setEditingValuation(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Type *</Label>
                <Select value={vType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="font-body text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADD_VALUATION_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value} className="font-body text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Date *</Label>
                <Input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} className="font-body" />
              </div>
            </div>

            {isPurchasePrice && (
              <div className="flex items-start gap-2 rounded-lg bg-accent/5 border border-accent/20 p-3">
                <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <p className="font-body text-xs text-muted-foreground">
                  This will also update the purchase price on your property profile so everything stays in sync.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-body">Value *</Label>
              <CurrencyInput value={vValue} onChange={setVValue} />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Source</Label>
              <Input value={vSource} onChange={(e) => setVSource(e.target.value)} placeholder="e.g., Bank of America" className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Notes</Label>
              <Textarea value={vNotes} onChange={(e) => setVNotes(e.target.value)} className="font-body" rows={2} />
            </div>
            {appraisalDocs.length > 0 && (
              <div className="space-y-2">
                <Label className="font-body">Link document</Label>
                <Select value={vDocId || "none"} onValueChange={(v) => setVDocId(v === "none" ? "" : v)}>
                  <SelectTrigger className="font-body text-xs"><SelectValue placeholder="Select document" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-body text-xs">No document</SelectItem>
                    {appraisalDocs.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} className="font-body text-xs">{d.title || d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold">
                {saving ? "Saving..." : saveLabel}
              </Button>
              <Button variant="outline" onClick={() => { setValuationDialog(false); setEditingValuation(null); }} className="rounded-full font-body">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="mb-6">
      {/* Two cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <HomeValueCard />
        <MortgageEquityCard />
      </div>

      {/* Valuation History */}
      {valuations.length > 0 && (
        <div id="valuation-history">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold">Valuation History</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-body"
              onClick={() => { setEditingValuation(null); setValuationDialog(true); }}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Source</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground w-8">Doc</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {valuations.map((v) => (
                    <tr key={v.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-xs">{v.valuation_date ? format(parseISO(v.valuation_date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${VALUATION_TYPE_COLORS[v.valuation_type] || VALUATION_TYPE_COLORS.estimate}`}>
                          {VALUATION_TYPE_LABELS[v.valuation_type] || v.valuation_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(v.value)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{v.source || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {v.document_id && <Paperclip className="h-3 w-3 text-muted-foreground inline" />}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => { setEditingValuation(v); setValuationDialog(true); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteValuation.mutate({ id: v.id, propertyId: property.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {valuations.length === 0 && hasValue && (
        <div className="text-center py-4">
          <Button
            variant="ghost"
            size="sm"
            className="font-body text-xs"
            onClick={() => { setEditingValuation(null); setValuationDialog(true); }}
          >
            <Plus className="h-3 w-3 mr-1" /> Add valuation record
          </Button>
        </div>
      )}

      <ValueEditDialog />
      <MortgageEditDialog />
      <ValuationEditDialog />
    </div>
  );
};

export default HomeValuationSection;
