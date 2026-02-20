import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Home, Wrench, FileText, Users, Loader2 } from "lucide-react";

interface SearchResult {
  type: "property" | "maintenance" | "document" | "contact";
  id: string;
  title: string;
  subtitle: string;
}

const typeConfig = {
  property: { icon: Home, label: "Property", color: "bg-accent/10 text-accent" },
  maintenance: { icon: Wrench, label: "Maintenance", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" },
  document: { icon: FileText, label: "Document", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" },
  contact: { icon: Users, label: "Contact", color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" },
};

const DashboardSearch = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    const term = `%${q}%`;

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
        title: p.name,
        subtitle: `${p.address}${p.city ? `, ${p.city}` : ""}`,
      })),
      ...(logs.data ?? []).map((l: any) => ({
        type: "maintenance" as const,
        id: l.id,
        title: l.title,
        subtitle: `${l.reference_code ? l.reference_code + ' · ' : ''}${l.category} · ${l.status}`,
      })),
      ...(docs.data ?? []).map((d) => ({
        type: "document" as const,
        id: d.id,
        title: d.name,
        subtitle: d.category,
      })),
      ...(contacts.data ?? []).map((c) => ({
        type: "contact" as const,
        id: c.id,
        title: c.name,
        subtitle: `${c.role}${c.company ? ` · ${c.company}` : ""}`,
      })),
    ];

    setResults(items);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">Search</h2>
        <p className="font-body text-sm text-muted-foreground">Find anything across your properties, logs, documents, and contacts</p>
      </div>

      <div className="relative mb-6 max-w-lg">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search properties, maintenance, documents, contacts..."
          className="pl-10 font-body"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="font-body text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No results found</h3>
            <p className="font-body text-sm text-muted-foreground">Try a different search term</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2 max-w-lg">
          {results.map((result) => {
            const cfg = typeConfig[result.type];
            const Icon = cfg.icon;
            return (
              <Card key={`${result.type}-${result.id}`} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-medium truncate">{result.title}</p>
                    <p className="font-body text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  </div>
                  <Badge variant="outline" className="font-body text-xs shrink-0">{cfg.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardSearch;
