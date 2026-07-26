// Mapping between section identifiers and the /p/:slug/* URL structure.

export const SECTION_SUBPATH: Record<string, string> = {
  overview: "",
  properties: "home/details",
  "home-details": "home/details",
  "home-inventory": "home/inventory",
  "home-systems": "home/systems",
  contacts: "home/contacts",
  maintenance: "activity/log",
  timeline: "activity/timeline",
  "contractor-links": "activity/contractors",
  documents: "documents",
  savings: "money/forecast",
  equity: "money/equity",
  basis: "money/basis",
  "tax-investment": "money/tax",
  bills: "money/bills",
  sharing: "sharing",
};

const SUBPATH_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_SUBPATH).map(([k, v]) => [v, k])
);

export function sectionToPath(section: string, slug: string): string {
  if (section === "settings" || section === "account" || section === "export") return "/account";
  if (section === "notifications") return "/notifications";
  if (section === "search") return `/p/${slug}`;
  if (section === "analytics") return `/p/${slug}`;
  const sub = SECTION_SUBPATH[section];
  if (sub === undefined) return `/p/${slug}`;
  return sub ? `/p/${slug}/${sub}` : `/p/${slug}`;
}

export function pathToSection(pathname: string): string {
  if (pathname.startsWith("/account")) return "settings";
  if (pathname.startsWith("/notifications")) return "notifications";
  const m = pathname.match(/^\/p\/[^/]+\/?(.*)$/);
  if (!m) return "overview";
  const sub = m[1].replace(/\/+$/, "");
  if (!sub) return "overview";
  const known = Object.keys(SUBPATH_TO_SECTION).sort((a, b) => b.length - a.length);
  for (const k of known) {
    if (k && (sub === k || sub.startsWith(k + "/"))) return SUBPATH_TO_SECTION[k];
  }
  return "overview";
}

export function replaceSlugInPath(pathname: string, newSlug: string): string {
  if (!pathname.startsWith("/p/")) return `/p/${newSlug}`;
  return pathname.replace(/^\/p\/[^/]+/, `/p/${newSlug}`);
}

export const LAST_SLUG_KEY = "homelog:lastPropertySlug";
