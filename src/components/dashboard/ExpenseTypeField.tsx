import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, Wrench, FileText, HelpCircle } from "lucide-react";

interface ExpenseTypeFieldProps {
  value: string;
  onChange: (value: string) => void;
  taxNotes?: string;
  onTaxNotesChange?: (value: string) => void;
  showTaxNotes?: boolean;
}

const ExpenseTypeField = ({ value, onChange, taxNotes, onTaxNotesChange, showTaxNotes = true }: ExpenseTypeFieldProps) => {
  const [showNotes, setShowNotes] = useState(!!taxNotes);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="font-body">Expense Type</Label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("capital_improvement")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
            value === "capital_improvement"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Capital Improvement
        </button>
        <button
          type="button"
          onClick={() => onChange("repair")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
            value === "repair"
              ? "border-border bg-muted text-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Repair / Maintenance
        </button>
      </div>
      <p className="font-body text-xs text-muted-foreground">
        {value === "capital_improvement"
          ? "Improvements add to your cost basis and reduce capital gains tax when you sell. This includes work that replaces a full system, adds something new, or upgrades your home. Examples: new roof, new HVAC, kitchen remodel, new windows, added deck, new flooring, finished basement."
          : "Minor repairs do not qualify as capital improvements under IRS rules and cannot be added to your cost basis. Repairs keep your home in working condition. Examples: patching shingles, fixing a leaky faucet, patching drywall, painting for maintenance, unclogging a drain, routine servicing."}
      </p>

      <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
        <CollapsibleTrigger className="font-body text-xs text-accent hover:underline flex items-center gap-1">
          <HelpCircle className="h-3 w-3" /> Not sure which to pick?
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 font-body text-xs text-muted-foreground space-y-1.5">
            <p>The IRS distinguishes based on what the work does — not how much it costs.</p>
            <p><strong>Improvement:</strong> Replacing an entire system (full roof, complete HVAC, all plumbing), adding something new, or upgrading your home.</p>
            <p><strong>Repair:</strong> Fixing part of a system to keep it running (patching a leak, replacing a few shingles, servicing equipment).</p>
            <p>When in doubt, choose <strong>Repair</strong> — your tax advisor can reclassify later using your documentation from HomeLog.</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showTaxNotes && onTaxNotesChange && (
        <>
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="font-body text-xs text-accent hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" /> Add tax notes
            </button>
          ) : (
            <div className="space-y-1">
              <Label className="font-body text-xs text-muted-foreground">Tax Notes (optional)</Label>
              <Textarea
                placeholder="e.g., Part of full kitchen renovation project — Phase 2 of 3"
                value={taxNotes || ""}
                onChange={(e) => onTaxNotesChange(e.target.value)}
                className="font-body text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExpenseTypeField;
