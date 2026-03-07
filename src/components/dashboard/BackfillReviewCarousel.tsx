import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Circle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateComponentCompleteness } from "@/lib/componentCompleteness";
import { cn } from "@/lib/utils";

const WARRANTY_OPTIONS = [
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "5", label: "5 years" },
  { value: "10", label: "10 years" },
  { value: "15", label: "15 years" },
  { value: "25", label: "25 years" },
  { value: "lifetime", label: "Lifetime" },
];

export interface BackfillItem {
  logId: string;
  logTitle: string;
  logDate: string | null;
  logCost: number | null;
  logContactName: string | null;
  logCategory: string;
  componentId: string | null;
  componentName: string | null;
  componentType: string | null;
  isNewComponent: boolean;
  confidence: number;
  existingComponentUpdatedAt: string | null;
  propertyId: string;
}

interface BackfillReviewCarouselProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BackfillItem[];
}

const BackfillReviewCarousel = ({ open, onOpenChange, items }: BackfillReviewCarouselProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [processing, setProcessing] = useState(false);

  // Per-card editable fields
  const [brand, setBrand] = useState("");
  const [warrantyLength, setWarrantyLength] = useState("");
  const [warrantyProvider, setWarrantyProvider] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");

  const resetFields = () => {
    setBrand("");
    setWarrantyLength("");
    setWarrantyProvider("");
    setNextServiceDate("");
  };

  const total = items.length;
  const item = items[currentIndex];
  const isLast = currentIndex >= total - 1;

  const advanceToNext = useCallback(() => {
    setSlideDir("left");
    setTimeout(() => {
      resetFields();
      if (isLast) {
        toast({ title: `✅ All done! Reviewed ${reviewed + 1} of ${total} items.` });
        onOpenChange(false);
        setCurrentIndex(0);
        setReviewed(0);
        queryClient.invalidateQueries({ queryKey: ["unlinked_logs_backfill"] });
        queryClient.invalidateQueries({ queryKey: ["home_components_backfill"] });
      } else {
        setCurrentIndex((i) => i + 1);
      }
      setSlideDir(null);
    }, 250);
  }, [isLast, reviewed, total, onOpenChange, queryClient, toast]);

  const handleUpdate = async () => {
    if (!user || !item) return;
    setProcessing(true);
    try {
      let targetComponentId = item.componentId;

      if (item.isNewComponent || !targetComponentId) {
        const { data: newComp, error } = await supabase
          .from("home_items")
          .insert({
            user_id: user.id,
            property_id: item.propertyId,
            name: item.componentName || item.componentType || "Component",
            category: (item.componentType || item.logCategory || "general").toLowerCase(),
            item_type: "home_component",
            brand: brand || null,
            install_date: item.logDate || null,
            last_maintained: item.logDate || null,
            estimated_value: item.logCost || null,
            warranty_expiry: warrantyLength && item.logDate
              ? warrantyLength === "lifetime" ? "2099-12-31" : calcExpiry(item.logDate, parseInt(warrantyLength))
              : null,
          })
          .select("id")
          .single();
        if (error) throw error;
        targetComponentId = newComp.id;
      } else {
        const updates: Record<string, unknown> = {
          last_maintained: item.logDate || undefined,
          last_updated_from_log_id: item.logId,
          last_updated_at: new Date().toISOString(),
        };
        if (brand) updates.brand = brand;
        if (item.logCost) updates.estimated_value = item.logCost;
        if (warrantyLength && item.logDate) {
          updates.warranty_expiry = warrantyLength === "lifetime"
            ? "2099-12-31" : calcExpiry(item.logDate, parseInt(warrantyLength));
        }
        if (nextServiceDate) updates.last_maintained = nextServiceDate;

        await supabase.from("home_items").update(updates).eq("id", targetComponentId);
      }

      // Recalculate completeness
      const completeness = calculateComponentCompleteness({
        install_date: item.logDate,
        brand: brand || null,
        warranty_expiry: warrantyLength ? "set" : null,
        last_maintained: item.logDate,
        estimated_value: item.logCost,
        last_updated_from_log_id: item.logId,
      });
      await supabase.from("home_items")
        .update({ data_completeness: completeness, last_updated_from_log_id: item.logId, last_updated_at: new Date().toISOString() })
        .eq("id", targetComponentId!);

      // Update maintenance log
      await supabase.from("maintenance_logs")
        .update({ component_id: targetComponentId, component_updated: true })
        .eq("id", item.logId);

      setReviewed((r) => r + 1);
      advanceToNext();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!item) return;
    setProcessing(true);
    try {
      await supabase.from("maintenance_logs")
        .update({ component_update_skipped: true })
        .eq("id", item.logId);
      setReviewed((r) => r + 1);
      advanceToNext();
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (reviewed > 0 && reviewed < total) {
      const exit = confirm(`You've reviewed ${reviewed} of ${total}. Exit? You can come back anytime.`);
      if (!exit) return;
    }
    queryClient.invalidateQueries({ queryKey: ["unlinked_logs_backfill"] });
    queryClient.invalidateQueries({ queryKey: ["home_components_backfill"] });
    setCurrentIndex(0);
    setReviewed(0);
    resetFields();
    onOpenChange(false);
  };

  if (!item) return null;

  const displayName = item.componentName || item.componentType || "Component";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto p-0 gap-0 [&>button]:hidden">
        {/* Custom close button */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="font-body text-xs text-muted-foreground">
            {reviewed} reviewed
          </span>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Card content with slide animation */}
        <div className={cn(
          "px-5 pb-5 transition-all duration-250 ease-in-out",
          slideDir === "left" && "opacity-0 -translate-x-4",
        )}>
          {/* Header */}
          <h2 className="font-display text-base font-semibold mb-0.5">
            Item {currentIndex + 1} of {total}: {item.logTitle}
          </h2>
          <p className="font-body text-xs text-muted-foreground mb-4">
            From your log entry on {item.logDate ? format(new Date(item.logDate), "MMM d, yyyy") : "unknown date"}
          </p>

          {/* Detected Component */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 mb-4">
            <div className="flex items-center gap-2">
              {item.isNewComponent ? (
                <>
                  <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">NEW</Badge>
                  <span className="font-body text-sm font-medium">{displayName}</span>
                  <span className="font-body text-xs text-muted-foreground">(new — will be created)</span>
                </>
              ) : (
                <>
                  <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500 shrink-0" />
                  <span className="font-body text-sm font-medium">{displayName}</span>
                  {item.existingComponentUpdatedAt && (
                    <span className="font-body text-xs text-muted-foreground">
                      (last updated {format(new Date(item.existingComponentUpdatedAt), "MMM d, yyyy")})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Pre-filled data chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {item.logDate && (
              <Badge variant="outline" className="font-body text-xs">📅 {format(new Date(item.logDate), "MMM d, yyyy")}</Badge>
            )}
            {item.logCost != null && (
              <Badge variant="outline" className="font-body text-xs">💰 ${item.logCost.toLocaleString()}</Badge>
            )}
            {item.logContactName && (
              <Badge variant="outline" className="font-body text-xs">👤 {item.logContactName}</Badge>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-body text-xs">Model / Brand</Label>
                <Input placeholder="e.g. Carrier 24ACC6" value={brand} onChange={(e) => setBrand(e.target.value)} className="font-body h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="font-body text-xs">Warranty Length</Label>
                <Select value={warrantyLength} onValueChange={setWarrantyLength}>
                  <SelectTrigger className="font-body h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {WARRANTY_OPTIONS.map((w) => (
                      <SelectItem key={w.value} value={w.value} className="font-body text-sm">{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-body text-xs">Warranty Provider</Label>
                <Input placeholder="e.g. Carrier Inc." value={warrantyProvider} onChange={(e) => setWarrantyProvider(e.target.value)} className="font-body h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="font-body text-xs">Next Service Date</Label>
                <Input type="date" value={nextServiceDate} onChange={(e) => setNextServiceDate(e.target.value)} className="font-body h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full font-body"
              onClick={handleSkip}
              disabled={processing}
            >
              ❌ Skip
            </Button>
            <Button
              className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
              onClick={handleUpdate}
              disabled={processing}
            >
              {processing ? "Saving..." : item.isNewComponent ? `✅ Create & Link` : `✅ Update ${displayName}`}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {items.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  i === currentIndex ? "bg-accent" : i < currentIndex ? "bg-accent/40" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function calcExpiry(startDate: string, years: number): string {
  const d = new Date(startDate);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

export default BackfillReviewCarousel;
