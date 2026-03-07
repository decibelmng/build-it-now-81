import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SYSTEMS_CATALOG,
  HIDDEN_SUB_KEYS,
  getSystemAnnualCost,
  getTotalAnnualCost,
  getSystemComponentCount,
  type HomeSystemsRegistry,
  type SystemCatalogEntry,
  type SystemRegistryEntry,
} from "@/lib/homeSystemsRegistry";

// Section grouping
const SECTIONS = [
  { label: "Core Systems", keys: ["roofing", "hvac", "plumbing", "electrical"] },
  { label: "Interior & Appliances", keys: ["interior", "appliances", "bathrooms"] },
  { label: "Structure & Exterior", keys: ["foundation", "exterior"] },
  { label: "Optional", keys: ["outdoor", "specialty"] },
];

interface SystemToggleGridProps {
  registry: HomeSystemsRegistry;
  onChange: (registry: HomeSystemsRegistry) => void;
  bathroomCount?: number;
  /** Show enrichment info per system (for settings view) */
  showEnrichmentInfo?: boolean;
  /** Property ID for enrichment queries */
  propertyId?: string;
  /** Called when user clicks "View in Inventory" */
  onViewInventory?: () => void;
  /** Show sticky footer with accuracy + cost + buttons */
  showFooter?: boolean;
  /** Show accuracy indicator (legacy compat) */
  showAccuracy?: boolean;
  /** Compact spacing for dialog use */
  compact?: boolean;
}

const SystemToggleGrid = ({
  registry,
  onChange,
  bathroomCount = 2,
  showEnrichmentInfo = false,
  propertyId,
  onViewInventory,
  showFooter = false,
  showAccuracy = false,
  compact = false,
}: SystemToggleGridProps) => {
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

  // Fetch enrichment data when needed
  const { data: enrichmentData = {} } = useQuery({
    queryKey: ["system_enrichment_grid", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("system_key, data_completeness, is_active")
        .eq("property_id", propertyId!)
        .or("is_active.is.null,is_active.eq.true");
      if (error) throw error;

      const result: Record<string, { count: number; totalCompleteness: number }> = {};
      for (const item of data || []) {
        const key = (item as any).system_key;
        if (!key) continue;
        const sysKey = key.split(":")[0];
        if (!result[sysKey]) result[sysKey] = { count: 0, totalCompleteness: 0 };
        result[sysKey].count++;
        result[sysKey].totalCompleteness += item.data_completeness || 0;
      }
      return result;
    },
    enabled: !!propertyId && showEnrichmentInfo,
  });

  const toggleSystem = (sysKey: string) => {
    const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
    if (!sys) return;
    const current = registry[sysKey] || { enabled: false, quantity: 1, components: {} };
    const newEnabled = !current.enabled;

    let components = { ...current.components };
    if (newEnabled && sys.quantityType !== "subtoggles") {
      for (const comp of sys.components) {
        if (comp.autoCreate && !components[comp.key]?.enabled) {
          let qty = comp.defaultQuantity;
          if (comp.quantitySource === "bathrooms") qty = bathroomCount;
          components[comp.key] = { enabled: true, quantity: qty };
        }
      }
    }

    onChange({
      ...registry,
      [sysKey]: { ...current, enabled: newEnabled, components },
    });
  };

  const setSystemQuantity = (sysKey: string, qty: number) => {
    const current = registry[sysKey] || { enabled: true, quantity: 1, components: {} };
    const clamped = Math.max(1, Math.min(10, qty));
    onChange({
      ...registry,
      [sysKey]: { ...current, quantity: clamped },
    });
  };

  const toggleSubComponent = (sysKey: string, compKey: string) => {
    const current = registry[sysKey] || { enabled: true, quantity: 1, components: {} };
    const compEntry = current.components[compKey] || { enabled: false, quantity: 1 };
    const newEnabled = !compEntry.enabled;

    const newComponents = {
      ...current.components,
      [compKey]: { ...compEntry, enabled: newEnabled },
    };

    // Handle linked components
    const LINKED: Record<string, string[]> = {
      pool: ["pool_pump"],
      solar_panels: ["solar_inverter"],
    };
    if (LINKED[compKey]) {
      for (const childKey of LINKED[compKey]) {
        newComponents[childKey] = { ...newComponents[childKey], enabled: newEnabled, quantity: newComponents[childKey]?.quantity ?? 1 };
      }
    }

    onChange({
      ...registry,
      [sysKey]: { ...current, components: newComponents },
    });
  };

  const toggleComponentExpand = (sysKey: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(sysKey)) next.delete(sysKey);
      else next.add(sysKey);
      return next;
    });
  };

  const enabledCount = Object.values(registry).filter((r) => r?.enabled).length;
  const accuracy = Math.min(65, 20 + 20 + enabledCount * 3);
  const totalCost = getTotalAnnualCost(registry);

  const renderSystemCard = (sys: SystemCatalogEntry) => {
    const entry = registry[sys.key] || { enabled: false, quantity: 1, components: {} };
    const annualCost = getSystemAnnualCost(sys.key, registry);
    const compCount = getSystemComponentCount(sys, entry);
    const isCompExpanded = expandedComponents.has(sys.key);
    const enrichment = enrichmentData[sys.key];

    return (
      <Card
        key={sys.key}
        className={`border-2 transition-all ${
          entry.enabled
            ? "border-accent/30 bg-background"
            : "border-border/50 bg-muted/30"
        }`}
      >
        <CardContent className={compact ? "p-3 space-y-0" : "p-4 space-y-0"}>
          {/* Top row: icon + label + description + switch */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{sys.icon}</span>
              <div className="min-w-0">
                <span className="font-body text-sm font-semibold block">{sys.label}</span>
                <span className="font-body text-xs text-muted-foreground block">{sys.description}</span>
              </div>
            </div>
            <Switch
              checked={entry.enabled}
              onCheckedChange={() => toggleSystem(sys.key)}
            />
          </div>

          {/* Quantity controls (only when enabled) */}
          {entry.enabled && (
            <div
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: entry.enabled ? "500px" : "0px" }}
            >
              {/* Stepper */}
              {sys.quantityType === "stepper" && (
                <div className="flex items-center justify-between border-t border-border/30 pt-2 mt-2">
                  <span className="font-body text-xs text-muted-foreground">{sys.quantityLabel}</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-l-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      onClick={() => setSystemQuantity(sys.key, (entry.quantity || 1) - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <div className="flex h-7 w-9 items-center justify-center bg-secondary/50 font-body text-sm font-semibold">
                      {entry.quantity || 1}
                    </div>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-r-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      onClick={() => setSystemQuantity(sys.key, (entry.quantity || 1) + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Inferred */}
              {sys.quantityType === "inferred" && (
                <div className="flex items-center justify-between border-t border-border/30 pt-2 mt-2">
                  <span className="font-body text-xs text-muted-foreground">From your property info</span>
                  <Badge variant="outline" className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-xs font-semibold border-0">
                    {bathroomCount} {sys.quantityLabel}
                  </Badge>
                </div>
              )}

              {/* Sub-toggles */}
              {sys.quantityType === "subtoggles" && (
                <div className="border-t border-border/30 pt-2 mt-2 space-y-1.5">
                  {sys.components
                    .filter((comp) => !HIDDEN_SUB_KEYS.has(comp.key))
                    .map((comp) => {
                      const compEntry = entry.components[comp.key] || { enabled: false, quantity: 1 };
                      return (
                        <div key={comp.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-body text-xs">{comp.label}</span>
                            <span className="font-body text-[10px] text-muted-foreground">${comp.annualCost}/yr</span>
                          </div>
                          <Switch
                            checked={compEntry.enabled}
                            onCheckedChange={() => toggleSubComponent(sys.key, comp.key)}
                            className="scale-75"
                          />
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Enrichment info (settings view) */}
              {showEnrichmentInfo && enrichment && enrichment.count > 0 && (
                <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
                  <p className="font-body text-xs text-muted-foreground">
                    {enrichment.count} item{enrichment.count !== 1 ? "s" : ""} · {enrichment.count > 0 ? Math.round(enrichment.totalCompleteness / enrichment.count) : 0}% avg completeness
                  </p>
                  {onViewInventory && (
                    <button
                      type="button"
                      onClick={onViewInventory}
                      className="font-body text-xs text-accent hover:underline"
                    >
                      View in Inventory →
                    </button>
                  )}
                </div>
              )}

              {/* Component expand/collapse link */}
              {compCount > 0 && (
                <div className="border-t border-border/30 pt-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => toggleComponentExpand(sys.key)}
                    className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {isCompExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {compCount} component{compCount !== 1 ? "s" : ""} will be tracked
                  </button>

                  {isCompExpanded && (
                    <div className="mt-1.5 space-y-1 pl-1">
                      {sys.components.map((comp) => {
                        const compEntry = entry.components[comp.key];
                        const isEnabled = sys.quantityType === "subtoggles"
                          ? compEntry?.enabled
                          : (compEntry?.enabled ?? comp.autoCreate);
                        if (!isEnabled) return null;

                        let qty = 1;
                        if (comp.perUnit) {
                          if (comp.quantitySource === "zones") qty = entry.quantity || 1;
                          else if (comp.quantitySource === "bathrooms") qty = compEntry?.quantity ?? bathroomCount;
                        }

                        return (
                          <div key={comp.key} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 rounded-full ${comp.autoCreate ? "bg-accent" : "bg-muted-foreground/40"}`} />
                              <span className="font-body">{comp.label}</span>
                              {qty > 1 && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-semibold">
                                  ×{qty}
                                </Badge>
                              )}
                            </div>
                            <span className="font-body text-muted-foreground">${comp.annualCost * qty}/yr</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const systems = section.keys
          .map((k) => SYSTEMS_CATALOG.find((s) => s.key === k))
          .filter(Boolean) as SystemCatalogEntry[];

        return (
          <div key={section.label}>
            <h4 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {section.label}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {systems.map(renderSystemCard)}
            </div>
          </div>
        );
      })}

      {/* Accuracy + cost footer */}
      {(showAccuracy || showFooter) && (
        <div className="space-y-3 pt-2 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2 -mx-1 px-1 border-t border-border/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-body text-xs text-muted-foreground mb-1">
                Forecast accuracy: ~{accuracy}%
              </p>
              <Progress value={accuracy} className="h-2" />
            </div>
            <div className="text-right shrink-0">
              <p className="font-body text-xs text-muted-foreground">Est. annual cost</p>
              <p className="font-body text-sm font-semibold text-accent">
                ${totalCost.toLocaleString()}/yr
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemToggleGrid;
