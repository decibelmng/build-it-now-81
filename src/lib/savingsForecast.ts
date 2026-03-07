/**
 * Predictive Savings Forecaster
 * Calculates future home maintenance costs based on property data and tracked items.
 */

export interface SystemCostProfile {
  label: string;
  category: string;
  replacementCost: number;
  lifespanYears: number;
  annualCost: number;
}

export const SYSTEM_PROFILES: SystemCostProfile[] = [
  { label: "Roof", category: "roofing", replacementCost: 10000, lifespanYears: 25, annualCost: 400 },
  { label: "HVAC System", category: "hvac", replacementCost: 7500, lifespanYears: 18, annualCost: 417 },
  { label: "Water Heater", category: "plumbing", replacementCost: 2000, lifespanYears: 12, annualCost: 167 },
  { label: "Exterior Paint", category: "exterior", replacementCost: 5000, lifespanYears: 8, annualCost: 625 },
  { label: "Appliances", category: "appliance", replacementCost: 1200, lifespanYears: 12, annualCost: 100 },
  { label: "Flooring", category: "structural", replacementCost: 3000, lifespanYears: 20, annualCost: 150 },
];

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
  forecastYears: number = 10
): ForecastResult {
  const now = new Date();
  const currentYear = now.getFullYear();
  const homeAge = property.year_built ? currentYear - property.year_built : 20;
  const homeValue = property.purchase_price || 350000;

  // Track which categories have personalized data
  const personalizedCategories = new Set<string>();
  const events: ForecastEvent[] = [];

  // 1. Process tracked home items for personalized predictions
  // Normalize item categories for matching against SYSTEM_PROFILES
  const normalizedItems = homeItems.map((item) => ({
    ...item,
    category: normalizeCategory(item.category),
  }));

  normalizedItems.forEach((item) => {
    if (!item.install_date) return;

    const installYear = new Date(item.install_date).getFullYear();
    const profile = SYSTEM_PROFILES.find((p) => p.category === item.category);
    if (!profile) return;

    personalizedCategories.add(item.category);

    const lifespan = profile.lifespanYears;
    const age = currentYear - installYear;
    const yearsRemaining = Math.max(0, lifespan - age);
    const replacementYear = currentYear + yearsRemaining;

    // Add replacement events within forecast window
    if (replacementYear <= currentYear + forecastYears) {
      events.push({
        year: replacementYear,
        label: `Replace ${item.name}`,
        cost: profile.replacementCost,
        category: item.category,
        isPersonalized: true,
      });
    }

    // If replacement already overdue, flag it in year 1
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

  // 2. Add generic estimates for uncovered categories
  SYSTEM_PROFILES.forEach((profile) => {
    if (personalizedCategories.has(profile.category)) return;

    // Estimate replacement based on home age
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
  });

  // 3. Calculate annual baseline (ongoing maintenance)
  let annualBaseline = homeValue * 0.01; // 1% rule

  // Add specific annual maintenance costs
  Object.entries(ANNUAL_MAINTENANCE).forEach(([cat, cost]) => {
    if (!personalizedCategories.has(cat)) {
      annualBaseline += cost;
    }
  });

  // Reduce baseline to avoid double-counting with the 1% rule
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

  // 5. Calculate recommended monthly savings
  const recommendedMonthlySavings = Math.round(totalOverForecast / (forecastYears * 12));

  // 6. Calculate confidence score
  let confidence = 20; // Base: having a property
  if (property.purchase_price) confidence += 15;

  const documentedSystems = new Set(normalizedItems.map((i) => i.category));
  MAJOR_SYSTEM_CATEGORIES.forEach((cat) => {
    if (documentedSystems.has(cat)) confidence += 10;
  });

  // Additional items with install dates
  const itemsWithDates = normalizedItems.filter((i) => i.install_date && !MAJOR_SYSTEM_CATEGORIES.includes(i.category));
  confidence += Math.min(itemsWithDates.length * 5, 15);

  confidence = Math.min(confidence, 100);

  // 7. Suggest most impactful items to add or update
  const suggestedItems: { label: string; impact: string }[] = [];

  if (!property.purchase_price) {
    suggestedItems.push({ label: "Set your home's purchase price", impact: "Improves baseline estimate by 15%" });
  }

  SYSTEM_PROFILES.forEach((profile) => {
    if (personalizedCategories.has(profile.category)) return; // fully tracked, skip

    const existingItem = normalizedItems.find((i) => i.category === profile.category);
    if (existingItem) {
      // Component exists but missing install_date — suggest updating it
      suggestedItems.push({
        label: `Update your ${profile.label.toLowerCase()} install date`,
        impact: `Personalizes $${profile.annualCost}/yr in predictions`,
      });
    } else {
      // No component at all — suggest adding one
      suggestedItems.push({
        label: `Add your ${profile.label.toLowerCase()} details`,
        impact: `Personalizes $${profile.annualCost}/yr in predictions`,
      });
    }
  });

  // Sort by impact (systems with highest annual cost first)
  suggestedItems.sort((a, b) => {
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
