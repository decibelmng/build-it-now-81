import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import SystemToggleGrid from "./SystemToggleGrid";
import {
  inferRegistryFromExistingItems,
  syncRegistryToInventory,
  type HomeSystemsRegistry,
} from "@/lib/homeSystemsRegistry";

interface RegistryMigrationCardProps {
  propertyId: string;
  bathroomCount?: number;
  onNavigate?: (section: string) => void;
}

const RegistryMigrationCard = ({ propertyId, bathroomCount = 2, onNavigate }: RegistryMigrationCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [localRegistry, setLocalRegistry] = useState<HomeSystemsRegistry>({});
  const [saving, setSaving] = useState(false);

  const { data: property } = useQuery({
    queryKey: ["property_registry_check", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("home_systems, registry_completed")
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: existingItems = [] } = useQuery({
    queryKey: ["home_items_migration", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("id, category, system_key, is_registry_skeleton, is_active, data_completeness")
        .eq("property_id", propertyId)
        .eq("item_type", "home_component");
      if (error) throw error;
      return data || [];
    },
    enabled: !!propertyId,
  });

  if (dismissed) return null;
  if (!property || (property as any).registry_completed) return null;
  if (existingItems.length === 0) return null;

  const { registry: inferred, itemUpdates } = inferRegistryFromExistingItems(
    existingItems.map((i: any) => ({ id: i.id, category: i.category, system_key: i.system_key })),
    bathroomCount
  );

  const saveAndSync = async (reg: HomeSystemsRegistry) => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("properties")
        .update({ home_systems: reg, registry_completed: true } as any)
        .eq("id", propertyId);

      for (const upd of itemUpdates) {
        await supabase.from("home_items").update({ system_key: upd.system_key } as any).eq("id", upd.id);
      }

      const freshItems = await supabase
        .from("home_items")
        .select("id, system_key, is_registry_skeleton, is_active, data_completeness, category")
        .eq("property_id", propertyId);

      await syncRegistryToInventory(
        propertyId, user.id, reg,
        (freshItems.data || []).map((i: any) => ({
          id: i.id, system_key: i.system_key, is_registry_skeleton: i.is_registry_skeleton,
          is_active: i.is_active, data_completeness: i.data_completeness, category: i.category,
        })),
        bathroomCount
      );

      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      queryClient.invalidateQueries({ queryKey: ["property_registry"] });
      toast({ title: "✨ Home systems confirmed! Your savings forecast is now personalized." });
      setReviewOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="border-l-4 border-l-accent bg-accent/5 border-border/50">
        <CardContent className="p-5">
          <h3 className="font-display text-base font-semibold mb-1">🏠 Personalize your savings forecast</h3>
          <p className="font-body text-sm text-muted-foreground mb-3">
            We detected {existingItems.length} item{existingItems.length !== 1 ? "s" : ""} in your home. Confirm which systems you have to get a more accurate forecast.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
              onClick={() => { setLocalRegistry(inferred); setReviewOpen(true); }}
            >
              Review & Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full font-body text-xs"
              onClick={() => saveAndSync(inferred)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Auto-detect & Save"}
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              Remind me later
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Your Home Systems</DialogTitle>
          </DialogHeader>
          <SystemToggleGrid
            registry={localRegistry}
            onChange={setLocalRegistry}
            bathroomCount={bathroomCount}
            showAccuracy
            compact
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setReviewOpen(false)} className="rounded-full font-body">Cancel</Button>
            <Button
              onClick={() => saveAndSync(localRegistry)}
              disabled={saving}
              className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
            >
              {saving ? "Saving..." : "Confirm & Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RegistryMigrationCard;
