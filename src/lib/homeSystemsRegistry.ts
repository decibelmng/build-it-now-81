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
  perUnit: boolean;
  quantitySource?: "fixed" | "bathrooms" | "zones";
  defaultQuantity: number;
}

export interface SystemCatalogEntry {
  key: string;
  label: string;
  icon: string;           // emoji
  description: string;
  defaultEnabled: boolean;
  defaultEnabledCondo: boolean;
  quantityType: "none" | "stepper" | "inferred" | "subtoggles";
  quantityLabel?: string;
  components: ComponentCatalogEntry[];
}

export interface ComponentRegistryEntry {
  enabled: boolean;
  quantity: number;
}

export interface SystemRegistryEntry {
  enabled: boolean;
  quantity: number;
  components: Record<string, ComponentRegistryEntry>;
}

export type HomeSystemsRegistry = Record<string, SystemRegistryEntry>;

// ─── Catalog ───

export const SYSTEMS_CATALOG: SystemCatalogEntry[] = [
  {
    key: "roofing", label: "Roofing", icon: "🏠",
    description: "Shingles, gutters, flashing",
    defaultEnabled: true, defaultEnabledCondo: false,
    quantityType: "none",
    components: [
      { key: "roof_covering", label: "Roof Covering", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 400, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "gutters", label: "Gutters & Downspouts", replacementCostLow: 1000, replacementCostHigh: 2500, lifespanYears: 25, annualCost: 75, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "flashing", label: "Flashing & Sealants", replacementCostLow: 300, replacementCostHigh: 1500, lifespanYears: 20, annualCost: 40, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "chimney_cap", label: "Chimney Cap", replacementCostLow: 300, replacementCostHigh: 1000, lifespanYears: 25, annualCost: 30, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "skylights", label: "Skylights", replacementCostLow: 500, replacementCostHigh: 2500, lifespanYears: 20, annualCost: 50, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "hvac", label: "Heating & Cooling", icon: "🌬️",
    description: "Furnace, AC, heat pump, ducts",
    defaultEnabled: true, defaultEnabledCondo: true,
    quantityType: "stepper", quantityLabel: "Zones / Units",
    components: [
      { key: "furnace", label: "Furnace / Boiler", replacementCostLow: 3000, replacementCostHigh: 7000, lifespanYears: 20, annualCost: 350, autoCreate: true, perUnit: true, quantitySource: "zones", defaultQuantity: 1 },
      { key: "air_conditioner", label: "Air Conditioner", replacementCostLow: 3500, replacementCostHigh: 7500, lifespanYears: 15, annualCost: 400, autoCreate: true, perUnit: true, quantitySource: "zones", defaultQuantity: 1 },
      { key: "heat_pump", label: "Heat Pump", replacementCostLow: 4000, replacementCostHigh: 8000, lifespanYears: 15, annualCost: 450, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "ductwork", label: "Ductwork", replacementCostLow: 1500, replacementCostHigh: 5000, lifespanYears: 30, annualCost: 100, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "thermostat", label: "Thermostat", replacementCostLow: 150, replacementCostHigh: 500, lifespanYears: 12, annualCost: 25, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "plumbing", label: "Plumbing", icon: "💧",
    description: "Water heater, pipes, drains",
    defaultEnabled: true, defaultEnabledCondo: true,
    quantityType: "stepper", quantityLabel: "Water Heaters",
    components: [
      { key: "water_heater", label: "Water Heater", replacementCostLow: 1200, replacementCostHigh: 3500, lifespanYears: 12, annualCost: 200, autoCreate: true, perUnit: true, quantitySource: "zones", defaultQuantity: 1 },
      { key: "supply_piping", label: "Supply Piping", replacementCostLow: 2000, replacementCostHigh: 15000, lifespanYears: 50, annualCost: 100, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "sewer_lines", label: "Sewer / Drain Lines", replacementCostLow: 3000, replacementCostHigh: 10000, lifespanYears: 60, annualCost: 80, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "water_softener", label: "Water Softener / Filter", replacementCostLow: 800, replacementCostHigh: 3000, lifespanYears: 15, annualCost: 100, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "sump_pump", label: "Sump Pump", replacementCostLow: 500, replacementCostHigh: 1200, lifespanYears: 10, annualCost: 80, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "electrical", label: "Electrical", icon: "⚡",
    description: "Panel, wiring, detectors",
    defaultEnabled: true, defaultEnabledCondo: false,
    quantityType: "none",
    components: [
      { key: "electrical_panel", label: "Electrical Panel", replacementCostLow: 1500, replacementCostHigh: 4000, lifespanYears: 30, annualCost: 75, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "smoke_co_detectors", label: "Smoke / CO Detectors", replacementCostLow: 150, replacementCostHigh: 500, lifespanYears: 8, annualCost: 30, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "wiring", label: "Wiring", replacementCostLow: 8000, replacementCostHigh: 20000, lifespanYears: 50, annualCost: 200, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "generator", label: "Standby Generator", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 300, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "exterior", label: "Exterior Envelope", icon: "🏗️",
    description: "Siding, windows, doors, paint",
    defaultEnabled: true, defaultEnabledCondo: false,
    quantityType: "none",
    components: [
      { key: "siding", label: "Siding", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 30, annualCost: 300, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "exterior_paint", label: "Exterior Paint", replacementCostLow: 3000, replacementCostHigh: 7000, lifespanYears: 7, annualCost: 500, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "windows", label: "Windows", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 350, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "exterior_doors", label: "Exterior Doors", replacementCostLow: 1500, replacementCostHigh: 4000, lifespanYears: 25, annualCost: 100, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "garage_door_opener", label: "Garage Door Opener", replacementCostLow: 300, replacementCostHigh: 600, lifespanYears: 12, annualCost: 35, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "interior", label: "Interior Finishes", icon: "🛋️",
    description: "Flooring, paint, countertops",
    defaultEnabled: true, defaultEnabledCondo: true,
    quantityType: "none",
    components: [
      { key: "flooring", label: "Flooring", replacementCostLow: 3000, replacementCostHigh: 12000, lifespanYears: 20, annualCost: 300, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "interior_paint", label: "Interior Paint", replacementCostLow: 2000, replacementCostHigh: 5000, lifespanYears: 7, annualCost: 350, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "countertops", label: "Countertops", replacementCostLow: 2000, replacementCostHigh: 6000, lifespanYears: 20, annualCost: 150, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "cabinetry", label: "Cabinetry", replacementCostLow: 5000, replacementCostHigh: 20000, lifespanYears: 30, annualCost: 200, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "appliances", label: "Appliances", icon: "🧊",
    description: "Fridge, dishwasher, washer, dryer",
    defaultEnabled: true, defaultEnabledCondo: true,
    quantityType: "none",
    components: [
      { key: "refrigerator", label: "Refrigerator", replacementCostLow: 800, replacementCostHigh: 2500, lifespanYears: 14, annualCost: 100, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "dishwasher", label: "Dishwasher", replacementCostLow: 400, replacementCostHigh: 1200, lifespanYears: 11, annualCost: 65, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "oven_range", label: "Oven / Range", replacementCostLow: 600, replacementCostHigh: 2500, lifespanYears: 16, annualCost: 80, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "microwave", label: "Microwave (built-in)", replacementCostLow: 200, replacementCostHigh: 800, lifespanYears: 9, annualCost: 40, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "washer", label: "Washer", replacementCostLow: 500, replacementCostHigh: 1200, lifespanYears: 12, annualCost: 65, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "dryer", label: "Dryer", replacementCostLow: 500, replacementCostHigh: 1200, lifespanYears: 12, annualCost: 60, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "garbage_disposal", label: "Garbage Disposal", replacementCostLow: 150, replacementCostHigh: 500, lifespanYears: 12, annualCost: 25, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "bathrooms", label: "Bathrooms", icon: "🚿",
    description: "Toilets, showers, fixtures",
    defaultEnabled: true, defaultEnabledCondo: true,
    quantityType: "inferred", quantityLabel: "Bathrooms",
    components: [
      { key: "toilet", label: "Toilet", replacementCostLow: 200, replacementCostHigh: 800, lifespanYears: 30, annualCost: 15, autoCreate: true, perUnit: true, quantitySource: "bathrooms", defaultQuantity: 2 },
      { key: "shower_tub", label: "Shower / Tub", replacementCostLow: 1000, replacementCostHigh: 5000, lifespanYears: 20, annualCost: 100, autoCreate: true, perUnit: true, quantitySource: "bathrooms", defaultQuantity: 2 },
      { key: "vanity_sink", label: "Vanity / Sink", replacementCostLow: 500, replacementCostHigh: 2000, lifespanYears: 20, annualCost: 50, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "exhaust_fan", label: "Exhaust Fan", replacementCostLow: 100, replacementCostHigh: 350, lifespanYears: 12, annualCost: 15, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "foundation", label: "Foundation & Structure", icon: "🧱",
    description: "Foundation, insulation, structure",
    defaultEnabled: true, defaultEnabledCondo: false,
    quantityType: "none",
    components: [
      { key: "foundation", label: "Foundation", replacementCostLow: 5000, replacementCostHigh: 30000, lifespanYears: 100, annualCost: 100, autoCreate: true, perUnit: false, defaultQuantity: 1 },
      { key: "insulation", label: "Attic Insulation", replacementCostLow: 1500, replacementCostHigh: 4000, lifespanYears: 30, annualCost: 75, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "waterproofing", label: "Basement Waterproofing", replacementCostLow: 2000, replacementCostHigh: 10000, lifespanYears: 15, annualCost: 250, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "outdoor", label: "Outdoor & Grounds", icon: "🌳",
    description: "Deck, fence, driveway, sprinklers",
    defaultEnabled: false, defaultEnabledCondo: false,
    quantityType: "subtoggles",
    components: [
      { key: "deck_patio", label: "Deck / Patio", replacementCostLow: 3000, replacementCostHigh: 10000, lifespanYears: 20, annualCost: 250, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "fencing", label: "Fencing", replacementCostLow: 2000, replacementCostHigh: 6000, lifespanYears: 20, annualCost: 150, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "driveway", label: "Driveway / Walkways", replacementCostLow: 2000, replacementCostHigh: 8000, lifespanYears: 25, annualCost: 100, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "sprinkler", label: "Irrigation / Sprinkler", replacementCostLow: 1500, replacementCostHigh: 3500, lifespanYears: 15, annualCost: 130, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
  {
    key: "specialty", label: "Specialty Systems", icon: "⚙️",
    description: "Pool, solar, septic, well, fireplace, security",
    defaultEnabled: false, defaultEnabledCondo: false,
    quantityType: "subtoggles",
    components: [
      { key: "pool", label: "Pool / Hot Tub", replacementCostLow: 3000, replacementCostHigh: 8000, lifespanYears: 15, annualCost: 400, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "pool_pump", label: "Pool Pump & Filter", replacementCostLow: 1000, replacementCostHigh: 3000, lifespanYears: 10, annualCost: 200, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "solar_panels", label: "Solar Panels", replacementCostLow: 10000, replacementCostHigh: 25000, lifespanYears: 27, annualCost: 500, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "solar_inverter", label: "Solar Inverter", replacementCostLow: 1500, replacementCostHigh: 3000, lifespanYears: 12, annualCost: 175, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "septic", label: "Septic System", replacementCostLow: 5000, replacementCostHigh: 15000, lifespanYears: 25, annualCost: 300, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "well", label: "Well System / Pump", replacementCostLow: 3000, replacementCostHigh: 8000, lifespanYears: 20, annualCost: 250, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "fireplace", label: "Fireplace / Chimney", replacementCostLow: 2000, replacementCostHigh: 5000, lifespanYears: 30, annualCost: 100, autoCreate: false, perUnit: false, defaultQuantity: 1 },
      { key: "security", label: "Home Security System", replacementCostLow: 500, replacementCostHigh: 2000, lifespanYears: 7, annualCost: 100, autoCreate: false, perUnit: false, defaultQuantity: 1 },
    ],
  },
];

// Linked sub-components: when parent is enabled, children auto-enable
const LINKED_COMPONENTS: Record<string, string[]> = {
  "specialty:pool": ["specialty:pool_pump"],
  "specialty:solar_panels": ["specialty:solar_inverter"],
};

// Hidden child keys for sub-toggle display (these auto-toggle with parent)
export const HIDDEN_SUB_KEYS = new Set(["pool_pump", "solar_inverter"]);

// ─── Helper: average replacement cost ───

export function avgReplacementCost(comp: ComponentCatalogEntry): number {
  return Math.round((comp.replacementCostLow + comp.replacementCostHigh) / 2);
}

// ─── Registry builders ───

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

      const compEnabled = sys.quantityType === "subtoggles" ? false : (comp.autoCreate || false);
      components[comp.key] = { enabled: compEnabled, quantity: qty };
    }

    registry[sys.key] = { enabled, quantity: 1, components };
  }

  return registry;
}

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
      const isEnabled = sys.quantityType === "subtoggles"
        ? compEntry?.enabled
        : (compEntry?.enabled ?? comp.autoCreate);
      if (!isEnabled) continue;

      let qty = compEntry?.quantity ?? comp.defaultQuantity;
      if (comp.perUnit && comp.quantitySource === "zones") {
        qty = sysEntry.quantity || 1;
      }

      result.push({
        ...comp,
        systemKey: sys.key,
        systemLabel: sys.label,
        quantity: qty,
      });
    }
  }

  return result;
}

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
    const isEnabled = sys.quantityType === "subtoggles"
      ? compEntry?.enabled
      : (compEntry?.enabled ?? comp.autoCreate);
    if (!isEnabled) continue;

    let qty = 1;
    if (comp.perUnit) {
      if (comp.quantitySource === "zones") qty = sysEntry.quantity || 1;
      else if (comp.quantitySource === "bathrooms") qty = compEntry?.quantity ?? comp.defaultQuantity;
    }

    total += comp.annualCost * qty;
  }
  return total;
}

export function getTotalAnnualCost(homeSystems: HomeSystemsRegistry | null | undefined): number {
  if (!homeSystems) return 0;
  let total = 0;
  for (const sys of SYSTEMS_CATALOG) {
    total += getSystemAnnualCost(sys.key, homeSystems);
  }
  return total;
}

/**
 * Count how many components will be tracked for a system.
 */
export function getSystemComponentCount(
  sys: SystemCatalogEntry,
  sysEntry: SystemRegistryEntry | undefined
): number {
  if (!sysEntry?.enabled) return 0;
  let count = 0;
  for (const comp of sys.components) {
    const compEntry = sysEntry.components?.[comp.key];
    const isEnabled = sys.quantityType === "subtoggles"
      ? compEntry?.enabled
      : (compEntry?.enabled ?? comp.autoCreate);
    if (!isEnabled) continue;

    let qty = 1;
    if (comp.perUnit) {
      if (comp.quantitySource === "zones") qty = sysEntry.quantity || 1;
      else if (comp.quantitySource === "bathrooms") qty = compEntry?.quantity ?? comp.defaultQuantity;
    }
    count += qty;
  }
  return count;
}

// ─── Migration ───

export function migrateOldRegistry(old: any, bathroomCount?: number): HomeSystemsRegistry | null {
  if (!old || typeof old !== "object") return null;

  const firstKey = Object.keys(old)[0];
  if (firstKey && old[firstKey]?.components) return old as HomeSystemsRegistry;

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

  const registry = getDefaultRegistry("single_family", bathroomCount);
  const systemShouldBeEnabled = new Set<string>();

  for (const [oldKey, oldEntry] of Object.entries(old)) {
    if (typeof oldEntry !== "object" || oldEntry === null) continue;
    const entry = oldEntry as { enabled?: boolean; quantity?: number };
    const newSysKey = OLD_TO_NEW[oldKey];
    if (!newSysKey) continue;
    if (entry.enabled) systemShouldBeEnabled.add(newSysKey);
  }

  for (const sys of SYSTEMS_CATALOG) {
    if (systemShouldBeEnabled.has(sys.key)) {
      registry[sys.key].enabled = true;
    }
  }

  return registry;
}

// ─── Sync function ───

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
    system_instance?: number | null;
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
      const isCompEnabled = sys.quantityType === "subtoggles"
        ? (compEntry?.enabled ?? false)
        : (compEntry?.enabled ?? comp.autoCreate);

      // Handle linked components for sub-toggles
      let shouldBeActive = isSystemEnabled && isCompEnabled;

      // For linked children (pool_pump, solar_inverter), check parent
      if (sys.quantityType === "subtoggles" && HIDDEN_SUB_KEYS.has(comp.key)) {
        const parentKey = comp.key === "pool_pump" ? "pool" : comp.key === "solar_inverter" ? "solar_panels" : null;
        if (parentKey) {
          const parentEntry = sysEntry.components?.[parentKey];
          shouldBeActive = isSystemEnabled && (parentEntry?.enabled ?? false);
        }
      }

      let targetQty = compEntry?.quantity ?? comp.defaultQuantity;
      if (comp.quantitySource === "bathrooms" && bathroomCount) {
        targetQty = bathroomCount;
      } else if (comp.quantitySource === "zones") {
        targetQty = sysEntry.quantity || 1;
      }

      const matchingItems = existingItems.filter((i) => i.system_key === compKey);

      if (shouldBeActive) {
        const activeItems = matchingItems.filter((i) => i.is_active !== false);
        const inactiveItems = matchingItems.filter((i) => i.is_active === false);

        if (activeItems.length < targetQty) {
          const toReactivate = inactiveItems
            .sort((a, b) => b.data_completeness - a.data_completeness)
            .slice(0, targetQty - activeItems.length);

          for (const item of toReactivate) {
            updates.push({ id: item.id, changes: { is_active: true } });
          }

          const gap = targetQty - activeItems.length - toReactivate.length;
          for (let i = 0; i < gap; i++) {
            const existingCount = activeItems.length + toReactivate.length + i;
            const instanceNumber = existingCount + 1;
            const name = targetQty === 1 && existingCount === 0
              ? comp.label
              : `${comp.label} ${instanceNumber}`;

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
              // Assign system_instance for multi-quantity items
              system_instance: targetQty > 1 ? instanceNumber : null,
            });
          }
        } else if (activeItems.length > targetQty) {
          const sorted = [...activeItems].sort((a, b) => a.data_completeness - b.data_completeness);
          const toDeactivate = sorted.slice(0, activeItems.length - targetQty);
          for (const item of toDeactivate) {
            updates.push({ id: item.id, changes: { is_active: false } });
          }
        }

        // Ensure system_instance is set on existing items for multi-quantity
        if (targetQty > 1) {
          const allActiveAfter = [
            ...activeItems,
            ...inactiveItems.filter((i) => updates.some((u) => u.id === i.id && u.changes.is_active === true)),
          ];
          for (let idx = 0; idx < allActiveAfter.length; idx++) {
            const item = allActiveAfter[idx];
            if (item.system_instance == null || item.system_instance === 0) {
              updates.push({ id: item.id, changes: { system_instance: idx + 1 } });
            }
          }
        }
      } else {
        for (const item of matchingItems.filter((i) => i.is_active !== false)) {
          updates.push({ id: item.id, changes: { is_active: false } });
        }
      }
    }
  }

  // Filter out invalid inserts defensively
  const validInserts = inserts.filter(item =>
    item.name && (item.name as string).length <= 200 && item.property_id
  );

  if (validInserts.length > 0) {
    const { error } = await supabase.from("home_items").insert(validInserts as any);
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

export { mapSystemToCategory };

/** Map contractor service_category to system key */
export const SERVICE_CATEGORY_TO_SYSTEM: Record<string, string | null> = {
  "HVAC": "hvac",
  "Plumbing": "plumbing",
  "Electrical": "electrical",
  "Roofing": "roofing",
  "Appliance Repair": "appliances",
  "Painting": "exterior",
  "Landscaping": "outdoor",
  "General Maintenance": null,
  "Pest Control": null,
  "Other": null,
};

/** Map system key to maintenance category (for backward compat) */
export const SYSTEM_TO_CATEGORY: Record<string, string> = {
  roofing: "roofing",
  hvac: "hvac",
  plumbing: "plumbing",
  electrical: "electrical",
  exterior: "exterior",
  interior: "interior",
  appliances: "appliance",
  bathrooms: "plumbing",
  foundation: "structural",
  outdoor: "landscaping",
  specialty: "general",
};

// ─── Inference for existing users ───

export function inferRegistryFromExistingItems(
  existingItems: Array<{ id: string; category: string; system_key?: string | null }>,
  bathroomCount?: number
): {
  registry: HomeSystemsRegistry;
  itemUpdates: Array<{ id: string; system_key: string }>;
} {
  const registry = getDefaultRegistry("single_family", bathroomCount);
  const itemUpdates: Array<{ id: string; system_key: string }> = [];

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

  const categoryCounts: Record<string, number> = {};
  for (const item of existingItems) {
    const cat = item.category?.toLowerCase().trim();
    if (!cat) continue;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  for (const [cat] of Object.entries(categoryCounts)) {
    const sysKey = categoryToSystem[cat];
    if (!sysKey || !registry[sysKey]) continue;

    registry[sysKey].enabled = true;

    const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
    if (!sys) continue;

    for (const comp of sys.components) {
      if (comp.autoCreate) {
        registry[sysKey].components[comp.key] = {
          enabled: true,
          quantity: comp.quantitySource === "bathrooms" ? (bathroomCount || 2) : comp.defaultQuantity,
        };
      }
    }
  }

  for (const item of existingItems) {
    if (item.system_key) continue;
    const cat = item.category?.toLowerCase().trim();
    if (!cat) continue;
    const sysKey = categoryToSystem[cat];
    if (!sysKey) continue;
    const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
    if (!sys) continue;
    const firstComp = sys.components.find((c) => c.autoCreate);
    if (firstComp) {
      itemUpdates.push({ id: item.id, system_key: `${sysKey}:${firstComp.key}` });
    }
  }

  return { registry, itemUpdates };
}

// ─── Backfill system_key on existing records ───

export async function backfillSystemKeys(
  propertyId: string,
  userId: string,
): Promise<{ logsUpdated: number; docsUpdated: number; itemsUpdated: number }> {
  let logsUpdated = 0;
  let docsUpdated = 0;
  let itemsUpdated = 0;

  // 1. Maintenance logs with component_id but no system_key
  const { data: logsWithComp } = await supabase
    .from("maintenance_logs")
    .select("id, component_id")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .not("component_id", "is", null)
    .is("system_key", null);

  if (logsWithComp) {
    for (const log of logsWithComp) {
      const { data: item } = await supabase
        .from("home_items")
        .select("system_key")
        .eq("id", log.component_id!)
        .maybeSingle();
      if (item?.system_key) {
        await supabase.from("maintenance_logs")
          .update({ system_key: item.system_key } as any)
          .eq("id", log.id);
        // Also ensure junction row exists
        await supabase.from("maintenance_log_components")
          .upsert({ log_id: log.id, component_id: log.component_id } as any, { onConflict: "log_id,component_id" });
        logsUpdated++;
      }
    }
  }

  // 2. Maintenance logs without component_id — infer system_key from category
  const { data: logsWithoutComp } = await supabase
    .from("maintenance_logs")
    .select("id, category")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .is("component_id", null)
    .is("system_key", null);

  if (logsWithoutComp) {
    const categoryToSystem: Record<string, string> = {
      hvac: "hvac", plumbing: "plumbing", electrical: "electrical",
      roofing: "roofing", appliance: "appliances", landscaping: "outdoor",
      exterior: "exterior",
    };
    for (const log of logsWithoutComp) {
      const sysKey = categoryToSystem[log.category];
      if (sysKey) {
        await supabase.from("maintenance_logs")
          .update({ system_key: sysKey } as any)
          .eq("id", log.id);
        logsUpdated++;
      }
    }
  }

  // 3. Documents with links but no system_key
  const { data: docsToFix } = await supabase
    .from("documents")
    .select("id, home_item_id, maintenance_log_id, contractor_submission_id")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .is("system_key", null);

  if (docsToFix) {
    for (const doc of docsToFix) {
      let sysKey: string | null = null;
      if (doc.home_item_id) {
        const { data: item } = await supabase.from("home_items").select("system_key").eq("id", doc.home_item_id).maybeSingle();
        sysKey = item?.system_key || null;
      } else if (doc.maintenance_log_id) {
        const { data: log } = await supabase.from("maintenance_logs").select("system_key").eq("id", doc.maintenance_log_id).maybeSingle();
        sysKey = (log as any)?.system_key || null;
      }
      if (sysKey) {
        await supabase.from("documents").update({ system_key: sysKey } as any).eq("id", doc.id);
        docsUpdated++;
      }
    }
  }

  // 4. Home items without system_key
  const { data: itemsToFix } = await supabase
    .from("home_items")
    .select("id, category")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .eq("item_type", "home_component")
    .is("system_key", null);

  if (itemsToFix) {
    const categoryToSystem: Record<string, string> = {
      roofing: "roofing", hvac: "hvac", plumbing: "plumbing",
      electrical: "electrical", exterior: "exterior", structural: "interior",
      appliance: "appliances", general: "specialty",
    };
    for (const item of itemsToFix) {
      const sysKey = categoryToSystem[item.category];
      if (sysKey) {
        const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
        const firstComp = sys?.components.find((c) => c.autoCreate);
        if (firstComp) {
          await supabase.from("home_items")
            .update({ system_key: `${sysKey}:${firstComp.key}` } as any)
            .eq("id", item.id);
          itemsUpdated++;
        }
      }
    }
  }

  return { logsUpdated, docsUpdated, itemsUpdated };
}
