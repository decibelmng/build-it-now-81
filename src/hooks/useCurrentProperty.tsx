import { createContext, useContext, useEffect, useMemo, useCallback, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";
import { LAST_SLUG_KEY, replaceSlugInPath } from "@/lib/propertyRoutes";

export type PropertyLite = { id: string; name: string; slug?: string | null; created_at?: string | null };

type Ctx = {
  properties: PropertyLite[];
  isLoading: boolean;
  activePropertyId: string | null;
  activeProperty: PropertyLite | null;
  /** Navigates the app to a different property, preserving the current sub-path. */
  navigateToProperty: (id: string) => void;
  // Read-only aliases kept for existing call sites that only read the id.
  selectedPropertyId: string;
  /** Deprecated alias — same as navigateToProperty. */
  setSelectedPropertyId: (id: string) => void;
  propertyNameById: (id?: string | null) => string;
  scope: <T extends { property_id?: string | null }>(rows: T[]) => T[];
  notifyIfDifferent: (newPropertyId?: string | null) => void;
};

const CurrentPropertyContext = createContext<Ctx | null>(null);

type ProviderProps = {
  children: ReactNode;
  property: PropertyLite;
  properties: PropertyLite[];
  isLoading?: boolean;
};

/**
 * Mounted by PropertyLayout once the URL slug has resolved to a real property the
 * signed-in user can reach. Read-only: switching property is done by navigation.
 */
export const CurrentPropertyProvider = ({ children, property, properties, isLoading }: ProviderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (property?.slug) {
      try { localStorage.setItem(LAST_SLUG_KEY, property.slug); } catch {}
    }
  }, [property?.slug]);

  const navigateToProperty = useCallback(
    (id: string) => {
      const target = properties.find((p) => p.id === id);
      if (!target?.slug || target.id === property.id) return;
      navigate(replaceSlugInPath(location.pathname, target.slug));
    },
    [properties, property.id, navigate, location.pathname]
  );

  const propertyNameById = useCallback(
    (id?: string | null) => (id ? getPropertyDisplayName(properties.find((p) => p.id === id)) : ""),
    [properties]
  );

  const scope = useCallback(
    <T extends { property_id?: string | null }>(rows: T[]) =>
      rows.filter((r) => r.property_id === property.id),
    [property.id]
  );

  const notifyIfDifferent = useCallback(
    (newPropertyId?: string | null) => {
      if (!newPropertyId || newPropertyId === property.id) return;
      const target = properties.find((p) => p.id === newPropertyId);
      const name = getPropertyDisplayName(target) || "another property";
      toast(`Saved to ${name}`, {
        action: {
          label: "View",
          onClick: () => target?.slug && navigate(replaceSlugInPath(location.pathname, target.slug)),
        },
      });
    },
    [property.id, properties, navigate, location.pathname]
  );

  const value = useMemo<Ctx>(
    () => ({
      properties,
      isLoading: !!isLoading,
      activePropertyId: property.id,
      activeProperty: property,
      navigateToProperty,
      selectedPropertyId: property.id,
      setSelectedPropertyId: navigateToProperty,
      propertyNameById,
      scope,
      notifyIfDifferent,
    }),
    [properties, isLoading, property, navigateToProperty, propertyNameById, scope, notifyIfDifferent]
  );

  return <CurrentPropertyContext.Provider value={value}>{children}</CurrentPropertyContext.Provider>;
};

export const useCurrentProperty = (): Ctx => {
  const ctx = useContext(CurrentPropertyContext);
  if (!ctx) {
    return {
      properties: [],
      isLoading: false,
      activePropertyId: null,
      activeProperty: null,
      navigateToProperty: () => {},
      selectedPropertyId: "",
      setSelectedPropertyId: () => {},
      propertyNameById: () => "",
      scope: (rows) => rows,
      notifyIfDifferent: () => {},
    };
  }
  return ctx;
};

/** Reachable = owned OR shared-accepted (enforced by RLS). */
export function useReachableProperties() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reachable_properties", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, slug, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PropertyLite[];
    },
  });
}
