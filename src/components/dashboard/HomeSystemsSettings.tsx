import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SystemsToggleGrid from "./SystemsToggleGrid";
import {
  getDefaultRegistry,
  syncRegistryToInventory,
  SYSTEMS_CATALOG,
  type HomeSystemsRegistry,
} from "@/lib/homeSystemsRegistry";

interface HomeSystemsSettingsProps {
  propertyId: string;
  propertyType: string;
  homeSystems: HomeSystemsRegistry | null;
  registryCompleted: boolean;
  onNavigate?: (section: string) => void;
}

const HomeSystemsSettings = ({
  propertyId,
  propertyType,
  homeSystems,
  registryCompleted,
  onNavigate,
}: HomeSystemsSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);
  const [localRegistry, setLocalRegistry] = useState<HomeSystemsRegistry>(
    homeSystems || getDefaultRegistry(propertyType)
  );
  const [saving, setSaving] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<{
    key: string;
    label: string;
    itemCount: number;
  } | null>(null);

  // Fetch enrichment data for enabled systems
  const { data: enrichmentData = {} } = useQuery({
    queryKey: ["system_enrichment", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("system_key, data_completeness, is_active")
        .eq("property_id", propertyId)
        .or("is_active.is.null,is_active.eq.true");
      if (error) throw error;

      const result: Record<string, { count: number; avgCompleteness: number }> = {};
      for (const item of data || []) {
        const key = (item as any).system_key;
        if (!key) continue;
        if (!result[key]) result[key] = { count: 0, avgCompleteness: 0 };
        result[key].count++;
        result[key].avgCompleteness += item.data_completeness || 0;
      }
      for (const key of Object.keys(result)) {
        if (result[key].count > 0) {
          result[key].avgCompleteness = Math.round(result[key].avgCompleteness / result[key].count);
        }
      }
      return result;
    },
    enabled: !!propertyId && registryCompleted,
  });

  const saveRegistry = async (newRegistry: HomeSystemsRegistry) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ home_systems: newRegistry, registry_completed: true } as any)
        .eq("id", propertyId);
      if (error) throw error;

      // Get existing items for sync
      const { data: existingItems = [] } = await supabase
        .from("home_items")
        .select("id, system_key, is_registry_skeleton, is_active, data_completeness, category")
        .eq("property_id", propertyId);

      await syncRegistryToInventory(
        propertyId, user.id, newRegistry,
        (existingItems || []).map((i: any) => ({
          id: i.id,
          system_key: i.system_key,
          is_registry_skeleton: i.is_registry_skeleton,
          is_active: i.is_active,
          data_completeness: i.data_completeness,
          category: i.category,
        }))
      );

      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      queryClient.invalidateQueries({ queryKey: ["system_enrichment"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRegistryChange = async (newRegistry: HomeSystemsRegistry) => {
    // Check if a system is being disabled that has enriched items
    for (const key of Object.keys(newRegistry)) {
      const wasEnabled = localRegistry[key]?.enabled;
      const nowEnabled = newRegistry[key]?.enabled;

      if (wasEnabled && !nowEnabled) {
        const enrichment = enrichmentData[key];
        if (enrichment && enrichment.avgCompleteness > 0) {
          const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
          setConfirmDisable({
            key,
            label: sys?.label || key,
            itemCount: enrichment.count,
          });
          return; // Don't save yet, wait for confirmation
        }
      }
    }

    setLocalRegistry(newRegistry);

    // Show toast for newly enabled systems
    for (const key of Object.keys(newRegistry)) {
      const wasEnabled = localRegistry[key]?.enabled;
      const nowEnabled = newRegistry[key]?.enabled;
      if (!wasEnabled && nowEnabled) {
        const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
        toast({ title: `✨ ${sys?.label} enabled! Added to your savings forecast.` });
      }
    }

    // Auto-save
    await saveRegistry(newRegistry);
  };

  const confirmDisableSystem = async () => {
    if (!confirmDisable) return;
    const newRegistry = {
      ...localRegistry,
      [confirmDisable.key]: { ...localRegistry[confirmDisable.key], enabled: false },
    };
    setLocalRegistry(newRegistry);
    setConfirmDisable(null);
    await saveRegistry(newRegistry);
  };

  // Setup banner for new users
  if (!registryCompleted || !homeSystems) {
    return (
      <>
        <Card className="border-l-4 border-l-accent bg-accent/5 border-border/50">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shrink-0">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-base font-semibold mb-1">Set up your home systems</h3>
              <p className="font-body text-sm text-muted-foreground mb-3">
                Tell us what systems your home has to get a personalized savings forecast. Takes about 30 seconds.
              </p>
              <Button
                onClick={() => setSetupOpen(true)}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                size="sm"
              >
                Get Started
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">What does your home have?</DialogTitle>
            </DialogHeader>
            <SystemsToggleGrid
              registry={localRegistry}
              onChange={setLocalRegistry}
              showAccuracy
            />
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setSetupOpen(false)} className="rounded-full font-body">
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await saveRegistry(localRegistry);
                  setSetupOpen(false);
                  toast({ title: "✨ Home systems saved! Your forecast is now personalized." });
                }}
                disabled={saving}
                className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
              >
                {saving ? "Saving..." : "Save Systems"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full settings view
  return (
    <>
      <div className="mt-6">
        <h3 className="font-display text-lg font-semibold mb-4">Home Systems</h3>
        <SystemsToggleGrid
          registry={localRegistry}
          onChange={handleRegistryChange}
          enrichmentData={enrichmentData}
          onViewInventory={() => onNavigate?.("home-inventory")}
        />
      </div>

      <AlertDialog open={!!confirmDisable} onOpenChange={() => setConfirmDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {confirmDisable?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Remove {confirmDisable?.label} from your savings forecast</li>
                <li>Hide {confirmDisable?.itemCount} inventory item{confirmDisable?.itemCount !== 1 ? "s" : ""} — they won't be deleted</li>
              </ul>
              <p className="mt-2">You can re-enable anytime to bring everything back.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisableSystem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HomeSystemsSettings;
