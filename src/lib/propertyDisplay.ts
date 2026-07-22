type PropertyLike = {
  name?: string | null;
  address?: string | null;
};

export function getPropertyDisplayName(
  property: PropertyLike | null | undefined
): string {
  if (!property) return "Untitled Property";

  const candidates = [
    property.name,
    property.address,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return "Untitled Property";
}

export function getPropertyShortName(
  property: PropertyLike | null | undefined,
  maxLength = 22
): string {
  const full = getPropertyDisplayName(property);
  if (full.length <= maxLength) return full;
  return full.slice(0, maxLength - 1).trimEnd() + "…";
}
