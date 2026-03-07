/**
 * Matches a maintenance log entry to an existing home component or suggests a new one.
 */

interface ComponentRecord {
  id: string;
  name: string;
  category: string;
  item_type: string;
}

interface MatchResult {
  componentId: string | null;
  componentType: string | null;
  confidence: number;
  isNewComponent: boolean;
}

const KEYWORD_MAP: [string[], string][] = [
  [["roof", "shingle", "gutter", "flashing"], "Roof"],
  [["hvac", "furnace", "ac", "heat pump", "air handler", "air conditioning"], "HVAC System"],
  [["water heater", "hot water", "tankless"], "Water Heater"],
  [["paint", "repaint", "exterior coat", "stain"], "Exterior Paint"],
  [["dishwasher", "refrigerator", "fridge", "washer", "dryer", "oven", "stove", "microwave", "garbage disposal"], "Appliance"],
  [["plumbing", "pipe", "drain", "sewer", "faucet", "toilet"], "Plumbing"],
  [["electric", "panel", "wiring", "outlet", "breaker", "circuit"], "Electrical"],
  [["window", "glass", "pane", "screen"], "Windows"],
  [["door", "garage door", "entry"], "Doors"],
  [["flooring", "hardwood", "tile", "carpet", "laminate"], "Flooring"],
];

const CATEGORY_TO_TYPE: Record<string, string> = {
  hvac: "HVAC System",
  roofing: "Roof",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance",
  landscaping: "Landscaping",
  exterior: "Exterior Paint",
  interior: "Flooring",
};

const NO_MATCH: MatchResult = {
  componentId: null,
  componentType: null,
  confidence: 0,
  isNewComponent: false,
};

export function matchLogToComponent(
  logTitle: string,
  logDescription: string,
  logCategory: string,
  existingComponents: ComponentRecord[],
): MatchResult {
  const title = logTitle.toLowerCase();
  const desc = (logDescription || "").toLowerCase();
  const combined = `${title} ${desc}`;

  // 1. EXACT MATCH — log text contains a component's name
  for (const comp of existingComponents) {
    const name = comp.name.toLowerCase();
    if (name.length > 1 && (combined.includes(name))) {
      return { componentId: comp.id, componentType: comp.category, confidence: 0.95, isNewComponent: false };
    }
  }

  // 2. KEYWORD MATCH
  for (const [keywords, componentType] of KEYWORD_MAP) {
    const matchedKeyword = keywords.find((kw) => combined.includes(kw));
    if (matchedKeyword) {
      // Determine specific name for appliances
      const specificType = componentType === "Appliance" ? capitalise(matchedKeyword) : componentType;

      // Check if an existing component of this type exists
      const existing = existingComponents.find(
        (c) => c.name.toLowerCase() === specificType.toLowerCase() || c.category.toLowerCase() === componentType.toLowerCase(),
      );

      if (existing) {
        return { componentId: existing.id, componentType: specificType, confidence: 0.8, isNewComponent: false };
      }

      return { componentId: null, componentType: specificType, confidence: 0.75, isNewComponent: true };
    }
  }

  // 3. CATEGORY INFERENCE
  const catLower = logCategory.toLowerCase();
  const inferredType = CATEGORY_TO_TYPE[catLower];
  if (inferredType) {
    const existing = existingComponents.find(
      (c) => c.name.toLowerCase() === inferredType.toLowerCase() || c.category.toLowerCase() === catLower,
    );

    return {
      componentId: existing?.id ?? null,
      componentType: inferredType,
      confidence: 0.6,
      isNewComponent: !existing,
    };
  }

  // 4. NO MATCH
  return NO_MATCH;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
