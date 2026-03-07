/**
 * Predictive Savings Forecaster — Two-Tier Model
 * Calculates future costs based on enabled components from the Home Systems Registry.
 */

import {
  SYSTEMS_CATALOG,
  getEnabledComponents,
  avgReplacementCost,
  migrateOldRegistry,
  type HomeSystemsRegistry,
} from "@/lib/homeSystemsRegistry";

export interface SystemCostProfile {
  key: string;
  systemKey: string;
  label: string;
  category: string;
  replacementCost: number;
  lifespanYears: number;
  annualCost: number;
}

/** Build flat component profiles from the catalog for backward compatibility */
function buildComponentProfiles(): SystemCostProfile[] {
  const profiles: SystemCostProfile[] = [];
  for (const sys of SYSTEMS_CATALOG) {
    for (const comp of sys.components) {
      profiles.push({
        key: `${sys.key}:${comp.key}`,
        systemKey: sys.key,
        label: comp.label,
        category: mapSystemToCategory(sys.key),
        replacementCost: avgReplacementCost(comp),
        lifespanYears: comp.lifespanYears,
        annualCost: comp.annualCost,
      });
    }
  }
  return profiles;
}

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

export const SYSTEM_PROFILES: SystemCostProfile[] = buildComponentProfiles();

// Map variant category names to their canonical form
const CATEGORY_ALIASES: Record<string, string> = {
  roof: "roofing",
  "hvac system": "hvac",
  hvac_system: "hvac",
};

export function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower;
}

export const ANNUAL_MAINTENANCE: Record<string, number> = {
  plumbing: 300,
  electrical: 200,
};

export interface HomeItem {
  id: string;
  name: string;
  category: string;
  install_date: string | null;
  expected_replacement: string | null;
  estimated_value: number | null;
  system_key?: string | null;
  is_registry_skeleton?: boolean;
}

export interface PropertyInfo {
  year_built: number | null;
  purchase_price: number | null;
  sqft: number | null;
}

export interface ForecastEvent {
  year: number;
  label: string;
  cost: number;
  category: string;
  isPersonalized: boolean;
}

export interface ForecastResult {
  recommendedMonthlySavings: number;
  annualBaseline: number;
  confidence: number;
  personalizedCategories: Set<string>;
  events: ForecastEvent[];
  yearlyTotals: { year: number; predicted: number; baseline: number }[];
  suggestedItems: { label: string; impact: string }[];
}

export function calculateForecast(
  property: PropertyInfo,
  homeItems: HomeItem[],
  forecastYears: number = 10,
  rawHomeSystems?: any | null,
  registryCompleted?: boolean
): ForecastResult {
  const now = new Date();
  const currentYear = now.getFullYear();
  const homeAge = property.year_built ? currentYear - property.year_built : 20;
  const homeValue = property.purchase_price || 350000;

  // Migrate old format if needed
  const homeSystems: HomeSystemsRegistry | null = rawHomeSystems
    ? (migrateOldRegistry(rawHomeSystems) || rawHomeSystems)
    : null;
  const hasRegistry = !!homeSystems && !!registryCompleted;

  const personalizedCategories = new Set<string>();
  const personalizedCompKeys = new Set<string>();
  const coveredCompKeys = new Set<string>();
  const events: ForecastEvent[] = [];

  const normalizedItems = homeItems.map((item) => ({
    ...item,
    category: normalizeCategory(item.category),
  }));

  // Track all non-skeleton items as "covered" even without install_date
  normalizedItems.forEach((item) => {
    if (item.system_key) {
      coveredCompKeys.add(item.system_key);
    } else {
      // Try matching by category
      const profile = SYSTEM_PROFILES.find((p) => p.category === item.category);
      if (profile) coveredCompKeys.add(profile.key);
    }
  });

  // 1. Process tracked items with install dates
  normalizedItems.forEach((item) => {
    if (!item.install_date) return;

    // Find matching component profile
    let profile: SystemCostProfile | undefined;
    if (item.system_key) {
      profile = SYSTEM_PROFILES.find((p) => p.key === item.system_key);
    }
    if (!profile) {
      profile = SYSTEM_PROFILES.find((p) => p.category === item.category);
    }
    if (!profile) return;

    // If registry exists and this system is disabled, skip
    if (hasRegistry) {
      const sysEntry = homeSystems![profile.systemKey];
      if (sysEntry && !sysEntry.enabled) return;
    }

    personalizedCategories.add(item.category);
    personalizedCompKeys.add(profile.key);

    const installYear = new Date(item.install_date).getFullYear();
    const lifespan = profile.lifespanYears;
    const age = currentYear - installYear;
    const yearsRemaining = Math.max(0, lifespan - age);
    const replacementYear = currentYear + yearsRemaining;

    if (replacementYear <= currentYear + forecastYears) {
      events.push({
        year: replacementYear,
        label: `Replace ${item.name}`,
        cost: profile.replacementCost,
        category: item.category,
        isPersonalized: true,
      });
    }

    if (yearsRemaining === 0) {
      events.push({
        year: currentYear + 1,
        label: `${item.name} — Overdue Replacement`,
        cost: profile.replacementCost,
        category: item.category,
        isPersonalized: true,
      });
    }
  });

  // 2. Add estimates for uncovered components
  if (hasRegistry) {
    // Only include enabled components
    const enabledComps = getEnabledComponents(homeSystems);
    for (const comp of enabledComps) {
      const compKey = `${comp.systemKey}:${comp.key}`;
      if (personalizedCompKeys.has(compKey)) continue;

      const profile = SYSTEM_PROFILES.find((p) => p.key === compKey);
      if (!profile) continue;

      const estimatedAge = homeAge % profile.lifespanYears;
      const yearsToNext = profile.lifespanYears - estimatedAge;
      const replacementYear = currentYear + yearsToNext;

      if (replacementYear <= currentYear + forecastYears) {
        events.push({
          year: replacementYear,
          label: `${comp.label} — Est. Replacement`,
          cost: profile.replacementCost * comp.quantity,
          category: profile.category,
          isPersonalized: false,
        });
      }
    }
  } else {
    // No registry — use all autoCreate components as generic estimates
    for (const sys of SYSTEMS_CATALOG) {
      for (const comp of sys.components) {
        if (!comp.autoCreate) continue;
        const compKey = `${sys.key}:${comp.key}`;
        if (personalizedCompKeys.has(compKey)) continue;

        const profile = SYSTEM_PROFILES.find((p) => p.key === compKey);
        if (!profile) continue;
        if (personalizedCategories.has(profile.category)) continue;

        const estimatedAge = homeAge % profile.lifespanYears;
        const yearsToNext = profile.lifespanYears - estimatedAge;
        const replacementYear = currentYear + yearsToNext;

        if (replacementYear <= currentYear + forecastYears) {
          events.push({
            year: replacementYear,
            label: `${comp.label} — Est. Replacement`,
            cost: profile.replacementCost,
            category: profile.category,
            isPersonalized: false,
          });
        }
      }
    }
  }

  // 3. Annual baseline
  let annualBaseline = homeValue * 0.01;
  Object.entries(ANNUAL_MAINTENANCE).forEach(([cat, cost]) => {
    if (!personalizedCategories.has(cat)) {
      if (hasRegistry) {
        const matchingSys = SYSTEMS_CATALOG.find((s) => mapSystemToCategory(s.key) === cat);
        if (matchingSys && homeSystems![matchingSys.key]?.enabled) {
          annualBaseline += cost;
        }
      } else {
        annualBaseline += cost;
      }
    }
  });
  annualBaseline = Math.max(annualBaseline, homeValue * 0.01);

  // 4. Yearly totals
  const yearlyTotals: { year: number; predicted: number; baseline: number }[] = [];
  let totalOverForecast = 0;
  for (let i = 1; i <= forecastYears; i++) {
    const year = currentYear + i;
    const yearEvents = events.filter((e) => e.year === year);
    const eventCosts = yearEvents.reduce((sum, e) => sum + e.cost, 0);
    const yearTotal = annualBaseline + eventCosts;
    totalOverForecast += yearTotal;
    yearlyTotals.push({ year, predicted: Math.round(yearTotal), baseline: Math.round(annualBaseline) });
  }

  // 5. Monthly savings
  const recommendedMonthlySavings = Math.round(totalOverForecast / (forecastYears * 12));

  // 6. Confidence
  let confidence = 20;
  if (registryCompleted) confidence += 15;
  if (property.purchase_price) confidence += 15;

  if (hasRegistry) {
    // +10 per system with at least one personalized component
    const systemsWithData = new Set<string>();
    for (const item of normalizedItems) {
      if (!item.install_date) continue;
      if (item.system_key) {
        const sysKey = item.system_key.split(":")[0];
        systemsWithData.add(sysKey);
      }
    }
    confidence += systemsWithData.size * 10;
  } else {
    const documentedSystems = new Set(normalizedItems.filter((i) => i.install_date).map((i) => i.category));
    const majorCats = ["roofing", "hvac", "plumbing", "electrical", "appliance"];
    majorCats.forEach((cat) => {
      if (documentedSystems.has(cat)) confidence += 10;
    });
  }

  const itemsWithDates = normalizedItems.filter(
    (i) => i.install_date && !["roofing", "hvac", "plumbing", "electrical", "appliance"].includes(i.category)
  );
  confidence += Math.min(itemsWithDates.length * 5, 15);
  confidence = Math.min(confidence, 100);

  // 7. Suggestions
  const suggestedItems: { label: string; impact: string }[] = [];

  if (!registryCompleted) {
    suggestedItems.push({
      label: "Set up your home systems",
      impact: "Immediately improves accuracy by ~15%",
    });
  }

  if (!property.purchase_price) {
    suggestedItems.push({
      label: "Set your home's purchase price",
      impact: "Improves baseline estimate by 15%",
    });
  }

  // Suggest details for enabled components without data
  // Use coveredCompKeys (any item exists) to suppress "Add" suggestions,
  // but use personalizedCompKeys (has install_date) for "Update" suggestions
  if (hasRegistry) {
    const enabledComps = getEnabledComponents(homeSystems);
    for (const comp of enabledComps) {
      const compKey = `${comp.systemKey}:${comp.key}`;
      if (coveredCompKeys.has(compKey) && personalizedCompKeys.has(compKey)) continue;
      if (coveredCompKeys.has(compKey) && !personalizedCompKeys.has(compKey)) {
        suggestedItems.push({
          label: `Update your ${comp.label.toLowerCase()} with install date`,
          impact: `Personalizes $${comp.annualCost}/yr in predictions`,
        });
        continue;
      }
      suggestedItems.push({
        label: `Add your ${comp.label.toLowerCase()} details`,
        impact: `Personalizes $${comp.annualCost}/yr in predictions`,
      });
    }
  } else {
    SYSTEM_PROFILES.filter((p) => {
      const sys = SYSTEMS_CATALOG.find((s) => s.key === p.systemKey);
      const comp = sys?.components.find((c) => `${sys.key}:${c.key}` === p.key);
      return comp?.autoCreate;
    }).forEach((profile) => {
      if (coveredCompKeys.has(profile.key) && personalizedCompKeys.has(profile.key)) return;
      if (coveredCompKeys.has(profile.key) && !personalizedCompKeys.has(profile.key)) {
        suggestedItems.push({
          label: `Update your ${profile.label.toLowerCase()} with install date`,
          impact: `Personalizes $${profile.annualCost}/yr in predictions`,
        });
        return;
      }
      suggestedItems.push({
        label: `Add your ${profile.label.toLowerCase()} details`,
        impact: `Personalizes $${profile.annualCost}/yr in predictions`,
      });
    });
  }

  suggestedItems.sort((a, b) => {
    if (a.label.includes("home systems")) return -1;
    if (b.label.includes("home systems")) return 1;
    if (a.label.includes("purchase price")) return -1;
    if (b.label.includes("purchase price")) return 1;
    return 0;
  });

  return {
    recommendedMonthlySavings,
    annualBaseline: Math.round(annualBaseline),
    confidence,
    personalizedCategories,
    events: events.sort((a, b) => a.year - b.year),
    yearlyTotals,
    suggestedItems: suggestedItems.slice(0, 5),
  };
}
