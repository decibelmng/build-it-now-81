import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Home, Wrench, FileText, Users, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";

interface SearchResult {
  type: "property" | "maintenance" | "document" | "contact";
  id: string;
  title: string;
  subtitle: string;
  section: string;
}

const typeConfig = {
  property: { icon: Home, label: "Property", section: "properties" },
  maintenance: { icon: Wrench, label: "Maintenance", section: "maintenance" },
  document: { icon: FileText, label: "Document", section: "documents" },
  contact: { icon: Users, label: "Contact", section: "contacts" },
};

interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
}

const SearchCommandPalette = ({ open, onOpenChange, onNavigate }: SearchCommandPaletteProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!user || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const term = `%${query}%`;

      const [props, logs, docs, contacts] = await Promise.all([
        supabase.from("properties").select("id, name, address, city").ilike("name", term).limit(5),
        supabase.from("maintenance_logs").select("id, title, category, status, reference_code").ilike("title", term).limit(5),
        supabase.from("documents").select("id, name, category").ilike("name", term).limit(5),
        supabase.from("home_contacts").select("id, name, role, company").ilike("name", term).limit(5),
      ]);

      const items: SearchResult[] = [
        ...(props.data ?? []).map((p) => ({
          type: "property" as const,
          id: p.id,
          title: getPropertyDisplayName(p),
          subtitle: `${p.address}${p.city ? `, ${p.city}` : ""}`,
          section: "properties",
        })),
        ...(logs.data ?? []).map((l: any) => ({
          type: "maintenance" as const,
          id: l.id,
          title: l.title,
          subtitle: `${l.reference_code ? l.reference_code + " · " : ""}${l.category} · ${l.status}`,
          section: "maintenance",
        })),
        ...(docs.data ?? []).map((d) => ({
          type: "document" as const,
          id: d.id,
          title: d.name,
          subtitle: d.category,
          section: "documents",
        })),
        ...(contacts.data ?? []).map((c) => ({
          type: "contact" as const,
          id: c.id,
          title: c.name,
          subtitle: `${c.role}${c.company ? ` · ${c.company}` : ""}`,
          section: "contacts",
        })),
      ];

      setResults(items);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, user]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search properties, maintenance, documents, contacts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty className="py-6 text-center font-body text-sm text-muted-foreground">
          {query.length < 2 ? "Type to search..." : loading ? "Searching..." : "No results found."}
        </CommandEmpty>
        {Object.entries(typeConfig).map(([type, cfg]) => {
          const typeResults = results.filter((r) => r.type === type);
          if (typeResults.length === 0) return null;
          const Icon = cfg.icon;
          return (
            <CommandGroup key={type} heading={cfg.label}>
              {typeResults.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => {
                    onNavigate(result.section);
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm truncate">{result.title}</p>
                    <p className="font-body text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchCommandPalette;
