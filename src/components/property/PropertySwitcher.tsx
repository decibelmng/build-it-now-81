import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { getPropertyDisplayName, getPropertyShortName } from "@/lib/propertyDisplay";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface PropertySwitcherProps {
  allowAll?: boolean;
  className?: string;
}

const PropertySwitcher = ({ allowAll: allowAllProp, className }: PropertySwitcherProps) => {
  const { properties, activePropertyId, setActivePropertyId, allowAll: ctxAllowAll } = usePropertyFilter();
  const allowAll = allowAllProp ?? ctxAllowAll;
  const [open, setOpen] = useState(false);

  if (properties.length < 2) return null;

  // Pill mode for 2-3 properties
  if (properties.length <= 3) {
    const pillCls = (active: boolean) =>
      cn(
        "px-3 py-1.5 rounded-full font-body text-sm transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      );
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted p-1",
          className
        )}
      >
        {allowAll && (
          <button
            type="button"
            onClick={() => setActivePropertyId(null)}
            className={pillCls(activePropertyId === null)}
          >
            All
          </button>
        )}
        {properties.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePropertyId(p.id)}
            className={pillCls(activePropertyId === p.id)}
            title={getPropertyDisplayName(p)}
          >
            {getPropertyShortName(p, 18)}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown/search mode for 4+
  const current =
    activePropertyId === null
      ? allowAll ? "All properties" : ""
      : getPropertyDisplayName(properties.find((p) => p.id === activePropertyId));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-64 justify-between font-body", className)}
        >
          <span className="truncate">{current || "Select property"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search properties..." />
          <CommandList>
            <CommandEmpty>No property found.</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value="all"
                  onSelect={() => { setActivePropertyId(null); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", activePropertyId === null ? "opacity-100" : "opacity-0")} />
                  All properties
                </CommandItem>
              )}
              {properties.map((p) => (
                <CommandItem
                  key={p.id}
                  value={getPropertyDisplayName(p)}
                  onSelect={() => { setActivePropertyId(p.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", activePropertyId === p.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{getPropertyDisplayName(p)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PropertySwitcher;
