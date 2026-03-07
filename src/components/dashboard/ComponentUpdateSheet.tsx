import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { calculateComponentCompleteness } from "@/lib/componentCompleteness";

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

function getHeader(componentType: string | null): { emoji: string; title: string } {
  const t = (componentType || "").toLowerCase();
  if (t.includes("hvac")) return { emoji: "✨", title: "Nice! Want to update your HVAC record?" };
  if (t.includes("roof")) return { emoji: "🏠", title: "Roof work logged! Update your roof record?" };
  if (t.includes("appliance") || t.includes("dishwasher") || t.includes("refrigerator") || t.includes("washer") || t.includes("dryer") || t.includes("oven") || t.includes("stove") || t.includes("microwave"))
    return { emoji: "🔧", title: "New appliance info detected!" };
  if (t.includes("plumbing")) return { emoji: "💧", title: "Plumbing update logged!" };
  if (t.includes("electric")) return { emoji: "⚡", title: "Electrical work noted!" };
  return { emoji: "✨", title: "Maintenance logged! Update your home record?" };
}

interface ComponentUpdateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  logDate: string;
  logCost: string;
  logContactName: string;
  componentId: string | null;
  componentName: string | null;
  componentType: string | null;
  isNewComponent: boolean;
  propertyId: string;
  existingComponent?: {
    install_date?: string | null;
    brand?: string | null;
    model?: string | null;
    warranty_expiry?: string | null;
    last_maintained?: string | null;
    notes?: string | null;
    estimated_value?: number | null;
    data_completeness?: number;
  } | null;
}

const ComponentUpdateSheet = ({
  open, onOpenChange, logId, logDate, logCost, logContactName,
  componentId, componentName, componentType, isNewComponent, propertyId,
  existingComponent,
}: ComponentUpdateSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [warrantyLength, setWarrantyLength] = useState("");
  const [warrantyProvider, setWarrantyProvider] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [saving, setSaving] = useState(false);

  const currentCompleteness = existingComponent?.data_completeness ?? 0;

  // Project what completeness would be with new fields
  const projectedComponent = {
    install_date: logDate || existingComponent?.install_date || null,
    brand: brand || existingComponent?.brand || null,
    model: model || existingComponent?.model || null,
    warranty_expiry: warrantyLength || existingComponent?.warranty_expiry || null,
    last_maintained: logDate || existingComponent?.last_maintained || null,
    notes: existingComponent?.notes || null,
    estimated_value: logCost ? parseFloat(logCost) : existingComponent?.estimated_value ?? null,
    contact_id: logContactName || null,
    last_updated_from_log_id: logId,
  };
  const projectedCompleteness = calculateComponentCompleteness(projectedComponent);
  const improvementPct = Math.max(0, projectedCompleteness - currentCompleteness);

  const header = getHeader(componentType);
  const displayName = componentName || componentType || "Component";

  const handleUpdate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let targetComponentId = componentId;

      // If new component, create it first
      if (isNewComponent || !targetComponentId) {
        const { data: newComp, error: createErr } = await supabase
          .from("home_items")
          .insert({
            user_id: user.id,
            property_id: propertyId,
            name: displayName,
            category: (componentType || "general").toLowerCase(),
            item_type: "home_component",
            brand: brand || null,
            model: model || null,
            install_date: logDate || null,
            last_maintained: logDate || null,
            estimated_value: logCost ? parseFloat(logCost) : null,
            warranty_expiry: warrantyLength && warrantyLength !== "lifetime" && logDate
              ? calculateWarrantyExpiry(logDate, parseInt(warrantyLength))
              : warrantyLength === "lifetime" ? "2099-12-31" : null,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        targetComponentId = newComp.id;
      } else {
        // Update existing component
        const updates: Record<string, unknown> = {
          last_maintained: logDate || undefined,
          last_updated_from_log_id: logId,
          last_updated_at: new Date().toISOString(),
        };
        if (brand) updates.brand = brand;
        if (model) updates.model = model;
        if (logCost) updates.estimated_value = parseFloat(logCost);
        if (warrantyLength && logDate) {
          updates.warranty_expiry = warrantyLength === "lifetime"
            ? "2099-12-31"
            : calculateWarrantyExpiry(logDate, parseInt(warrantyLength));
        }
        if (nextServiceDate) updates.last_maintained = nextServiceDate;

        const { error: updateErr } = await supabase
          .from("home_items")
          .update(updates)
          .eq("id", targetComponentId);
        if (updateErr) throw updateErr;
      }

      // Update data_completeness on the component
      const finalCompleteness = projectedCompleteness;
      await supabase
        .from("home_items")
        .update({ data_completeness: finalCompleteness, last_updated_from_log_id: logId, last_updated_at: new Date().toISOString() })
        .eq("id", targetComponentId!);

      // Update maintenance log: set component_id and component_updated
      await supabase
        .from("maintenance_logs")
        .update({ component_id: targetComponentId, component_updated: true })
        .eq("id", logId);

      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });

      toast({ title: `✅ ${displayName} updated! Savings forecast accuracy: ${finalCompleteness}%.` });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not update component";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await supabase
      .from("maintenance_logs")
      .update({ component_update_skipped: true })
      .eq("id", logId);
    toast({ title: "No worries! Update anytime from Components." });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="font-display text-lg">
            {header.emoji} {header.title}
          </SheetTitle>
          <p className="font-body text-sm text-muted-foreground">
            We can update your Home Components with the new details so your savings forecast stays accurate.
          </p>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          {/* Pre-filled read-only fields */}
          <div className="grid grid-cols-3 gap-3">
            {logDate && (
              <div className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">Date</Label>
                <Input value={logDate} disabled className="font-body h-8 text-sm bg-muted/50" />
              </div>
            )}
            {logCost && (
              <div className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">Cost</Label>
                <Input value={`$${logCost}`} disabled className="font-body h-8 text-sm bg-muted/50" />
              </div>
            )}
            {logContactName && (
              <div className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">Contractor</Label>
                <Input value={logContactName} disabled className="font-body h-8 text-sm bg-muted/50" />
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-body text-xs">Model / Brand</Label>
              <Input placeholder="e.g. Carrier 24ACC6" value={brand || model} onChange={(e) => { setBrand(e.target.value); setModel(e.target.value); }} className="font-body h-8 text-sm" />
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

          {/* Micro-copy */}
          {improvementPct > 0 && (
            <p className="font-body text-xs text-muted-foreground text-center">
              🎯 This update improves your savings forecast accuracy by ~{improvementPct}%
            </p>
          )}

          {/* Buttons */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
              onClick={handleUpdate}
              disabled={saving}
            >
              {saving ? "Saving..." : isNewComponent ? `✅ Create & Link ${displayName}` : `✅ Update ${displayName} Record`}
            </Button>
            <Button variant="ghost" className="font-body text-sm" onClick={handleSkip}>
              Skip for Now
            </Button>
            <p className="font-body text-xs text-muted-foreground">
              You can update this later from your Components tab
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function calculateWarrantyExpiry(startDate: string, years: number): string {
  const d = new Date(startDate);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

export default ComponentUpdateSheet;
