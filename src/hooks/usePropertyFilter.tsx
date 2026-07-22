import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";

const STORAGE_KEY = "homelog:activePropertyId";
const URL_PARAM = "property";

export type PropertyLite = { id: string; name: string; created_at?: string | null };

type Ctx = {
  // New standardized API
  properties: PropertyLite[];
  isLoading: boolean;
  activePropertyId: string | null; // null = "All"
  activeProperty: PropertyLite | null;
  setActivePropertyId: (id: string | null) => void;
  allowAll: boolean;
  setAllowAll: (v: boolean) => void;

  // Legacy API (kept for existing consumers)
  selectedPropertyId: string | "all";
  setSelectedPropertyId: (id: string | "all") => void;
  propertyNameById: (id?: string | null) => string;
  scope: <T extends { property_id?: string | null }>(rows: T[]) => T[];
  notifyIfDifferent: (newPropertyId?: string | null) => void;
};

const PropertyFilterContext = createContext<Ctx | null>(null);

export const PropertyFilterProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["property_filter_list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PropertyLite[];
    },
    enabled: !!user,
  });

  // activePropertyId: null == "All"
  const [activePropertyId, setActive] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [allowAll, setAllowAll] = useState(true);

  // Initial resolution (URL > localStorage > first)
  useEffect(() => {
    if (restored || isLoading) return;
    if (properties.length === 0) {
      setRestored(true);
      return;
    }
    const urlId = searchParams.get(URL_PARAM);
    let resolved: string | null = null;
    if (urlId && properties.some((p) => p.id === urlId)) {
      resolved = urlId;
    } else {
      let stored: string | null = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch {}
      if (stored && stored !== "all" && properties.some((p) => p.id === stored)) {
        resolved = stored;
      } else if (stored === "all") {
        resolved = null;
      } else {
        resolved = properties[0].id;
      }
    }
    setActive(resolved);
    setRestored(true);
  }, [properties, isLoading, restored, searchParams]);

  // Guard against stale/deleted id
  useEffect(() => {
    if (!restored || properties.length === 0) return;
    if (activePropertyId && !properties.some((p) => p.id === activePropertyId)) {
      const first = properties[0]?.id ?? null;
      setActive(first);
      try { localStorage.setItem(STORAGE_KEY, first ?? "all"); } catch {}
    }
  }, [activePropertyId, properties, restored]);

  const writeUrlLS = useCallback((id: string | null) => {
    try { localStorage.setItem(STORAGE_KEY, id ?? "all"); } catch {}
    // Use replaceState to keep browser back navigation between pages.
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(URL_PARAM, id);
    else url.searchParams.delete(URL_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  const setActivePropertyId = useCallback((id: string | null) => {
    setActive(id);
    writeUrlLS(id);
  }, [writeUrlLS]);

  // If a route disallows "All" and current is null, auto-select first
  useEffect(() => {
    if (!restored) return;
    if (!allowAll && activePropertyId === null && properties.length > 0) {
      setActivePropertyId(properties[0].id);
    }
  }, [allowAll, activePropertyId, properties, restored, setActivePropertyId]);

  // Legacy helpers
  const selectedPropertyId: string | "all" = activePropertyId ?? "all";
  const setSelectedPropertyId = useCallback(
    (id: string | "all") => setActivePropertyId(id === "all" ? null : id),
    [setActivePropertyId]
  );

  const propertyNameById = useCallback(
    (id?: string | null) => (id ? getPropertyDisplayName(properties.find((p) => p.id === id)) : ""),
    [properties]
  );

  const scope = useCallback(
    <T extends { property_id?: string | null }>(rows: T[]) =>
      activePropertyId === null ? rows : rows.filter((r) => r.property_id === activePropertyId),
    [activePropertyId]
  );

  const activeProperty = useMemo(
    () => (activePropertyId === null ? null : properties.find((p) => p.id === activePropertyId) ?? null),
    [activePropertyId, properties]
  );

  const notifyIfDifferent = useCallback(
    (newPropertyId?: string | null) => {
      if (!newPropertyId) return;
      if (activePropertyId === null) return;
      if (newPropertyId === activePropertyId) return;
      const name = getPropertyDisplayName(properties.find((p) => p.id === newPropertyId)) || "another property";
      toast(`Saved to ${name}`, {
        action: { label: "View", onClick: () => setActivePropertyId(newPropertyId) },
      });
    },
    [activePropertyId, properties, setActivePropertyId]
  );

  const value = useMemo<Ctx>(
    () => ({
      properties,
      isLoading,
      activePropertyId,
      activeProperty,
      setActivePropertyId,
      allowAll,
      setAllowAll,
      selectedPropertyId,
      setSelectedPropertyId,
      propertyNameById,
      scope,
      notifyIfDifferent,
    }),
    [properties, isLoading, activePropertyId, activeProperty, setActivePropertyId, allowAll, selectedPropertyId, setSelectedPropertyId, propertyNameById, scope, notifyIfDifferent]
  );

  return <PropertyFilterContext.Provider value={value}>{children}</PropertyFilterContext.Provider>;
};

export const usePropertyFilter = (): Ctx => {
  const ctx = useContext(PropertyFilterContext);
  if (!ctx) {
    return {
      properties: [],
      isLoading: false,
      activePropertyId: null,
      activeProperty: null,
      setActivePropertyId: () => {},
      allowAll: true,
      setAllowAll: () => {},
      selectedPropertyId: "all",
      setSelectedPropertyId: () => {},
      propertyNameById: () => "",
      scope: (rows) => rows,
      notifyIfDifferent: () => {},
    };
  }
  return ctx;
};

/**
 * Route-level helper: set whether the global switcher should offer an "All"
 * option on this page. Call at the top of a page component.
 */
export const useAllowAllProperty = (allow: boolean) => {
  const { setAllowAll } = usePropertyFilter();
  const ref = useRef(allow);
  ref.current = allow;
  useEffect(() => {
    setAllowAll(allow);
    return () => setAllowAll(true);
  }, [allow, setAllowAll]);
};
