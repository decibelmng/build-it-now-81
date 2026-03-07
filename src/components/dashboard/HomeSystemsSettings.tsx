import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Shield, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SystemToggleGrid from "./SystemToggleGrid";
import {
  getDefaultRegistry,
  syncRegistryToInventory,
  backfillSystemKeys,
  SYSTEMS_CATALOG,
  migrateOldRegistry,
  type HomeSystemsRegistry,
} from "@/lib/homeSystemsRegistry";

interface HomeSystemsSettingsProps {
  propertyId: string;
  propertyType: string;
  homeSystems: HomeSystemsRegistry | null;
  registryCompleted: boolean;
  onNavigate?: (section: string) => void;
  bathroomCount?: number;
}

const HomeSystemsSettings = ({
  propertyId,
  propertyType,
  homeSystems: rawHomeSystems,
  registryCompleted,
  onNavigate,
  bathroomCount = 2,
}: HomeSystemsSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);

  const homeSystems = rawHomeSystems
    ? (migrateOldRegistry(rawHomeSystems, bathroomCount) || rawHomeSystems as HomeSystemsRegistry)
    : null;

  const [localRegistry, setLocalRegistry] = useState<HomeSystemsRegistry>(
    homeSystems || getDefaultRegistry(propertyType, bathroomCount)
  );
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<{
    key: string;
    label: string;
    itemCount: number;
    pendingRegistry: HomeSystemsRegistry;
  } | null>(null);

  const saveRegistry = async (newRegistry: HomeSystemsRegistry) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ home_systems: newRegistry, registry_completed: true } as any)
        .eq("id", propertyId);
      if (error) throw error;

      const { data: existingItems = [] } = await supabase
        .from("home_items")
        .select("id, system_key, is_registry_skeleton, is_active, data_completeness, category")
        .eq("property_id", propertyId);

      await syncRegistryToInventory(
        propertyId, user.id, newRegistry,
        (existingItems || []).map((i: any) => ({
          id: i.id, system_key: i.system_key, is_registry_skeleton: i.is_registry_skeleton,
          is_active: i.is_active, data_completeness: i.data_completeness, category: i.category,
        })),
        bathroomCount
      );

      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      queryClient.invalidateQueries({ queryKey: ["system_enrichment_grid"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRegistryChange = async (newRegistry: HomeSystemsRegistry) => {
    // Check if a system with data is being disabled
    for (const key of Object.keys(newRegistry)) {
      const wasEnabled = localRegistry[key]?.enabled;
      const nowEnabled = newRegistry[key]?.enabled;

      if (wasEnabled && !nowEnabled && registryCompleted) {
        // Quick check for items - we'll let the grid's enrichment query handle the count
        const { data: items } = await supabase
          .from("home_items")
          .select("id, data_completeness")
          .like("system_key", `${key}:%`)
          .eq("property_id", propertyId)
          .or("is_active.is.null,is_active.eq.true");

        const enrichedItems = (items || []).filter((i: any) => i.data_completeness > 0);
        if (enrichedItems.length > 0) {
          const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
          setConfirmDisable({
            key,
            label: sys?.label || key,
            itemCount: items?.length || 0,
            pendingRegistry: newRegistry,
          });
          return;
        }
      }
    }

    setLocalRegistry(newRegistry);

    // Toast for newly enabled systems
    for (const key of Object.keys(newRegistry)) {
      const wasEnabled = localRegistry[key]?.enabled;
      const nowEnabled = newRegistry[key]?.enabled;
      if (!wasEnabled && nowEnabled) {
        const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
        toast({ title: `✨ ${sys?.label} enabled! Added to your savings forecast.` });
      }
    }

    // Toast for quantity changes
    for (const key of Object.keys(newRegistry)) {
      const wasQty = localRegistry[key]?.quantity;
      const nowQty = newRegistry[key]?.quantity;
      if (wasQty !== nowQty && newRegistry[key]?.enabled) {
        const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
        if (sys) toast({ title: `Updated to ${nowQty} ${sys.label} unit(s)` });
      }
    }

    await saveRegistry(newRegistry);
  };

  const confirmDisableSystem = async () => {
    if (!confirmDisable) return;
    setLocalRegistry(confirmDisable.pendingRegistry);
    setConfirmDisable(null);
    await saveRegistry(confirmDisable.pendingRegistry);
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
            <SystemToggleGrid
              registry={localRegistry}
              onChange={setLocalRegistry}
              bathroomCount={bathroomCount}
              showAccuracy
              compact
            />
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setSetupOpen(false)} className="rounded-full font-body">Cancel</Button>
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

  const handleRescan = async () => {
    if (!user) return;
    setRescanning(true);
    try {
      const result = await backfillSystemKeys(propertyId, user.id);
      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["documents_hub"] });
      toast({
        title: "Re-scan complete",
        description: `Updated ${result.logsUpdated} logs, ${result.docsUpdated} documents, ${result.itemsUpdated} items.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRescanning(false);
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">Home Systems</h3>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full font-body text-xs gap-1.5"
            onClick={handleRescan}
            disabled={rescanning}
          >
            <RefreshCw className={`h-3 w-3 ${rescanning ? "animate-spin" : ""}`} />
            {rescanning ? "Scanning..." : "Re-scan & Link"}
          </Button>
        </div>
        <SystemToggleGrid
          registry={localRegistry}
          onChange={handleRegistryChange}
          bathroomCount={bathroomCount}
          showEnrichmentInfo
          propertyId={propertyId}
          onViewInventory={() => onNavigate?.("home-inventory")}
        />
      </div>

      <AlertDialog open={!!confirmDisable} onOpenChange={() => setConfirmDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {confirmDisable?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {confirmDisable?.label} from your savings forecast and hide {confirmDisable?.itemCount} inventory item{confirmDisable?.itemCount !== 1 ? "s" : ""}. They won't be deleted — you can re-enable anytime.
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
