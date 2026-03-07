/**
 * Home Systems Registry
 * Canonical catalog of home systems and utilities for syncing
 * the registry to the savings forecast and inventory.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SystemCatalogEntry {
  key: string;
  label: string;
  iconName: string;
  category: string;
  replacementCost: number;
  lifespanYears: number;
  annualCost: number;
  defaultEnabled: boolean;
  supportsQuantity: boolean;
  defaultQuantity: number;
}

export const SYSTEMS_CATALOG: SystemCatalogEntry[] = [
  { key: "roof", label: "Roof", iconName: "Home", category: "roofing", replacementCost: 10000, lifespanYears: 25, annualCost: 400, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "hvac", label: "HVAC System", iconName: "Wind", category: "hvac", replacementCost: 7500, lifespanYears: 18, annualCost: 417, defaultEnabled: true, supportsQuantity: true, defaultQuantity: 1 },
  { key: "water_heater", label: "Water Heater", iconName: "Droplets", category: "plumbing", replacementCost: 2000, lifespanYears: 12, annualCost: 167, defaultEnabled: true, supportsQuantity: true, defaultQuantity: 1 },
  { key: "exterior_paint", label: "Exterior Paint", iconName: "Paintbrush", category: "exterior", replacementCost: 5000, lifespanYears: 8, annualCost: 625, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "flooring", label: "Flooring", iconName: "Layers", category: "structural", replacementCost: 3000, lifespanYears: 20, annualCost: 150, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "plumbing", label: "Plumbing System", iconName: "Droplets", category: "plumbing", replacementCost: 4000, lifespanYears: 30, annualCost: 300, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "electrical", label: "Electrical System", iconName: "Zap", category: "electrical", replacementCost: 3500, lifespanYears: 30, annualCost: 200, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "appliances", label: "Major Appliances", iconName: "Refrigerator", category: "appliance", replacementCost: 1200, lifespanYears: 12, annualCost: 100, defaultEnabled: true, supportsQuantity: true, defaultQuantity: 1 },
  { key: "garage_door", label: "Garage Door", iconName: "DoorOpen", category: "exterior", replacementCost: 1500, lifespanYears: 20, annualCost: 75, defaultEnabled: true, supportsQuantity: true, defaultQuantity: 1 },
  { key: "siding", label: "Siding", iconName: "LayoutPanelLeft", category: "exterior", replacementCost: 8000, lifespanYears: 25, annualCost: 320, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "windows", label: "Windows", iconName: "AppWindow", category: "exterior", replacementCost: 10000, lifespanYears: 25, annualCost: 400, defaultEnabled: true, supportsQuantity: false, defaultQuantity: 1 },
  { key: "fireplace", label: "Fireplace / Chimney", iconName: "Flame", category: "structural", replacementCost: 2500, lifespanYears: 25, annualCost: 100, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "pool", label: "Pool / Hot Tub", iconName: "Waves", category: "exterior", replacementCost: 5000, lifespanYears: 15, annualCost: 333, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "septic", label: "Septic System", iconName: "Container", category: "plumbing", replacementCost: 8000, lifespanYears: 25, annualCost: 320, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "well", label: "Well System", iconName: "Cylinder", category: "plumbing", replacementCost: 6000, lifespanYears: 20, annualCost: 300, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "solar", label: "Solar Panels", iconName: "Sun", category: "electrical", replacementCost: 15000, lifespanYears: 25, annualCost: 600, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "sprinkler", label: "Irrigation / Sprinkler", iconName: "Sprout", category: "exterior", replacementCost: 2000, lifespanYears: 15, annualCost: 133, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "fence", label: "Fencing", iconName: "Fence", category: "exterior", replacementCost: 3000, lifespanYears: 15, annualCost: 200, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
  { key: "deck_patio", label: "Deck / Patio", iconName: "Armchair", category: "exterior", replacementCost: 4000, lifespanYears: 15, annualCost: 267, defaultEnabled: false, supportsQuantity: false, defaultQuantity: 1 },
];

export interface RegistryEntry {
  enabled: boolean;
  quantity: number;
}

export type HomeSystemsRegistry = Record<string, RegistryEntry>;

/** Section groupings for UI display */
export const SYSTEM_GROUPS = [
  { label: "Core Systems", keys: ["roof", "hvac", "water_heater", "plumbing", "electrical"] },
  { label: "Interior", keys: ["flooring", "appliances", "fireplace"] },
  { label: "Exterior", keys: ["exterior_paint", "siding", "windows", "garage_door", "fence", "deck_patio", "pool", "sprinkler"] },
  { label: "Specialty", keys: ["septic", "well", "solar"] },
];

/**
 * Returns smart defaults per property type.
 */
export function getDefaultRegistry(propertyType: string): HomeSystemsRegistry {
  const registry: HomeSystemsRegistry = {};

  // Condo: only interior systems
  const condoEnabled = new Set(["hvac", "water_heater", "flooring", "appliances"]);

  for (const sys of SYSTEMS_CATALOG) {
    let enabled: boolean;

    switch (propertyType) {
      case "condo":
        enabled = condoEnabled.has(sys.key);
        break;
      case "townhouse":
        enabled = sys.key === "garage_door" ? false : sys.defaultEnabled;
        break;
      case "single_family":
      case "multi_family":
      case "other":
      default:
        enabled = sys.defaultEnabled;
        break;
    }

    registry[sys.key] = {
      enabled,
      quantity: sys.defaultQuantity,
    };
  }

  return registry;
}

/**
 * Returns catalog entries for only enabled systems, with quantity from registry.
 */
export function getEnabledSystems(
  homeSystems: HomeSystemsRegistry | null | undefined
): (SystemCatalogEntry & { quantity: number })[] {
  if (!homeSystems) return [];

  return SYSTEMS_CATALOG.filter((sys) => homeSystems[sys.key]?.enabled).map((sys) => ({
    ...sys,
    quantity: homeSystems[sys.key]?.quantity ?? sys.defaultQuantity,
  }));
}

/**
 * Syncs the registry to the home_items inventory.
 * Creates skeleton items for enabled systems, deactivates items for disabled systems.
 */
export async function syncRegistryToInventory(
  propertyId: string,
  userId: string,
  homeSystems: HomeSystemsRegistry,
  existingItems: Array<{
    id: string;
    system_key: string | null;
    is_registry_skeleton: boolean | null;
    is_active: boolean | null;
    data_completeness: number;
    category: string;
  }>
) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; changes: Record<string, unknown> }> = [];

  for (const sys of SYSTEMS_CATALOG) {
    const entry = homeSystems[sys.key];
    if (!entry) continue;

    const matchingItems = existingItems.filter((i) => i.system_key === sys.key);

    if (entry.enabled) {
      const activeItems = matchingItems.filter((i) => i.is_active !== false);
      const inactiveItems = matchingItems.filter((i) => i.is_active === false);

      if (activeItems.length < entry.quantity) {
        // Re-enable inactive items first (prefer highest completeness)
        const toReactivate = inactiveItems
          .sort((a, b) => b.data_completeness - a.data_completeness)
          .slice(0, entry.quantity - activeItems.length);

        for (const item of toReactivate) {
          updates.push({ id: item.id, changes: { is_active: true } });
        }

        // Create new skeletons for any remaining gap
        const gap = entry.quantity - activeItems.length - toReactivate.length;
        for (let i = 0; i < gap; i++) {
          const existingCount = activeItems.length + toReactivate.length + i;
          const name = entry.quantity === 1 && existingCount === 0
            ? sys.label
            : `${sys.label} ${existingCount + 1}`;

          inserts.push({
            property_id: propertyId,
            user_id: userId,
            system_key: sys.key,
            is_registry_skeleton: true,
            is_active: true,
            item_type: "home_component",
            category: sys.category,
            name,
            data_completeness: 0,
          });
        }
      } else if (activeItems.length > entry.quantity) {
        // Deactivate excess (least enriched first)
        const sorted = [...activeItems].sort((a, b) => a.data_completeness - b.data_completeness);
        const toDeactivate = sorted.slice(0, activeItems.length - entry.quantity);
        for (const item of toDeactivate) {
          updates.push({ id: item.id, changes: { is_active: false } });
        }
      }
    } else {
      // System disabled — deactivate all matching items
      for (const item of matchingItems.filter((i) => i.is_active !== false)) {
        updates.push({ id: item.id, changes: { is_active: false } });
      }
    }
  }

  // Execute inserts
  if (inserts.length > 0) {
    const { error } = await supabase.from("home_items").insert(inserts as any);
    if (error) throw error;
  }

  // Execute updates
  for (const upd of updates) {
    const { error } = await supabase
      .from("home_items")
      .update(upd.changes as any)
      .eq("id", upd.id);
    if (error) throw error;
  }

  return { inserted: inserts.length, updated: updates.length };
}

/**
 * Infers a registry from existing home_items by matching categories.
 */
export function inferRegistryFromExistingItems(
  existingItems: Array<{ id: string; category: string; system_key?: string | null }>
): {
  registry: HomeSystemsRegistry;
  itemUpdates: Array<{ id: string; system_key: string }>;
} {
  const registry = getDefaultRegistry("single_family");
  const itemUpdates: Array<{ id: string; system_key: string }> = [];

  // Build category → catalog key mapping
  const categoryToKeys: Record<string, string[]> = {};
  for (const sys of SYSTEMS_CATALOG) {
    if (!categoryToKeys[sys.category]) categoryToKeys[sys.category] = [];
    categoryToKeys[sys.category].push(sys.key);
  }

  // Count items per category
  const categoryCounts: Record<string, number> = {};
  for (const item of existingItems) {
    const cat = item.category?.toLowerCase().trim();
    if (!cat) continue;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Find matching catalog key for this item
    const keys = categoryToKeys[cat];
    if (keys && keys.length > 0) {
      // Use first matching key (best guess)
      const matchKey = keys[0];
      if (!item.system_key) {
        itemUpdates.push({ id: item.id, system_key: matchKey });
      }
    }
  }

  // Enable systems based on found categories and set quantities
  for (const sys of SYSTEMS_CATALOG) {
    const count = categoryCounts[sys.category] || 0;
    if (count > 0) {
      registry[sys.key] = { enabled: true, quantity: Math.max(count, 1) };
    }
    // Systems not found keep their defaults
  }

  return { registry, itemUpdates };
}
