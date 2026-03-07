import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Minus, Plus } from "lucide-react";
import * as Icons from "lucide-react";
import {
  SYSTEMS_CATALOG,
  SYSTEM_GROUPS,
  type HomeSystemsRegistry,
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
  const toggleSystem = (key: string) => {
    const current = registry[key] || { enabled: false, quantity: 1 };
    onChange({
      ...registry,
      [key]: { ...current, enabled: !current.enabled },
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    const current = registry[key] || { enabled: true, quantity: 1 };
    const newQty = Math.max(1, Math.min(10, current.quantity + delta));
    onChange({
      ...registry,
      [key]: { ...current, quantity: newQty },
    });
  };

  const enabledCount = Object.values(registry).filter((r) => r.enabled).length;
  const accuracy = Math.min(65, 20 + 20 + enabledCount * 3);

  return (
    <div className="space-y-6">
      {SYSTEM_GROUPS.map((group) => (
        <div key={group.label}>
          <h4 className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {group.label}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {group.keys.map((key) => {
              const sys = SYSTEMS_CATALOG.find((s) => s.key === key);
              if (!sys) return null;
              const entry = registry[key] || { enabled: false, quantity: 1 };
              const IconComponent = (Icons as any)[sys.iconName] as React.ComponentType<{ className?: string }>;
              const enrichment = enrichmentData?.[key];

              return (
                <Card
                  key={key}
                  className={`border transition-colors ${
                    entry.enabled
                      ? "border-accent/50 bg-accent/5"
                      : "border-border/50"
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {IconComponent && (
                          <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-body text-sm font-medium truncate">
                          {sys.label}
                        </span>
                      </div>
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={() => toggleSystem(key)}
                      />
                    </div>

                    {entry.enabled && sys.supportsQuantity && (
                      <div className="flex items-center gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => changeQuantity(key, -1)}
                          disabled={entry.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-body text-sm w-6 text-center">
                          {entry.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => changeQuantity(key, 1)}
                          disabled={entry.quantity >= 10}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {entry.enabled && enrichment && (
                      <div className="space-y-1">
                        <p className="font-body text-xs text-muted-foreground">
                          {enrichment.count} item{enrichment.count !== 1 ? "s" : ""} tracked · {enrichment.avgCompleteness}% avg completeness
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
      ))}

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
