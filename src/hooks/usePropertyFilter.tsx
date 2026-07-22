import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
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
  properties: PropertyLite[];
  isLoading: boolean;
  activePropertyId: string | null; // null only while loading or when user has zero properties
  activeProperty: PropertyLite | null;
  setActivePropertyId: (id: string) => void;

  // Legacy API retained for existing consumers. `selectedPropertyId` is now
  // always the same as activePropertyId (or "" while loading/zero properties);
  // it never returns the literal "all".
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  propertyNameById: (id?: string | null) => string;
  scope: <T extends { property_id?: string | null }>(rows: T[]) => T[];
  notifyIfDifferent: (newPropertyId?: string | null) => void;
};

const PropertyFilterContext = createContext<Ctx | null>(null);

export const PropertyFilterProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

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

  const [activePropertyId, setActive] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const writeUrlLS = useCallback((id: string) => {
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, id);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  // Initial resolution: URL > localStorage > first property
  useEffect(() => {
    if (restored || isLoading) return;
    if (properties.length === 0) {
      setRestored(true);
      return;
    }
    const urlId = searchParams.get(URL_PARAM);
    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch {}

    let resolved: string;
    if (urlId && urlId !== "all" && properties.some((p) => p.id === urlId)) {
      resolved = urlId;
    } else if (stored && stored !== "all" && properties.some((p) => p.id === stored)) {
      resolved = stored;
    } else {
      resolved = properties[0].id;
    }
    setActive(resolved);
    // Overwrite any stale "all" or unknown value in URL/LS with the resolved uuid.
    writeUrlLS(resolved);
    setRestored(true);
  }, [properties, isLoading, restored, searchParams, writeUrlLS]);

  // Guard against stale/deleted id
  useEffect(() => {
    if (!restored || properties.length === 0) return;
    if (activePropertyId && !properties.some((p) => p.id === activePropertyId)) {
      const first = properties[0].id;
      setActive(first);
      writeUrlLS(first);
    }
  }, [activePropertyId, properties, restored, writeUrlLS]);

  const setActivePropertyId = useCallback((id: string) => {
    setActive(id);
    writeUrlLS(id);
  }, [writeUrlLS]);

  const selectedPropertyId: string = activePropertyId ?? "";
  const setSelectedPropertyId = useCallback(
    (id: string) => { if (id) setActivePropertyId(id); },
    [setActivePropertyId]
  );

  const propertyNameById = useCallback(
    (id?: string | null) => (id ? getPropertyDisplayName(properties.find((p) => p.id === id)) : ""),
    [properties]
  );

  const scope = useCallback(
    <T extends { property_id?: string | null }>(rows: T[]) =>
      activePropertyId ? rows.filter((r) => r.property_id === activePropertyId) : rows,
    [activePropertyId]
  );

  const activeProperty = useMemo(
    () => (activePropertyId ? properties.find((p) => p.id === activePropertyId) ?? null : null),
    [activePropertyId, properties]
  );

  const notifyIfDifferent = useCallback(
    (newPropertyId?: string | null) => {
      if (!newPropertyId || !activePropertyId) return;
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
      selectedPropertyId,
      setSelectedPropertyId,
      propertyNameById,
      scope,
      notifyIfDifferent,
    }),
    [properties, isLoading, activePropertyId, activeProperty, setActivePropertyId, selectedPropertyId, setSelectedPropertyId, propertyNameById, scope, notifyIfDifferent]
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
      selectedPropertyId: "",
      setSelectedPropertyId: () => {},
      propertyNameById: () => "",
      scope: (rows) => rows,
      notifyIfDifferent: () => {},
    };
  }
  return ctx;
};
