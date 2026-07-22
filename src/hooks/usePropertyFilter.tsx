import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STORAGE_KEY = "propertyFilter";

export type PropertyLite = { id: string; name: string };

type Ctx = {
  selectedPropertyId: string | "all";
  setSelectedPropertyId: (id: string | "all") => void;
  properties: PropertyLite[];
  activeProperty: PropertyLite | null;
  propertyNameById: (id?: string | null) => string;
  scope: <T extends { property_id?: string | null }>(rows: T[]) => T[];
  notifyIfDifferent: (newPropertyId?: string | null) => void;
};

const PropertyFilterContext = createContext<Ctx | null>(null);

export const PropertyFilterProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const { data: properties = [] } = useQuery({
    queryKey: ["property_filter_list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as PropertyLite[];
    },
    enabled: !!user,
  });

  const [selectedPropertyId, setState] = useState<string | "all">("all");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (restored || properties.length === 0) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== "all" && properties.some((p) => p.id === stored)) {
        setState(stored);
      } else {
        setState("all");
      }
    } catch {}
    setRestored(true);
  }, [properties, restored]);

  // Guard: if selected id disappears, fall back to "all"
  useEffect(() => {
    if (selectedPropertyId !== "all" && properties.length > 0 && !properties.some((p) => p.id === selectedPropertyId)) {
      setState("all");
    }
  }, [selectedPropertyId, properties]);

  const setSelectedPropertyId = useCallback((id: string | "all") => {
    setState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const propertyNameById = useCallback(
    (id?: string | null) => (id ? properties.find((p) => p.id === id)?.name ?? "" : ""),
    [properties]
  );

  const scope = useCallback(
    <T extends { property_id?: string | null }>(rows: T[]) =>
      selectedPropertyId === "all" ? rows : rows.filter((r) => r.property_id === selectedPropertyId),
    [selectedPropertyId]
  );

  const notifyIfDifferent = useCallback(
    (newPropertyId?: string | null) => {
      if (!newPropertyId) return;
      if (selectedPropertyId === "all") return;
      if (newPropertyId === selectedPropertyId) return;
      const name = properties.find((p) => p.id === newPropertyId)?.name ?? "another property";
      toast(`Saved to ${name}`, {
        action: { label: "View", onClick: () => setSelectedPropertyId(newPropertyId) },
      });
    },
    [selectedPropertyId, properties, setSelectedPropertyId]
  );

  const activeProperty = useMemo(
    () => (selectedPropertyId === "all" ? null : properties.find((p) => p.id === selectedPropertyId) ?? null),
    [selectedPropertyId, properties]
  );

  const value = useMemo(
    () => ({ selectedPropertyId, setSelectedPropertyId, properties, activeProperty, propertyNameById, scope, notifyIfDifferent }),
    [selectedPropertyId, setSelectedPropertyId, properties, activeProperty, propertyNameById, scope, notifyIfDifferent]
  );

  return <PropertyFilterContext.Provider value={value}>{children}</PropertyFilterContext.Provider>;
};

export const usePropertyFilter = (): Ctx => {
  const ctx = useContext(PropertyFilterContext);
  if (!ctx) {
    // Safe no-op fallback for components rendered outside the dashboard.
    return {
      selectedPropertyId: "all",
      setSelectedPropertyId: () => {},
      properties: [],
      activeProperty: null,
      propertyNameById: () => "",
      scope: (rows) => rows,
      notifyIfDifferent: () => {},
    };
  }
  return ctx;
};
