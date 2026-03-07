import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Wrench, FileText } from "lucide-react";

interface ExpenseTypeFieldProps {
  value: string;
  onChange: (value: string) => void;
  taxNotes?: string;
  onTaxNotesChange?: (value: string) => void;
  showTaxNotes?: boolean;
}

const ExpenseTypeField = ({ value, onChange, taxNotes, onTaxNotesChange, showTaxNotes = true }: ExpenseTypeFieldProps) => {
  const [showNotes, setShowNotes] = useState(!!taxNotes);

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
          ? "Improvements add value to your home and reduce capital gains tax when you sell. Examples: new roof, kitchen remodel, new HVAC, added deck."
          : "Repairs maintain your home's current condition. Examples: fixing a leak, patching drywall, routine servicing."}
      </p>

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
