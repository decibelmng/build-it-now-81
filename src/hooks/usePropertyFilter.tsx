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
  setActivePropertyId: (id: string) => void; // navigates; kept for legacy call sites
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  propertyNameById: (id?: string | null) => string;
  scope: <T extends { property_id?: string | null }>(rows: T[]) => T[];
  notifyIfDifferent: (newPropertyId?: string | null) => void;
};

const PropertyFilterContext = createContext<Ctx | null>(null);

type ProviderProps = {
  children: ReactNode;
  property: PropertyLite;
  properties: PropertyLite[];
  isLoading?: boolean;
};

/**
 * Provider is mounted by PropertyLayout after the slug in the URL has resolved to
 * a real property the current user can reach. The provider is READ-ONLY:
 * switching property is done by navigation, never by mutating context.
 */
export const PropertyFilterProvider = ({ children, property, properties, isLoading }: ProviderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Persist last-visited slug for the root redirect on next boot.
  useEffect(() => {
    if (property?.slug) {
      try { localStorage.setItem(LAST_SLUG_KEY, property.slug); } catch {}
    }
  }, [property?.slug]);

  const setActivePropertyId = useCallback(
    (id: string) => {
      const target = properties.find((p) => p.id === id);
      if (!target?.slug || target.id === property.id) return;
      navigate(replaceSlugInPath(location.pathname, target.slug));
    },
    [properties, property.id, navigate, location.pathname]
  );

  const setSelectedPropertyId = setActivePropertyId;

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
      setActivePropertyId,
      selectedPropertyId: property.id,
      setSelectedPropertyId,
      propertyNameById,
      scope,
      notifyIfDifferent,
    }),
    [properties, isLoading, property, setActivePropertyId, setSelectedPropertyId, propertyNameById, scope, notifyIfDifferent]
  );

  return <PropertyFilterContext.Provider value={value}>{children}</PropertyFilterContext.Provider>;
};

export const usePropertyFilter = (): Ctx => {
  const ctx = useContext(PropertyFilterContext);
  if (!ctx) {
    // Safe empty state so cross-property pages (portfolio, account) don't crash if
    // a rogue import path pulls in the hook.
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

/** Lightweight query used by RootRedirect / LegacyRedirect / PropertySwitcher search — reachable = owned OR shared-accepted. */
export function useReachableProperties() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reachable_properties", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // RLS already restricts to reachable rows (owner + accepted share policies exist).
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, slug, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PropertyLite[];
    },
  });
}
