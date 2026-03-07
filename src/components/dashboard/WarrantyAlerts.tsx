import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Shield } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface WarrantyAlertsProps {
  onNavigate: (section: string) => void;
}

const WarrantyAlerts = ({ onNavigate }: WarrantyAlertsProps) => {
  const { user } = useAuth();

  const { data: expiringItems = [] } = useQuery({
    queryKey: ["warranty_alerts", user?.id],
    queryFn: async () => {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 90);

      const { data, error } = await supabase
        .from("home_items")
        .select("id, name, category, warranty_expiry")
        .not("warranty_expiry", "is", null)
        .lte("warranty_expiry", future.toISOString().split("T")[0])
        .order("warranty_expiry", { ascending: true });
      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        daysLeft: differenceInDays(parseISO(item.warranty_expiry!), now),
      }));
    },
    enabled: !!user,
  });

  if (expiringItems.length === 0) return null;

  const expiredCount = expiringItems.filter((i) => i.daysLeft < 0).length;
  const expiringCount = expiringItems.filter((i) => i.daysLeft >= 0).length;

  return (
    <Card className="mb-8 border-destructive/20 bg-destructive/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-destructive" />
          <h3 className="font-display text-base font-semibold">
            {expiringCount > 0 && `${expiringCount} warrant${expiringCount === 1 ? "y" : "ies"} expiring soon`}
            {expiringCount > 0 && expiredCount > 0 && " · "}
            {expiredCount > 0 && `${expiredCount} expired`}
          </h3>
        </div>
        <div className="space-y-2">
          {expiringItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate("home-inventory")}
              className="flex w-full items-center gap-3 rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-background/80"
            >
              <AlertTriangle className={`h-4 w-4 shrink-0 ${item.daysLeft < 0 ? "text-muted-foreground" : "text-destructive"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-body text-sm font-medium truncate ${item.daysLeft < 0 ? "text-muted-foreground" : ""}`}>
                  {item.name}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {item.daysLeft < 0
                    ? `Expired ${format(parseISO(item.warranty_expiry!), "MMM d, yyyy")}`
                    : `Expires ${format(parseISO(item.warranty_expiry!), "MMM d, yyyy")} (${item.daysLeft} day${item.daysLeft !== 1 ? "s" : ""})`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantyAlerts;
