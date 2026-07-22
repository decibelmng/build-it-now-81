import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, Loader2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const prettyService = (s: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Account {
  id: string;
  provider_name: string | null;
  service_type: string;
  is_income: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  year: number;
  accounts: Account[];
  existingPayments: Array<{ utility_id: string; payment_month: string; amount: number }>;
}

const TaxBackfillDialog = ({ open, onOpenChange, propertyId, year, accounts, existingPayments }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  // values[accountId][monthIndex] = string
  const [values, setValues] = useState<Record<string, string[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const seed: Record<string, string[]> = {};
    accounts.forEach((a) => { seed[a.id] = new Array(12).fill(""); });
    existingPayments.forEach((p) => {
      if (!seed[p.utility_id]) return;
      const m = new Date(p.payment_month + "T00:00:00").getMonth();
      seed[p.utility_id][m] = String(p.amount ?? "");
    });
    setValues(seed);
  }, [open, accounts, existingPayments]);

  const setCell = (aid: string, m: number, v: string) => {
    setValues((prev) => {
      const next = { ...prev, [aid]: [...(prev[aid] || new Array(12).fill(""))] };
      next[aid][m] = v;
      return next;
    });
  };

  const fillDown = (aid: string) => {
    setValues((prev) => {
      const col = [...(prev[aid] || new Array(12).fill(""))];
      const firstIdx = col.findIndex((v) => v && v.trim() !== "");
      if (firstIdx === -1) return prev;
      const val = col[firstIdx];
      for (let i = firstIdx + 1; i < 12; i++) if (!col[i] || col[i].trim() === "") col[i] = val;
      return { ...prev, [aid]: col };
    });
  };

  const columnTotal = (aid: string) =>
    (values[aid] || []).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, aIdx: number, m: number) => {
    const grid = containerRef.current;
    if (!grid) return;
    const move = (rowDelta: number, colDelta: number) => {
      const nextA = aIdx + colDelta;
      const nextM = m + rowDelta;
      if (nextA < 0 || nextA >= accounts.length || nextM < 0 || nextM >= 12) return;
      const sel = grid.querySelector<HTMLInputElement>(`input[data-cell="${accounts[nextA].id}-${nextM}"]`);
      if (sel) { e.preventDefault(); sel.focus(); sel.select(); }
    };
    if (e.key === "ArrowDown" || e.key === "Enter") move(1, 0);
    else if (e.key === "ArrowUp") move(-1, 0);
    else if (e.key === "ArrowRight") move(0, 1);
    else if (e.key === "ArrowLeft") move(0, -1);
    else if (e.key === "Tab") { /* default tab behavior */ }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const rows: any[] = [];
    Object.entries(values).forEach(([aid, col]) => {
      col.forEach((v, m) => {
        if (v == null || v === "" || Number.isNaN(Number(v))) return;
        const num = Number(v);
        if (num === 0) return;
        const mm = String(m + 1).padStart(2, "0");
        rows.push({
          utility_id: aid,
          property_id: propertyId,
          user_id: user.id,
          payment_month: `${year}-${mm}-01`,
          amount: num,
        });
      });
    });
    if (rows.length === 0) {
      setSaving(false);
      onOpenChange(false);
      return;
    }
    const { error } = await supabase
      .from("utility_payments")
      .upsert(rows, { onConflict: "utility_id,payment_month" });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Backfilled ${rows.length} payments for ${year}` });
    qc.invalidateQueries({ queryKey: ["tax_payments", propertyId, year] });
    qc.invalidateQueries({ queryKey: ["tax_pkg_accounts", propertyId, year] });
    qc.invalidateQueries({ queryKey: ["home_savings"] });
    qc.invalidateQueries({ queryKey: ["utility_payments"] });
    qc.invalidateQueries({ queryKey: ["property_utilities"] });
    onOpenChange(false);
  };

  const grandTotal = useMemo(
    () => Object.keys(values).reduce((s, aid) => s + columnTotal(aid), 0),
    [values]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <DialogTitle className="font-display text-xl">Log a full year — {year}</DialogTitle>
          <p className="text-xs font-body text-muted-foreground">
            Enter monthly amounts. Tab or arrow keys move between cells. Fill-down copies the first entered value into empty months.
          </p>
        </DialogHeader>

        <div ref={containerRef} className="flex-1 overflow-auto">
          {accounts.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No accounts to backfill for {year}.</p>
          ) : (
            <table className="text-xs font-body border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="sticky left-0 bg-background text-left p-2 min-w-[80px] border-r border-border">Month</th>
                  {accounts.map((a) => (
                    <th key={a.id} className="p-2 text-left min-w-[160px] border-r border-border/50">
                      <div className="font-semibold truncate">{a.provider_name || prettyService(a.service_type)}</div>
                      <div className="text-[10px] text-muted-foreground">{prettyService(a.service_type)}{a.is_income ? " · income" : ""}</div>
                      <button
                        type="button"
                        onClick={() => fillDown(a.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
                      >
                        <ArrowDown className="h-3 w-3" /> Fill down
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((mLabel, m) => (
                  <tr key={mLabel} className="border-b border-border/40">
                    <td className="sticky left-0 bg-background p-2 font-medium text-muted-foreground border-r border-border/50">
                      {mLabel}
                    </td>
                    {accounts.map((a, aIdx) => (
                      <td key={a.id} className="p-1 border-r border-border/30">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          data-cell={`${a.id}-${m}`}
                          value={values[a.id]?.[m] ?? ""}
                          onChange={(e) => setCell(a.id, m, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, aIdx, m)}
                          onFocus={(e) => e.currentTarget.select()}
                          className="w-full h-8 px-2 rounded border border-transparent bg-transparent tabular-nums text-right focus:border-accent focus:outline-none focus:bg-accent/5"
                          placeholder="—"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-muted/60 backdrop-blur">
                <tr className="border-t-2 border-border">
                  <td className="sticky left-0 bg-muted/60 p-2 font-semibold border-r border-border">Column total</td>
                  {accounts.map((a) => {
                    const t = columnTotal(a.id);
                    return (
                      <td key={a.id} className="p-2 text-right font-semibold tabular-nums border-r border-border/50">
                        {t > 0 ? `$${t.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-border/50 flex items-center justify-between gap-3">
          <p className="text-xs font-body text-muted-foreground">
            Grand total: <span className="font-semibold text-foreground tabular-nums">
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="font-body">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || accounts.length === 0}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save year
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaxBackfillDialog;
