import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TrendingUp, Save } from "lucide-react";

interface BulkClassifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BulkClassifyDialog = ({ open, onOpenChange }: BulkClassifyDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<Record<string, string>>({});

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["maintenance_logs_classify", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, cost, scheduled_date, expense_type, created_at, properties(name)")
        .not("cost", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const getExpenseType = (id: string, current: string | null) => {
    return changes[id] ?? current ?? "repair";
  };

  const toggleType = (id: string, current: string | null) => {
    const currentVal = getExpenseType(id, current);
    const newVal = currentVal === "capital_improvement" ? "repair" : "capital_improvement";
    setChanges((prev) => ({ ...prev, [id]: newVal }));
  };

  const changedEntries = Object.entries(changes).filter(([id, newType]) => {
    const entry = entries.find((e: any) => e.id === id);
    return entry && (entry.expense_type ?? "repair") !== newType;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [id, expense_type] of changedEntries) {
        const { error } = await supabase
          .from("maintenance_logs")
          .update({ expense_type })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs_classify"] });
      toast({ title: `${changedEntries.length} entries updated!` });
      setChanges({});
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Classify Expenses
          </DialogTitle>
          <p className="font-body text-sm text-muted-foreground">
            Toggle entries to mark them as capital improvements for tax purposes.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No entries with costs to classify.</div>
          ) : (
            entries.map((entry: any) => {
              const isImprovement = getExpenseType(entry.id, entry.expense_type) === "capital_improvement";
              const isChanged = changes[entry.id] && (entry.expense_type ?? "repair") !== changes[entry.id];
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isChanged ? "bg-accent/10" : "hover:bg-muted/50"}`}
                >
                  <Switch
                    checked={isImprovement}
                    onCheckedChange={() => toggleType(entry.id, entry.expense_type)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium truncate">{entry.title}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {entry.properties?.name} · {entry.scheduled_date ? format(new Date(entry.scheduled_date), "MMM d, yyyy") : format(new Date(entry.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span className="font-body text-sm font-medium shrink-0">
                    ${Number(entry.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {isImprovement && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[10px] shrink-0">
                      Improvement
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        {changedEntries.length > 0 && (
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <p className="font-body text-sm text-muted-foreground">
              {changedEntries.length} change{changedEntries.length !== 1 ? "s" : ""}
            </p>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkClassifyDialog;
