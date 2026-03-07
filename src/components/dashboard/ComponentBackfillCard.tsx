import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { matchLogToComponent } from "@/lib/componentMatcher";

const PREF_KEY = "backfill_card_hidden";
const SESSION_DISMISS_KEY = "backfill_card_session_dismiss_count";

interface BackfillMatch {
  logId: string;
  logTitle: string;
  componentId: string | null;
  componentType: string | null;
  confidence: number;
  isNewComponent: boolean;
}

interface ComponentBackfillCardProps {
  propertyId: string | undefined;
  onNavigate?: (section: string) => void;
}

const ComponentBackfillCard = ({ propertyId, onNavigate }: ComponentBackfillCardProps) => {
  const { user } = useAuth();
  const [sessionDismissed, setSessionDismissed] = useState(false);

  // Check permanent preference
  const permanentlyHidden = useMemo(() => {
    try { return localStorage.getItem(PREF_KEY) === "true"; } catch { return false; }
  }, []);

  // Track session dismiss count
  const sessionDismissCount = useMemo(() => {
    try { return parseInt(sessionStorage.getItem(SESSION_DISMISS_KEY) || "0", 10); } catch { return 0; }
  }, [sessionDismissed]);

  // Fetch unlinked, non-skipped logs for this property
  const { data: unlinkedLogs = [] } = useQuery({
    queryKey: ["unlinked_logs_backfill", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, description, category")
        .eq("property_id", propertyId!)
        .is("component_id", null)
        .eq("component_update_skipped", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!propertyId && !permanentlyHidden,
  });

  // Fetch home components for matching
  const { data: homeComponents = [] } = useQuery({
    queryKey: ["home_components_backfill", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("id, name, category, item_type, data_completeness")
        .eq("property_id", propertyId!)
        .eq("item_type", "home_component");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!propertyId && unlinkedLogs.length > 0 && !permanentlyHidden,
  });

  // Run matcher
  const matches: BackfillMatch[] = useMemo(() => {
    if (unlinkedLogs.length === 0) return [];
    const components = homeComponents.map((c) => ({ id: c.id, name: c.name, category: c.category, item_type: c.item_type }));
    const results: BackfillMatch[] = [];
    for (const log of unlinkedLogs) {
      const result = matchLogToComponent(log.title, log.description || "", log.category, components);
      if (result.confidence >= 0.6) {
        results.push({
          logId: log.id,
          logTitle: log.title,
          ...result,
        });
      }
    }
    return results;
  }, [unlinkedLogs, homeComponents]);

  const matchCount = matches.length;

  // Check if previously shown (for title variation)
  const [hasBeenShown, setHasBeenShown] = useState(false);
  useEffect(() => {
    if (matchCount > 0) {
      try {
        const shown = sessionStorage.getItem("backfill_card_shown") === "true";
        setHasBeenShown(shown);
        sessionStorage.setItem("backfill_card_shown", "true");
      } catch { /* ignore */ }
    }
  }, [matchCount]);

  // Calculate accuracy jump
  const avgCurrentCompleteness = homeComponents.length > 0
    ? homeComponents.reduce((sum, c) => sum + (c.data_completeness ?? 0), 0) / homeComponents.length
    : 0;
  const projectedJump = Math.min(30, matchCount * 5); // rough estimate
  const highImpact = projectedJump > 15;

  // Don't show if permanently hidden, session dismissed (max 2 times), or no matches
  if (permanentlyHidden || sessionDismissed || sessionDismissCount >= 2 || matchCount === 0) return null;

  // Pick title
  let title: string;
  if (highImpact) {
    const fromPct = Math.round(avgCurrentCompleteness);
    const toPct = Math.min(100, Math.round(avgCurrentCompleteness + projectedJump));
    title = `🎯 Quick win: updating these ${matchCount} items would boost your forecast accuracy from ${fromPct}% to ${toPct}%`;
  } else if (hasBeenShown) {
    title = `👋 Still have ${matchCount} log${matchCount !== 1 ? "s" : ""} that could update your components`;
  } else {
    title = "🏠 Your home knows more than your components show";
  }

  const handleRemindLater = () => {
    try {
      const newCount = sessionDismissCount + 1;
      sessionStorage.setItem(SESSION_DISMISS_KEY, String(newCount));
    } catch { /* ignore */ }
    setSessionDismissed(true);
  };

  const handleDontShowAgain = () => {
    try { localStorage.setItem(PREF_KEY, "true"); } catch { /* ignore */ }
    setSessionDismissed(true);
  };

  return (
    <Card className="mb-8 border-l-4 border-l-accent border-border/50 bg-accent/5">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-display text-sm font-semibold mb-1">{title}</h3>
            <p className="font-body text-sm text-muted-foreground mb-3">
              We found {matchCount} maintenance entr{matchCount !== 1 ? "ies" : "y"} that could update your Home Components.
              Want to review them? It only takes a minute and makes your savings forecast way more accurate.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold text-sm"
                size="sm"
                onClick={() => onNavigate?.("maintenance")}
              >
                Review Updates ({matchCount} item{matchCount !== 1 ? "s" : ""})
              </Button>
              <button
                onClick={handleRemindLater}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Remind Me Later
              </button>
            </div>
            <button
              onClick={handleDontShowAgain}
              className="mt-2 font-body text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              Don't show this again
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComponentBackfillCard;
