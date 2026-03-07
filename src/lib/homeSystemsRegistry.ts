/**
 * Home Systems Registry — Two-Tier Model
 * Systems → Components for savings forecasting and inventory tracking.
 * Systems are what users toggle. Components are the specific items
 * that get tracked in inventory and drive forecast predictions.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface ComponentCatalogEntry {
  key: string;
  label: string;
  replacementCostLow: number;
  replacementCostHigh: number;
  lifespanYears: number;
  annualCost: number;
  autoCreate: boolean;
  quantitySource: "fixed" | "bathrooms" | "zones" | "manual";
  defaultQuantity: number;
}

export interface SystemCatalogEntry {
  key: string;
  label: string;
  iconName: string;
  description: string;
  defaultEnabled: boolean;
  defaultEnabledCondo: boolean;
  hasSubToggles: boolean;
  components: ComponentCatalogEntry[];
}

export interface ComponentRegistryEntry {
  enabled: boolean;
  quantity: number;
}

export interface SystemRegistryEntry {
  enabled: boolean;
  components: Record<string, ComponentRegistryEntry>;
}

export type HomeSystemsRegistry = Record<string, SystemRegistryEntry>;

// ─── Catalog ───

export const SYSTEMS_CATALOG: SystemCatalogEntry[] = [
  {
    key: "roofing", label: "Roofing", iconName: "Home",
    description: "Shingles, gutters, flashing",
    defaultEnabled: true, defaultEnabledCondo: false, hasSubToggles: false,
    components: [
      { key: "roof_covering", label: "Roof Covering", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 400, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "gutters", label: "Gutters & Downspouts", replacementCostLow: 1000, replacementCostHigh: 2500, lifespanYears: 25, annualCost: 75, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "flashing", label: "Flashing & Sealants", replacementCostLow: 300, replacementCostHigh: 1500, lifespanYears: 20, annualCost: 40, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "chimney_cap", label: "Chimney Cap", replacementCostLow: 300, replacementCostHigh: 1000, lifespanYears: 25, annualCost: 30, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "skylights", label: "Skylights", replacementCostLow: 500, replacementCostHigh: 2500, lifespanYears: 20, annualCost: 50, autoCreate: false, quantitySource: "manual", defaultQuantity: 1 },
    ],
  },
  {
    key: "hvac", label: "Heating & Cooling", iconName: "Wind",
    description: "Furnace, AC, heat pump, ducts",
    defaultEnabled: true, defaultEnabledCondo: true, hasSubToggles: false,
    components: [
      { key: "furnace", label: "Furnace / Boiler", replacementCostLow: 3000, replacementCostHigh: 7000, lifespanYears: 20, annualCost: 350, autoCreate: true, quantitySource: "zones", defaultQuantity: 1 },
      { key: "air_conditioner", label: "Air Conditioner", replacementCostLow: 3500, replacementCostHigh: 7500, lifespanYears: 15, annualCost: 400, autoCreate: true, quantitySource: "zones", defaultQuantity: 1 },
      { key: "heat_pump", label: "Heat Pump", replacementCostLow: 4000, replacementCostHigh: 8000, lifespanYears: 15, annualCost: 450, autoCreate: false, quantitySource: "zones", defaultQuantity: 1 },
      { key: "ductwork", label: "Ductwork", replacementCostLow: 1500, replacementCostHigh: 5000, lifespanYears: 30, annualCost: 100, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "thermostat", label: "Thermostat", replacementCostLow: 150, replacementCostHigh: 500, lifespanYears: 12, annualCost: 25, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "plumbing", label: "Plumbing", iconName: "Droplets",
    description: "Water heater, pipes, drains",
    defaultEnabled: true, defaultEnabledCondo: true, hasSubToggles: false,
    components: [
      { key: "water_heater", label: "Water Heater", replacementCostLow: 1200, replacementCostHigh: 3500, lifespanYears: 12, annualCost: 200, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "supply_piping", label: "Supply Piping", replacementCostLow: 2000, replacementCostHigh: 15000, lifespanYears: 50, annualCost: 100, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "sewer_lines", label: "Sewer / Drain Lines", replacementCostLow: 3000, replacementCostHigh: 10000, lifespanYears: 60, annualCost: 80, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "water_softener", label: "Water Softener / Filter", replacementCostLow: 800, replacementCostHigh: 3000, lifespanYears: 15, annualCost: 100, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "sump_pump", label: "Sump Pump", replacementCostLow: 500, replacementCostHigh: 1200, lifespanYears: 10, annualCost: 80, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "electrical", label: "Electrical", iconName: "Zap",
    description: "Panel, wiring, detectors",
    defaultEnabled: true, defaultEnabledCondo: false, hasSubToggles: false,
    components: [
      { key: "electrical_panel", label: "Electrical Panel", replacementCostLow: 1500, replacementCostHigh: 4000, lifespanYears: 30, annualCost: 75, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "wiring", label: "Wiring", replacementCostLow: 8000, replacementCostHigh: 20000, lifespanYears: 50, annualCost: 200, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "smoke_co_detectors", label: "Smoke / CO Detectors", replacementCostLow: 150, replacementCostHigh: 500, lifespanYears: 8, annualCost: 30, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "generator", label: "Standby Generator", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 300, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "exterior", label: "Exterior", iconName: "Building",
    description: "Siding, windows, doors, paint",
    defaultEnabled: true, defaultEnabledCondo: false, hasSubToggles: false,
    components: [
      { key: "siding", label: "Siding", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 30, annualCost: 300, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "exterior_paint", label: "Exterior Paint", replacementCostLow: 3000, replacementCostHigh: 7000, lifespanYears: 7, annualCost: 500, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "windows", label: "Windows", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 350, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "exterior_doors", label: "Exterior Doors", replacementCostLow: 1500, replacementCostHigh: 4000, lifespanYears: 25, annualCost: 100, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "garage_door_opener", label: "Garage Door Opener", replacementCostLow: 300, replacementCostHigh: 600, lifespanYears: 12, annualCost: 35, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "interior", label: "Interior Finishes", iconName: "Armchair",
    description: "Flooring, paint, countertops",
    defaultEnabled: true, defaultEnabledCondo: true, hasSubToggles: false,
    components: [
      { key: "flooring", label: "Flooring (primary)", replacementCostLow: 3000, replacementCostHigh: 12000, lifespanYears: 20, annualCost: 300, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "interior_paint", label: "Interior Paint", replacementCostLow: 2000, replacementCostHigh: 5000, lifespanYears: 7, annualCost: 350, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "countertops", label: "Countertops", replacementCostLow: 2000, replacementCostHigh: 6000, lifespanYears: 20, annualCost: 150, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "cabinetry", label: "Cabinetry", replacementCostLow: 5000, replacementCostHigh: 20000, lifespanYears: 30, annualCost: 200, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "appliances", label: "Appliances", iconName: "Refrigerator",
    description: "Fridge, dishwasher, washer, dryer, etc.",
    defaultEnabled: true, defaultEnabledCondo: true, hasSubToggles: false,
    components: [
      { key: "refrigerator", label: "Refrigerator", replacementCostLow: 800, replacementCostHigh: 2500, lifespanYears: 14, annualCost: 100, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "dishwasher", label: "Dishwasher", replacementCostLow: 400, replacementCostHigh: 1200, lifespanYears: 11, annualCost: 65, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "oven_range", label: "Oven / Range", replacementCostLow: 600, replacementCostHigh: 2500, lifespanYears: 16, annualCost: 80, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "microwave", label: "Microwave (built-in)", replacementCostLow: 200, replacementCostHigh: 800, lifespanYears: 9, annualCost: 40, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "washer", label: "Washer", replacementCostLow: 500, replacementCostHigh: 1200, lifespanYears: 12, annualCost: 65, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "dryer", label: "Dryer", replacementCostLow: 500, replacementCostHigh: 1200, lifespanYears: 12, annualCost: 60, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "garbage_disposal", label: "Garbage Disposal", replacementCostLow: 150, replacementCostHigh: 500, lifespanYears: 12, annualCost: 25, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "bathrooms", label: "Bathrooms", iconName: "ShowerHead",
    description: "Toilets, showers, fixtures",
    defaultEnabled: true, defaultEnabledCondo: true, hasSubToggles: false,
    components: [
      { key: "toilet", label: "Toilet", replacementCostLow: 200, replacementCostHigh: 800, lifespanYears: 30, annualCost: 15, autoCreate: true, quantitySource: "bathrooms", defaultQuantity: 2 },
      { key: "shower_tub", label: "Shower / Tub", replacementCostLow: 1000, replacementCostHigh: 5000, lifespanYears: 20, annualCost: 100, autoCreate: true, quantitySource: "bathrooms", defaultQuantity: 2 },
      { key: "vanity_sink", label: "Vanity / Sink", replacementCostLow: 500, replacementCostHigh: 2000, lifespanYears: 20, annualCost: 50, autoCreate: false, quantitySource: "bathrooms", defaultQuantity: 2 },
      { key: "exhaust_fan", label: "Exhaust Fan", replacementCostLow: 100, replacementCostHigh: 350, lifespanYears: 12, annualCost: 15, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "foundation", label: "Foundation & Structure", iconName: "Landmark",
    description: "Foundation, insulation, structure",
    defaultEnabled: true, defaultEnabledCondo: false, hasSubToggles: false,
    components: [
      { key: "foundation", label: "Foundation", replacementCostLow: 5000, replacementCostHigh: 30000, lifespanYears: 100, annualCost: 100, autoCreate: true, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "insulation", label: "Attic Insulation", replacementCostLow: 1500, replacementCostHigh: 4000, lifespanYears: 30, annualCost: 75, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "waterproofing", label: "Basement Waterproofing", replacementCostLow: 2000, replacementCostHigh: 10000, lifespanYears: 15, annualCost: 250, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "outdoor", label: "Outdoor & Grounds", iconName: "TreePine",
    description: "Deck, fence, driveway, sprinklers",
    defaultEnabled: false, defaultEnabledCondo: false, hasSubToggles: true,
    components: [
      { key: "deck_patio", label: "Deck / Patio", replacementCostLow: 3000, replacementCostHigh: 10000, lifespanYears: 20, annualCost: 250, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "fencing", label: "Fencing", replacementCostLow: 2000, replacementCostHigh: 6000, lifespanYears: 20, annualCost: 150, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "driveway", label: "Driveway / Walkways", replacementCostLow: 2000, replacementCostHigh: 8000, lifespanYears: 25, annualCost: 100, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "sprinkler", label: "Irrigation / Sprinkler", replacementCostLow: 1500, replacementCostHigh: 3500, lifespanYears: 15, annualCost: 130, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
  {
    key: "specialty", label: "Specialty Systems", iconName: "Settings",
    description: "Pool, solar, septic, well, fireplace",
    defaultEnabled: false, defaultEnabledCondo: false, hasSubToggles: true,
    components: [
      { key: "pool", label: "Pool / Hot Tub", replacementCostLow: 3000, replacementCostHigh: 8000, lifespanYears: 15, annualCost: 400, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "pool_pump", label: "Pool Pump & Filter", replacementCostLow: 1000, replacementCostHigh: 3000, lifespanYears: 10, annualCost: 200, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "solar_panels", label: "Solar Panels", replacementCostLow: 10000, replacementCostHigh: 25000, lifespanYears: 27, annualCost: 500, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "solar_inverter", label: "Solar Inverter", replacementCostLow: 1500, replacementCostHigh: 3000, lifespanYears: 12, annualCost: 175, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "septic", label: "Septic System", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 300, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "well", label: "Well System / Pump", replacementCostLow: 3000, replacementCostHigh: 8000, lifespanYears: 20, annualCost: 250, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "fireplace", label: "Fireplace / Chimney", replacementCostLow: 2000, replacementCostHigh: 5000, lifespanYears: 30, annualCost: 100, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
      { key: "security", label: "Home Security System", replacementCostLow: 500, replacementCostHigh: 2000, lifespanYears: 7, annualCost: 100, autoCreate: false, quantitySource: "fixed", defaultQuantity: 1 },
    ],
  },
];

// Linked sub-components: when parent is enabled, children auto-enable
const LINKED_COMPONENTS: Record<string, string[]> = {
  "specialty:pool": ["specialty:pool_pump"],
  "specialty:solar_panels": ["specialty:solar_inverter"],
};

// ─── Helper: average replacement cost ───

export function avgReplacementCost(comp: ComponentCatalogEntry): number {
  return Math.round((comp.replacementCostLow + comp.replacementCostHigh) / 2);
}

// ─── Registry builders ───

/**
 * Returns smart defaults per property type.
 * For bathrooms system, uses bathroomCount to set component quantities.
 */
export function getDefaultRegistry(propertyType: string, bathroomCount?: number): HomeSystemsRegistry {
  const baths = bathroomCount || 2;
  const registry: HomeSystemsRegistry = {};

  for (const sys of SYSTEMS_CATALOG) {
    const isCondo = propertyType === "condo";
    const enabled = isCondo ? sys.defaultEnabledCondo : sys.defaultEnabled;

    const components: Record<string, ComponentRegistryEntry> = {};
    for (const comp of sys.components) {
      let qty = comp.defaultQuantity;
      if (comp.quantitySource === "bathrooms") qty = baths;

      // For sub-toggle systems, components default to disabled
      const compEnabled = sys.hasSubToggles ? false : (comp.autoCreate || false);

      components[comp.key] = { enabled: compEnabled, quantity: qty };
    }

    registry[sys.key] = { enabled, components };
  }

  return registry;
}

/**
 * Returns a flat array of all enabled components with their catalog data + quantity.
 */
export function getEnabledComponents(
  homeSystems: HomeSystemsRegistry | null | undefined
): (ComponentCatalogEntry & { systemKey: string; systemLabel: string; quantity: number })[] {
  if (!homeSystems) return [];

  const result: (ComponentCatalogEntry & { systemKey: string; systemLabel: string; quantity: number })[] = [];

  for (const sys of SYSTEMS_CATALOG) {
    const sysEntry = homeSystems[sys.key];
    if (!sysEntry?.enabled) continue;

    for (const comp of sys.components) {
      const compEntry = sysEntry.components?.[comp.key];
      // For non-sub-toggle systems, include autoCreate components even if not explicitly in registry
      const isEnabled = sys.hasSubToggles
        ? compEntry?.enabled
        : (compEntry?.enabled ?? comp.autoCreate);
      if (!isEnabled) continue;

      result.push({
        ...comp,
        systemKey: sys.key,
        systemLabel: sys.label,
        quantity: compEntry?.quantity ?? comp.defaultQuantity,
      });
    }
  }

  return result;
}

/**
 * Sums the annual costs of all enabled components within a system.
 */
export function getSystemAnnualCost(
  systemKey: string,
  homeSystems: HomeSystemsRegistry | null | undefined
): number {
  if (!homeSystems) return 0;
  const sysEntry = homeSystems[systemKey];
  if (!sysEntry?.enabled) return 0;

  const sys = SYSTEMS_CATALOG.find((s) => s.key === systemKey);
  if (!sys) return 0;

  let total = 0;
  for (const comp of sys.components) {
    const compEntry = sysEntry.components?.[comp.key];
    const isEnabled = sys.hasSubToggles
      ? compEntry?.enabled
      : (compEntry?.enabled ?? comp.autoCreate);
    if (!isEnabled) continue;
    const qty = compEntry?.quantity ?? comp.defaultQuantity;
    total += comp.annualCost * qty;
  }
  return total;
}

/**
 * Detect and migrate old single-tier registry format to the new two-tier format.
 * Old format: { "roof": { enabled: true, quantity: 1 }, ... }
 * New format: { "roofing": { enabled: true, components: { ... } }, ... }
 */
export function migrateOldRegistry(old: any, bathroomCount?: number): HomeSystemsRegistry | null {
  if (!old || typeof old !== "object") return null;

  // Check if it's already new format (has a "components" key in any entry)
  const firstKey = Object.keys(old)[0];
  if (firstKey && old[firstKey]?.components) return old as HomeSystemsRegistry;

  // It's old format — map old keys to new system keys
  const OLD_TO_NEW: Record<string, string> = {
    roof: "roofing",
    hvac: "hvac",
    water_heater: "plumbing",
    plumbing: "plumbing",
    electrical: "electrical",
    exterior_paint: "exterior",
    siding: "exterior",
    windows: "exterior",
    garage_door: "exterior",
    flooring: "interior",
    appliances: "appliances",
    fireplace: "specialty",
    pool: "specialty",
    septic: "specialty",
    well: "specialty",
    solar: "specialty",
    sprinkler: "outdoor",
    fence: "outdoor",
    deck_patio: "outdoor",
  };

  // Start with defaults
  const registry = getDefaultRegistry("single_family", bathroomCount);

  // Track which new systems should be enabled based on old toggles
  const systemShouldBeEnabled = new Set<string>();

  for (const [oldKey, oldEntry] of Object.entries(old)) {
    if (typeof oldEntry !== "object" || oldEntry === null) continue;
    const entry = oldEntry as { enabled?: boolean; quantity?: number };
    const newSysKey = OLD_TO_NEW[oldKey];
    if (!newSysKey) continue;

    if (entry.enabled) {
      systemShouldBeEnabled.add(newSysKey);
    }
  }

  // Enable/disable systems
  for (const sys of SYSTEMS_CATALOG) {
    if (systemShouldBeEnabled.has(sys.key)) {
      registry[sys.key].enabled = true;
    } else {
      // If no old key mapped to this system, keep default
    }
  }

  return registry;
}

// ─── Sync function ───

/**
 * Syncs the registry to the home_items inventory at the component level.
 * Creates skeleton items for enabled components, deactivates items for disabled.
 * system_key format on home_items: "systemKey:componentKey"
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
  }>,
  bathroomCount?: number
) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; changes: Record<string, unknown> }> = [];

  for (const sys of SYSTEMS_CATALOG) {
    const sysEntry = homeSystems[sys.key];
    if (!sysEntry) continue;

    for (const comp of sys.components) {
      const compKey = `${sys.key}:${comp.key}`;
      const compEntry = sysEntry.components?.[comp.key];

      const isSystemEnabled = sysEntry.enabled;
      const isCompEnabled = sys.hasSubToggles
        ? (compEntry?.enabled ?? false)
        : (compEntry?.enabled ?? comp.autoCreate);

      const shouldBeActive = isSystemEnabled && isCompEnabled;

      // Determine target quantity
      let targetQty = compEntry?.quantity ?? comp.defaultQuantity;
      if (comp.quantitySource === "bathrooms" && bathroomCount) {
        targetQty = bathroomCount;
      }

      const matchingItems = existingItems.filter((i) => i.system_key === compKey);

      if (shouldBeActive) {
        const activeItems = matchingItems.filter((i) => i.is_active !== false);
        const inactiveItems = matchingItems.filter((i) => i.is_active === false);

        if (activeItems.length < targetQty) {
          // Re-enable inactive items first
          const toReactivate = inactiveItems
            .sort((a, b) => b.data_completeness - a.data_completeness)
            .slice(0, targetQty - activeItems.length);

          for (const item of toReactivate) {
            updates.push({ id: item.id, changes: { is_active: true } });
          }

          // Create new skeletons for remaining gap
          const gap = targetQty - activeItems.length - toReactivate.length;
          for (let i = 0; i < gap; i++) {
            const existingCount = activeItems.length + toReactivate.length + i;
            const name = targetQty === 1 && existingCount === 0
              ? comp.label
              : `${comp.label} ${existingCount + 1}`;

            // Map system key to a category for the item
            const category = mapSystemToCategory(sys.key);

            inserts.push({
              property_id: propertyId,
              user_id: userId,
              system_key: compKey,
              is_registry_skeleton: true,
              is_active: true,
              item_type: "home_component",
              category,
              name,
              data_completeness: 0,
            });
          }
        } else if (activeItems.length > targetQty) {
          const sorted = [...activeItems].sort((a, b) => a.data_completeness - b.data_completeness);
          const toDeactivate = sorted.slice(0, activeItems.length - targetQty);
          for (const item of toDeactivate) {
            updates.push({ id: item.id, changes: { is_active: false } });
          }
        }
      } else {
        // Disabled — deactivate all matching items
        for (const item of matchingItems.filter((i) => i.is_active !== false)) {
          updates.push({ id: item.id, changes: { is_active: false } });
        }
      }
    }
  }

  // Execute
  if (inserts.length > 0) {
    const { error } = await supabase.from("home_items").insert(inserts as any);
    if (error) throw error;
  }
  for (const upd of updates) {
    const { error } = await supabase
      .from("home_items")
      .update(upd.changes as any)
      .eq("id", upd.id);
    if (error) throw error;
  }

  return { inserted: inserts.length, updated: updates.length };
}

/** Map system key to item category */
function mapSystemToCategory(systemKey: string): string {
  const map: Record<string, string> = {
    roofing: "roofing",
    hvac: "hvac",
    plumbing: "plumbing",
    electrical: "electrical",
    exterior: "exterior",
    interior: "structural",
    appliances: "appliance",
    bathrooms: "plumbing",
    foundation: "structural",
    outdoor: "exterior",
    specialty: "general",
  };
  return map[systemKey] || "general";
}

// ─── Inference for existing users ───

/**
 * Infers a two-tier registry from existing home_items by matching categories.
 */
export function inferRegistryFromExistingItems(
  existingItems: Array<{ id: string; category: string; system_key?: string | null }>,
  bathroomCount?: number
): {
  registry: HomeSystemsRegistry;
  itemUpdates: Array<{ id: string; system_key: string }>;
} {
  const registry = getDefaultRegistry("single_family", bathroomCount);
  const itemUpdates: Array<{ id: string; system_key: string }> = [];

  // Build category → system key mapping
  const categoryToSystem: Record<string, string> = {
    roofing: "roofing",
    hvac: "hvac",
    plumbing: "plumbing",
    electrical: "electrical",
    exterior: "exterior",
    structural: "interior",
    appliance: "appliances",
    general: "specialty",
  };

  // Count items per category
  const categoryCounts: Record<string, number> = {};
  for (const item of existingItems) {
    const cat = item.category?.toLowerCase().trim();
    if (!cat) continue;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Enable systems that have matching items
  for (const [cat, count] of Object.entries(categoryCounts)) {
    const sysKey = categoryToSystem[cat];
    if (!sysKey || !registry[sysKey]) continue;

    registry[sysKey].enabled = true;

    // Try to map items to specific components
    const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
    if (!sys) continue;

    // Enable autoCreate components for this system
    for (const comp of sys.components) {
      if (comp.autoCreate) {
        registry[sysKey].components[comp.key] = {
          enabled: true,
          quantity: comp.quantitySource === "bathrooms" ? (bathroomCount || 2) : comp.defaultQuantity,
        };
      }
    }
  }

  // Set system_key on items that don't have one
  for (const item of existingItems) {
    if (item.system_key) continue;
    const cat = item.category?.toLowerCase().trim();
    if (!cat) continue;
    const sysKey = categoryToSystem[cat];
    if (!sysKey) continue;
    const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
    if (!sys) continue;
    // Assign to first autoCreate component
    const firstComp = sys.components.find((c) => c.autoCreate);
    if (firstComp) {
      itemUpdates.push({ id: item.id, system_key: `${sysKey}:${firstComp.key}` });
    }
  }

  return { registry, itemUpdates };
}
