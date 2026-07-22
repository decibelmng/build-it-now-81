import { useEffect } from "react";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";

/**
 * DEPRECATED as a visible UI element. The global <PropertySwitcher /> in the
 * app chrome owns the picker. This is kept as a headless no-op controller so
 * that legacy call sites with `value`/`onChange` keep syncing to the active
 * property id.
 */
interface PropertyFilterBarProps {
  allowAll?: boolean; // ignored; retained for call-site compatibility
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
}

const PropertyFilterBar = ({ value, onChange }: PropertyFilterBarProps) => {
  const { activePropertyId } = usePropertyFilter();

  useEffect(() => {
    if (!onChange || !activePropertyId) return;
    if (activePropertyId !== value) onChange(activePropertyId);
  }, [activePropertyId, onChange, value]);

  return null;
};

export default PropertyFilterBar;
