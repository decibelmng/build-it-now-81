/**
 * Predictive Savings Forecaster
 * Calculates future home maintenance costs based on property data and tracked items.
 * Uses the Home Systems Registry when available to only predict costs for systems the home actually has.
 */

import { SYSTEMS_CATALOG, type HomeSystemsRegistry } from "@/lib/homeSystemsRegistry";

export interface SystemCostProfile {
  key: string;
  label: string;
  category: string;
  replacementCost: number;
  lifespanYears: number;
  annualCost: number;
}

// Build SYSTEM_PROFILES from SYSTEMS_CATALOG for backward compatibility
export const SYSTEM_PROFILES: SystemCostProfile[] = SYSTEMS_CATALOG.map((s) => ({
  key: s.key,
  label: s.label,
  category: s.category,
  replacementCost: s.replacementCost,
  lifespanYears: s.lifespanYears,
  annualCost: s.annualCost,
}));

// Map variant category names to their canonical SYSTEM_PROFILES category
const CATEGORY_ALIASES: Record<string, string> = {
  roof: "roofing",
  "hvac system": "hvac",
  "hvac_system": "hvac",
};

/** Normalize a category to its canonical form */
export function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower;
}

export const ANNUAL_MAINTENANCE: Record<string, number> = {
  plumbing: 300,
  electrical: 200,
};

const MAJOR_SYSTEM_CATEGORIES = ["roofing", "hvac", "plumbing", "electrical", "appliance"];

export interface HomeItem {
  id: string;
  name: string;
  category: string;
  install_date: string | null;
  expected_replacement: string | null;
  estimated_value: number | null;
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
  homeSystems?: HomeSystemsRegistry | null,
  registryCompleted?: boolean
): ForecastResult {
  const now = new Date();
  const currentYear = now.getFullYear();
  const homeAge = property.year_built ? currentYear - property.year_built : 20;
  const homeValue = property.purchase_price || 350000;

  const hasRegistry = !!homeSystems && !!registryCompleted;

  // Track which categories have personalized data
  const personalizedCategories = new Set<string>();
  const events: ForecastEvent[] = [];

  // Normalize item categories
  const normalizedItems = homeItems.map((item) => ({
    ...item,
    category: normalizeCategory(item.category),
  }));

  // 1. Process tracked home items for personalized predictions
  normalizedItems.forEach((item) => {
    if (!item.install_date) return;

    const installYear = new Date(item.install_date).getFullYear();
    const profile = SYSTEM_PROFILES.find((p) => p.category === item.category);
    if (!profile) return;

    // If registry exists and this system is disabled, skip
    if (hasRegistry && homeSystems![profile.key] && !homeSystems![profile.key].enabled) return;

    personalizedCategories.add(item.category);

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

  // 2. Add estimates for uncovered categories
  SYSTEM_PROFILES.forEach((profile) => {
    if (personalizedCategories.has(profile.category)) return;

    // If registry exists, only include enabled systems
    if (hasRegistry) {
      const entry = homeSystems![profile.key];
      if (!entry?.enabled) return;

      // Multiply by quantity
      const quantity = entry.quantity || 1;
      const estimatedAge = homeAge % profile.lifespanYears;
      const yearsToNext = profile.lifespanYears - estimatedAge;
      const replacementYear = currentYear + yearsToNext;

      if (replacementYear <= currentYear + forecastYears) {
        events.push({
          year: replacementYear,
          label: `${profile.label} — Est. Replacement`,
          cost: profile.replacementCost * quantity,
          category: profile.category,
          isPersonalized: false,
        });
      }
    } else {
      // No registry — iterate all systems as generic estimates (backward compatible)
      const estimatedAge = homeAge % profile.lifespanYears;
      const yearsToNext = profile.lifespanYears - estimatedAge;
      const replacementYear = currentYear + yearsToNext;

      if (replacementYear <= currentYear + forecastYears) {
        events.push({
          year: replacementYear,
          label: `${profile.label} — Est. Replacement`,
          cost: profile.replacementCost,
          category: profile.category,
          isPersonalized: false,
        });
      }
    }
  });

  // 3. Calculate annual baseline
  let annualBaseline = homeValue * 0.01;

  Object.entries(ANNUAL_MAINTENANCE).forEach(([cat, cost]) => {
    if (!personalizedCategories.has(cat)) {
      // If registry exists, only add if system is enabled
      if (hasRegistry) {
        const matchingProfile = SYSTEM_PROFILES.find((p) => p.category === cat);
        if (matchingProfile && homeSystems![matchingProfile.key]?.enabled) {
          annualBaseline += cost;
        }
      } else {
        annualBaseline += cost;
      }
    }
  });

  annualBaseline = Math.max(annualBaseline, homeValue * 0.01);

  // 4. Build yearly totals
  const yearlyTotals: { year: number; predicted: number; baseline: number }[] = [];
  let totalOverForecast = 0;

  for (let i = 1; i <= forecastYears; i++) {
    const year = currentYear + i;
    const yearEvents = events.filter((e) => e.year === year);
    const eventCosts = yearEvents.reduce((sum, e) => sum + e.cost, 0);
    const yearTotal = annualBaseline + eventCosts;
    totalOverForecast += yearTotal;

    yearlyTotals.push({
      year,
      predicted: Math.round(yearTotal),
      baseline: Math.round(annualBaseline),
    });
  }

  // 5. Recommended monthly savings
  const recommendedMonthlySavings = Math.round(totalOverForecast / (forecastYears * 12));

  // 6. Confidence score
  let confidence = 20; // Base: having a property
  if (registryCompleted) confidence += 15;
  if (property.purchase_price) confidence += 15;

  const documentedSystems = new Set(normalizedItems.filter((i) => i.install_date).map((i) => i.category));

  // +10 per enabled system with personalized data
  if (hasRegistry) {
    SYSTEM_PROFILES.forEach((p) => {
      if (homeSystems![p.key]?.enabled && documentedSystems.has(p.category)) {
        confidence += 10;
      }
    });
  } else {
    MAJOR_SYSTEM_CATEGORIES.forEach((cat) => {
      if (documentedSystems.has(cat)) confidence += 10;
    });
  }

  // Additional items with dates (non-major)
  const itemsWithDates = normalizedItems.filter(
    (i) => i.install_date && !MAJOR_SYSTEM_CATEGORIES.includes(i.category)
  );
  confidence += Math.min(itemsWithDates.length * 5, 15);
  confidence = Math.min(confidence, 100);

  // 7. Suggested items
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

  SYSTEM_PROFILES.forEach((profile) => {
    // Only suggest for enabled systems (or all if no registry)
    if (hasRegistry && !homeSystems![profile.key]?.enabled) return;
    if (personalizedCategories.has(profile.category)) return;

    const existingItem = normalizedItems.find((i) => i.category === profile.category);
    if (existingItem) {
      suggestedItems.push({
        label: `Update your ${profile.label.toLowerCase()} install date`,
        impact: `Personalizes $${profile.annualCost}/yr in predictions`,
      });
    } else {
      suggestedItems.push({
        label: `Add your ${profile.label.toLowerCase()} details`,
        impact: `Personalizes $${profile.annualCost}/yr in predictions`,
      });
    }
  });

  // Sort: registry setup first, then purchase price, then rest
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
