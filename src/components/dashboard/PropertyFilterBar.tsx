import { useEffect } from "react";
import { useAllowAllProperty, usePropertyFilter } from "@/hooks/usePropertyFilter";

/**
 * DEPRECATED as a visible UI element. The global <PropertySwitcher /> in the
 * app chrome now shows the property picker. This component remains as a
 * headless controller so per-page call sites can keep their existing render
 * position: it registers the route's `allowAll` preference and, when a page
 * passes an explicit value/onChange (legacy pattern), keeps them in sync with
 * the global active property.
 */
interface PropertyFilterBarProps {
  allowAll?: boolean;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
}

const PropertyFilterBar = ({ allowAll = true, value, onChange }: PropertyFilterBarProps) => {
  useAllowAllProperty(allowAll);
  const { activePropertyId, properties } = usePropertyFilter();

  // Legacy sync: mirror the global active id into the caller's local state.
  useEffect(() => {
    if (!onChange) return;
    const target = activePropertyId ?? (allowAll ? "all" : properties[0]?.id ?? "");
    if (target && target !== value) onChange(target);
  }, [activePropertyId, allowAll, properties, onChange, value]);

  return null;
};

export default PropertyFilterBar;
