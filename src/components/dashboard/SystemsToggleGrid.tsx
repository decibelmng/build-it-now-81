import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight } from "lucide-react";
import * as Icons from "lucide-react";
import { useState } from "react";
import {
  SYSTEMS_CATALOG,
  type HomeSystemsRegistry,
  getSystemAnnualCost,
} from "@/lib/homeSystemsRegistry";

interface SystemsToggleGridProps {
  registry: HomeSystemsRegistry;
  onChange: (registry: HomeSystemsRegistry) => void;
  /** Show enrichment info per system */
  enrichmentData?: Record<string, { count: number; avgCompleteness: number }>;
  /** Called when user clicks "View in Inventory" */
  onViewInventory?: () => void;
  /** Show accuracy indicator */
  showAccuracy?: boolean;
}

const SystemsToggleGrid = ({
  registry,
  onChange,
  enrichmentData,
  onViewInventory,
  showAccuracy = false,
}: SystemsToggleGridProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleSystem = (key: string) => {
    const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
    if (!sys) return;
    const current = registry[key] || { enabled: false, components: {} };
    const newEnabled = !current.enabled;

    // When enabling a non-sub-toggle system, auto-enable autoCreate components
    let components = { ...current.components };
    if (newEnabled && !sys.hasSubToggles) {
      for (const comp of sys.components) {
        if (comp.autoCreate && !components[comp.key]?.enabled) {
          components[comp.key] = {
            enabled: true,
            quantity: components[comp.key]?.quantity ?? comp.defaultQuantity,
          };
        }
      }
    }

    onChange({
      ...registry,
      [key]: { ...current, enabled: newEnabled, components },
    });

    // Auto-expand sub-toggle systems when enabled
    if (newEnabled && sys.hasSubToggles) {
      setExpanded((prev) => new Set(prev).add(key));
    }
  };

  const toggleSubComponent = (sysKey: string, compKey: string) => {
    const current = registry[sysKey] || { enabled: true, components: {} };
    const compEntry = current.components[compKey] || { enabled: false, quantity: 1 };
    const newEnabled = !compEntry.enabled;

    const newComponents = {
      ...current.components,
      [compKey]: { ...compEntry, enabled: newEnabled },
    };

    // Handle linked components (e.g. pool → pool_pump)
    const linkedKey = `${sysKey}:${compKey}`;
    const LINKED: Record<string, string[]> = {
      "specialty:pool": ["pool_pump"],
      "specialty:solar_panels": ["solar_inverter"],
    };
    if (LINKED[linkedKey]) {
      for (const childKey of LINKED[linkedKey]) {
        if (newEnabled) {
          newComponents[childKey] = { enabled: true, quantity: newComponents[childKey]?.quantity ?? 1 };
        } else {
          newComponents[childKey] = { ...newComponents[childKey], enabled: false, quantity: newComponents[childKey]?.quantity ?? 1 };
        }
      }
    }

    onChange({
      ...registry,
      [sysKey]: { ...current, components: newComponents },
    });
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const enabledCount = Object.values(registry).filter((r) => r?.enabled).length;
  const accuracy = Math.min(65, 20 + 20 + enabledCount * 3);

  // Split systems into essential + optional for visual grouping
  const essentialSystems = SYSTEMS_CATALOG.filter((s) => !s.hasSubToggles);
  const optionalSystems = SYSTEMS_CATALOG.filter((s) => s.hasSubToggles);

  return (
    <div className="space-y-6">
      {/* Essential systems */}
      <div>
        <h4 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Home Systems
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {essentialSystems.map((sys) => {
            const entry = registry[sys.key] || { enabled: false, components: {} };
            const IconComponent = (Icons as any)[sys.iconName] as React.ComponentType<{ className?: string }>;
            const annualCost = getSystemAnnualCost(sys.key, registry);
            // Aggregate enrichment across all components
            const enrichment = enrichmentData
              ? Object.entries(enrichmentData)
                  .filter(([k]) => k.startsWith(`${sys.key}:`))
                  .reduce(
                    (acc, [, v]) => ({ count: acc.count + v.count, avgCompleteness: acc.avgCompleteness + v.avgCompleteness * v.count }),
                    { count: 0, avgCompleteness: 0 }
                  )
              : null;
            const avgComp = enrichment && enrichment.count > 0 ? Math.round(enrichment.avgCompleteness / enrichment.count) : 0;

            return (
              <Card
                key={sys.key}
                className={`border transition-colors ${
                  entry.enabled ? "border-accent/50 bg-accent/5" : "border-border/50"
                }`}
              >
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <span className="font-body text-sm font-medium block truncate">{sys.label}</span>
                        <span className="font-body text-[10px] text-muted-foreground block truncate">{sys.description}</span>
                      </div>
                    </div>
                    <Switch
                      checked={entry.enabled}
                      onCheckedChange={() => toggleSystem(sys.key)}
                    />
                  </div>

                  {entry.enabled && enrichment && enrichment.count > 0 && (
                    <div className="space-y-1">
                      <p className="font-body text-xs text-muted-foreground">
                        {enrichment.count} item{enrichment.count !== 1 ? "s" : ""} · {avgComp}% avg
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Optional systems with sub-toggles */}
      <div>
        <h4 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Optional
        </h4>
        <div className="space-y-3">
          {optionalSystems.map((sys) => {
            const entry = registry[sys.key] || { enabled: false, components: {} };
            const IconComponent = (Icons as any)[sys.iconName] as React.ComponentType<{ className?: string }>;
            const isExpanded = expanded.has(sys.key);

            return (
              <Card
                key={sys.key}
                className={`border transition-colors ${
                  entry.enabled ? "border-accent/50 bg-accent/5" : "border-border/50"
                }`}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <span className="font-body text-sm font-medium block truncate">{sys.label}</span>
                        <span className="font-body text-[10px] text-muted-foreground block truncate">{sys.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={() => toggleSystem(sys.key)}
                      />
                      {entry.enabled && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(sys.key)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {entry.enabled && isExpanded && (
                    <div className="pl-6 space-y-1.5 border-t border-border/30 pt-2">
                      {sys.components.map((comp) => {
                        // Hide child components (pool_pump, solar_inverter) — they auto-toggle with parent
                        if (comp.key === "pool_pump" || comp.key === "solar_inverter") return null;
                        const compEntry = entry.components[comp.key] || { enabled: false, quantity: comp.defaultQuantity };
                        return (
                          <div key={comp.key} className="flex items-center justify-between">
                            <span className="font-body text-xs">{comp.label}</span>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {showAccuracy && (
        <div className="space-y-2 pt-2">
          <Progress value={accuracy} className="h-2" />
          <p className="font-body text-xs text-muted-foreground text-center">
            Forecast accuracy: ~{accuracy}%
          </p>
        </div>
      )}
    </div>
  );
};

export default SystemsToggleGrid;
