import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PropertyFilterBarProps {
  allowAll?: boolean;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
}

const shortName = (name: string) => {
  const t = name.trim();
  if (t.length <= 18) return t;
  return t.split(/\s+/)[0].slice(0, 18);
};

const PropertyFilterBar = ({ allowAll = true, value, onChange, className }: PropertyFilterBarProps) => {
  const { selectedPropertyId, setSelectedPropertyId, properties } = usePropertyFilter();
  if (properties.length < 2) return null;

  const current = value ?? (allowAll ? selectedPropertyId : selectedPropertyId === "all" ? properties[0].id : selectedPropertyId);
  const change = (v: string) => {
    if (onChange) onChange(v);
    else setSelectedPropertyId(v as string | "all");
  };

  const wrapperCls = `mb-6 w-full ${className ?? ""}`;

  if (properties.length <= 4) {
    return (
      <div className={wrapperCls}>
        <Tabs value={current} onValueChange={change}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {allowAll && <TabsTrigger value="all" className="font-body">All</TabsTrigger>}
            {properties.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="font-body">{shortName(p.name)}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    );
  }

  return (
    <div className={wrapperCls}>
      <Select value={current} onValueChange={change}>
        <SelectTrigger className="w-64 font-body">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all" className="font-body">All properties</SelectItem>}
          {properties.map((p) => (
            <SelectItem key={p.id} value={p.id} className="font-body">{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PropertyFilterBar;
