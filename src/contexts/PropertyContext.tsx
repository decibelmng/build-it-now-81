/**
 * Thin re-export layer so consumers can import from a stable "context" path.
 * The real implementation lives in @/hooks/useCurrentProperty.
 */
import { CurrentPropertyProvider, useCurrentProperty } from "@/hooks/useCurrentProperty";
import type { PropertyLite } from "@/hooks/useCurrentProperty";

export const PropertyProvider = CurrentPropertyProvider;
export type Property = PropertyLite;

export function useProperty() {
  const c = useCurrentProperty();
  return {
    properties: c.properties,
    isLoading: c.isLoading,
    activePropertyId: c.activePropertyId,
    activeProperty: c.activeProperty,
    navigateToProperty: c.navigateToProperty,
  };
}
