import { useMemo, useState } from "react";
import { ChevronDown, Check, Home, Plus, Search } from "lucide-react";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { getPropertyDisplayName, getPropertyShortName } from "@/lib/propertyDisplay";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface PropertySwitcherProps {
  className?: string;
}

const PropertySwitcher = ({ className }: PropertySwitcherProps) => {
  const { properties, activePropertyId, setActivePropertyId, activeProperty, isLoading } = usePropertyFilter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return properties;
    const q = filter.trim().toLowerCase();
    return properties.filter((p) => getPropertyDisplayName(p).toLowerCase().includes(q));
  }, [properties, filter]);

  const label = activeProperty
    ? getPropertyShortName(activeProperty, 22)
    : isLoading
      ? "Loading…"
      : "Add a property";

  const goAddProperty = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("navigate-section", { detail: "properties" }));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-between gap-2 rounded-lg px-3 font-body text-sm font-medium",
            "focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-0",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Home className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-[220px] p-1">
        {properties.length > 8 && (
          <div className="p-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search properties..."
                className="h-8 pl-7 font-body text-sm"
              />
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="px-3 py-2 font-body text-xs text-muted-foreground">
            {properties.length === 0 ? "No properties yet" : "No matches"}
          </div>
        )}
        {filtered.map((p) => {
          const active = p.id === activePropertyId;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => setActivePropertyId(p.id)}
              className="font-body text-sm"
            >
              <Check className={cn("mr-2 h-4 w-4", active ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{getPropertyDisplayName(p)}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={goAddProperty} className="font-body text-sm text-accent">
          <Plus className="mr-2 h-4 w-4" />
          Add property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PropertySwitcher;
