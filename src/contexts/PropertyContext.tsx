/**
 * Thin re-export layer so consumers can import from a stable "context" path.
 * The real implementation lives in @/hooks/usePropertyFilter to avoid a
 * second competing properties query.
 */
import { PropertyFilterProvider, usePropertyFilter } from "@/hooks/usePropertyFilter";
import type { PropertyLite } from "@/hooks/usePropertyFilter";

export const PropertyProvider = PropertyFilterProvider;
export type Property = PropertyLite;

export function useProperty() {
  const c = usePropertyFilter();
  return {
    properties: c.properties,
    isLoading: c.isLoading,
    activePropertyId: c.activePropertyId,
    activeProperty: c.activeProperty,
    isAllScope: c.activePropertyId === null,
    setActivePropertyId: c.setActivePropertyId,
  };
}
