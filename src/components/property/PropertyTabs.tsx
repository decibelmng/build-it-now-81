import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCurrentProperty } from "@/hooks/useCurrentProperty";

type Item = { to: string; label: string };

interface Props {
  items: Item[];
  className?: string;
}

/**
 * Route-driven tab strip. Each tab is a real link and the active state is
 * determined by the URL, not by internal component state.
 */
const PropertyTabs = ({ items, className }: Props) => {
  const { activeProperty } = useCurrentProperty();
  const slug = activeProperty?.slug;
  const { pathname } = useLocation();
  if (!slug) return null;

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1",
        className
      )}
      role="tablist"
    >
      {items.map((it) => {
        const to = `/p/${slug}/${it.to}`.replace(/\/+$/, "");
        const active = pathname === to || pathname === to + "/";
        return (
          <NavLink
            key={it.to}
            to={to}
            end
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-md px-3 py-1.5 font-body text-sm font-medium transition-colors",
              active
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {it.label}
          </NavLink>
        );
      })}
    </div>
  );
};

export default PropertyTabs;
