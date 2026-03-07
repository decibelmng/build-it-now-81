import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X, ChevronRight, Sparkles } from "lucide-react";

interface QuickStartChecklistProps {
  onNavigate: (section: string) => void;
}

const STORAGE_KEY = "homelog_checklist_dismissed";

const QuickStartChecklist = ({ onNavigate }: QuickStartChecklistProps) => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Load dismissed state from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored === "true") setDismissed(true);
      const min = localStorage.getItem(`${STORAGE_KEY}_min_${user.id}`);
      if (min === "true") setMinimized(true);
    } catch {}
  }, [user]);

  const { data: properties = [] } = useQuery({
    queryKey: ["checklist_properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, year_built, sqft, purchase_price")
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !dismissed,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["checklist_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_logs").select("id").limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !dismissed,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["checklist_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_items").select("id").limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !dismissed,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["checklist_docs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("id").limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !dismissed,
  });

  const checklist = useMemo(() => {
    const firstProp = properties[0];
    const hasDetails = firstProp && firstProp.year_built && firstProp.sqft;
    const hasLog = logs.length > 0;
    const hasItems = items.length >= 3;
    const hasDoc = docs.length > 0;
    const hasPrice = firstProp && firstProp.purchase_price;

    return [
      { label: "Add year built & square footage", done: !!hasDetails, section: "properties" },
      { label: "Log your first maintenance entry", done: hasLog, section: "maintenance" },
      { label: "Add 3 home inventory items", done: hasItems, section: "home-inventory" },
      { label: "Upload your first document", done: hasDoc, section: "documents" },
      { label: "Enter your purchase price for tax tracking", done: !!hasPrice, section: "properties" },
    ];
  }, [properties, logs, items, docs]);

  const completed = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const allDone = completed === total;

  if (dismissed || properties.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(`${STORAGE_KEY}_${user?.id}`, "true"); } catch {}
  };

  const handleMinimize = () => {
    setMinimized(true);
    try { localStorage.setItem(`${STORAGE_KEY}_min_${user?.id}`, "true"); } catch {}
  };

  const handleExpand = () => {
    setMinimized(false);
    try { localStorage.removeItem(`${STORAGE_KEY}_min_${user?.id}`); } catch {}
  };

  // Minimized banner
  if (minimized && !allDone) {
    return (
      <button
        onClick={handleExpand}
        className="mb-4 flex w-full items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-left transition-colors hover:bg-accent/10"
      >
        <Sparkles className="h-4 w-4 text-accent shrink-0" />
        <span className="font-body text-sm font-medium flex-1">
          Complete your home profile ({completed}/{total})
        </span>
        <Progress value={(completed / total) * 100} className="w-24 h-2" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  if (allDone) return null;

  return (
    <Card className="mb-6 border-accent/30 bg-accent/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Quick Start Checklist
            </h3>
            <p className="font-body text-xs text-muted-foreground mt-1">
              {completed} of {total} complete — adding details improves your savings forecast
            </p>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0" title="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Progress value={(completed / total) * 100} className="mb-4 h-2" />

        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onNavigate(item.section)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-background/80"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={`font-body text-sm flex-1 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.label}
                </span>
                {!item.done && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={handleMinimize}
          className="mt-3 font-body text-xs text-muted-foreground hover:text-foreground"
        >
          I'll do this later
        </button>
      </CardContent>
    </Card>
  );
};

export default QuickStartChecklist;
