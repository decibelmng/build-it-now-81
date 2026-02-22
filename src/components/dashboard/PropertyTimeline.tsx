import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Home, Wrench, Droplets, Zap, Wind, Hammer, TreePine, Cog,
  CheckCircle2, Clock, AlertTriangle, Building, DollarSign, TrendingUp, Gem, Package, PlugZap, ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  plumbing: { label: "Plumbing", icon: Droplets, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" },
  electrical: { label: "Electrical", icon: Zap, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
  hvac: { label: "HVAC", icon: Wind, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400" },
  roofing: { label: "Roofing", icon: Hammer, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" },
  landscaping: { label: "Landscaping", icon: TreePine, color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" },
  appliance: { label: "Appliance", icon: Cog, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" },
  personal: { label: "Personal Property", icon: Gem, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400" },
  structural: { label: "Structural", icon: Package, color: "bg-stone-100 text-stone-600 dark:bg-stone-900/40 dark:text-stone-400" },
  exterior: { label: "Exterior", icon: Package, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" },
  utility: { label: "Utility", icon: PlugZap, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" },
  general: { label: "General", icon: Wrench, color: "bg-secondary text-muted-foreground" },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  in_progress: { label: "In Progress", icon: AlertTriangle, variant: "outline" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
};

interface TimelineEvent {
  id: string;
  type: "construction" | "maintenance" | "major_repair" | "improvement" | "inventory" | "utility" | "transfer";
  date: string;
  title: string;
  description?: string | null;
  category: string;
  cost: number | null;
  status?: string;
  propertyName?: string;
  image_url?: string | null;
}

const PropertyTimeline = () => {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(["construction", "maintenance", "major_repair", "improvement", "inventory", "utility", "transfer"]));

  const toggleType = (type: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, properties(name, year_built)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: homeItems = [] } = useQuery({
    queryKey: ["home_items_timeline", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("*, properties(name)")
        .order("install_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: utilities = [] } = useQuery({
    queryKey: ["property_utilities_timeline", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_utilities")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["property_transfers_timeline", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_transfers")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build timeline events
  const events: TimelineEvent[] = [];
  const propsToShow = selectedProperty === "all" ? properties : properties.filter((p) => p.id === selectedProperty);

  propsToShow.forEach((prop) => {
    if (prop.year_built) {
      events.push({
        id: `construction-${prop.id}`,
        type: "construction",
        date: `${prop.year_built}-01-01`,
        title: `${prop.name} — Built`,
        description: `${prop.address}${prop.city ? `, ${prop.city}` : ""}`,
        category: "construction",
        cost: null,
        propertyName: prop.name,
      });
    }
  });

  const filteredLogs = selectedProperty === "all" ? logs : logs.filter((l: any) => l.property_id === selectedProperty);

  filteredLogs.forEach((log: any) => {
    const eventDate = log.completed_date || log.scheduled_date || log.created_at?.split("T")[0];
    const scope = log.scope || "routine";
    const eventType = scope === "major_repair" ? "major_repair" : scope === "improvement" ? "improvement" : "maintenance";
    events.push({
      id: log.id,
      type: eventType,
      date: eventDate,
      title: log.title,
      description: log.description,
      category: log.category,
      cost: log.cost ? Number(log.cost) : null,
      status: log.status,
      propertyName: log.properties?.name,
      image_url: log.image_url,
    });
  });

  // Add home inventory items (install dates, replacements, maintenance)
  const filteredItems = selectedProperty === "all" ? homeItems : homeItems.filter((i: any) => i.property_id === selectedProperty);

  filteredItems.forEach((item: any) => {
    if (item.install_date) {
      events.push({
        id: `item-install-${item.id}`,
        type: "inventory",
        date: item.install_date,
        title: `${item.name} — Installed`,
        description: [item.brand, item.model, item.serial_number ? `S/N: ${item.serial_number}` : null].filter(Boolean).join(" · ") || item.notes,
        category: item.category,
        cost: null,
        propertyName: item.properties?.name,
      });
    }
    if (item.last_maintained) {
      events.push({
        id: `item-maint-${item.id}`,
        type: "inventory",
        date: item.last_maintained,
        title: `${item.name} — Maintained`,
        description: item.notes,
        category: item.category,
        cost: null,
        propertyName: item.properties?.name,
      });
    }
  });

  // Add utility accounts
  const filteredUtilities = selectedProperty === "all" ? utilities : utilities.filter((u: any) => u.property_id === selectedProperty);

  filteredUtilities.forEach((util: any) => {
    events.push({
      id: `utility-${util.id}`,
      type: "utility",
      date: util.created_at?.split("T")[0],
      title: `${util.provider_name} — ${util.service_type.charAt(0).toUpperCase() + util.service_type.slice(1)} Service`,
      description: [
        util.account_number ? `Acct: ${util.account_number}` : null,
        util.monthly_cost ? `$${Number(util.monthly_cost).toFixed(2)}/mo` : null,
        util.contact_name,
      ].filter(Boolean).join(" · ") || null,
      category: "utility",
      cost: util.monthly_cost ? Number(util.monthly_cost) : null,
      propertyName: util.properties?.name,
    });
  });

  // Add transfer events
  const filteredTransfers = selectedProperty === "all" ? transfers : transfers.filter((t: any) => t.property_id === selectedProperty);

  filteredTransfers.forEach((transfer: any) => {
    const statusLabel = transfer.status === "accepted" ? "Completed" : transfer.status === "pending" ? "Pending" : transfer.status;
    events.push({
      id: `transfer-${transfer.id}`,
      type: "transfer",
      date: transfer.created_at?.split("T")[0],
      title: `${transfer.properties?.name ?? "Property"} — Transferred`,
      description: `To: ${transfer.to_email}${statusLabel ? ` · Status: ${statusLabel}` : ""}`,
      category: "transfer",
      cost: null,
      propertyName: transfer.properties?.name,
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply type filter — construction is always visible
  const filteredEvents = events.filter((e) => e.type === "construction" || visibleTypes.has(e.type));

  const maxCost = Math.max(...filteredEvents.map((e) => e.cost ?? 0), 1);

  // Cumulative cost summary
  const totalCost = filteredEvents.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  const maintenanceEvents = filteredEvents.filter((e) => e.type === "maintenance" || e.type === "major_repair" || e.type === "improvement");
  const avgCost = maintenanceEvents.filter((e) => e.cost).length > 0
    ? totalCost / maintenanceEvents.filter((e) => e.cost).length
    : 0;
  const topCategory = (() => {
    const map = new Map<string, number>();
    maintenanceEvents.forEach((e) => {
      if (e.cost) map.set(e.category, (map.get(e.category) ?? 0) + e.cost);
    });
    let top = { cat: "", val: 0 };
    map.forEach((v, k) => { if (v > top.val) top = { cat: k, val: v }; });
    return top;
  })();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Property Timeline</h2>
          <p className="font-body text-sm text-muted-foreground">
            Full history from construction to present
          </p>
        </div>
        {properties.length > 1 && (
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48 font-body">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-body">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Category Filters */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {/* House Creation — always on */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-accent" />
            <Label className="font-body text-xs font-medium">House Creation</Label>
          </div>
          <span className="font-body text-[10px] text-muted-foreground">Always on</span>
        </div>
        {[
          { type: "maintenance", label: "Routine", icon: Wrench },
          { type: "major_repair", label: "Major Repair", icon: Hammer },
          { type: "improvement", label: "Improvement", icon: TrendingUp },
          { type: "inventory", label: "Inventory", icon: Cog },
          { type: "utility", label: "Utilities", icon: PlugZap },
          { type: "transfer", label: "Transfer", icon: ArrowRightLeft },
        ].map(({ type, label, icon: Icon }) => {
          const active = visibleTypes.has(type);
          return (
            <div key={type} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor={`toggle-${type}`} className="font-body text-xs font-medium cursor-pointer">{label}</Label>
              </div>
              <Switch
                id={`toggle-${type}`}
                checked={active}
                onCheckedChange={() => toggleType(type)}
                className="scale-75"
              />
            </div>
          );
        })}
      </div>

      {/* Cumulative Cost Summary */}
      {totalCost > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">Total Spent</p>
                <p className="font-display text-lg font-bold">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <TrendingUp className="h-5 w-5 text-sage" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">Avg per Task</p>
                <p className="font-display text-lg font-bold">${avgCost.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">Top Category</p>
                <p className="font-display text-sm font-bold capitalize">{topCategory.cat || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.image_url && (
                <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full rounded-lg object-cover max-h-48" />
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs text-muted-foreground">Date:</span>
                  <span className="font-body text-sm">{format(new Date(selectedEvent.date), "MMM d, yyyy")}</span>
                </div>
                {selectedEvent.propertyName && (
                  <div className="flex items-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Property:</span>
                    <span className="font-body text-sm">{selectedEvent.propertyName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs text-muted-foreground">Category:</span>
                  <span className="font-body text-sm capitalize">{selectedEvent.category}</span>
                </div>
                {selectedEvent.status && (
                  <div className="flex items-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Status:</span>
                    <Badge variant={statusConfig[selectedEvent.status]?.variant ?? "secondary"} className="font-body text-xs">
                      {statusConfig[selectedEvent.status]?.label ?? selectedEvent.status}
                    </Badge>
                  </div>
                )}
                {selectedEvent.cost != null && selectedEvent.cost > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Cost:</span>
                    <span className="font-display text-sm font-bold">${selectedEvent.cost.toLocaleString()}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div>
                    <span className="font-body text-xs text-muted-foreground">Description:</span>
                    <p className="font-body text-sm mt-1">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No timeline events</h3>
            <p className="font-body text-sm text-muted-foreground">
              Add properties with a year built, maintenance logs, or home inventory items to see your timeline
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative ml-4 border-l-2 border-border pl-8">
          {/* "Today" marker */}
          <div className="relative mb-8">
            <div className="absolute -left-[calc(2rem+5px)] flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-accent/10">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            </div>
            <p className="font-body text-xs font-semibold text-accent pt-2.5">Today</p>
          </div>

          {filteredEvents.map((event) => {
            const isConstruction = event.type === "construction";
            const isTransfer = event.type === "transfer";
            const cat = isConstruction
              ? { label: "Construction", icon: Building, color: "bg-accent/20 text-accent" }
              : isTransfer
              ? { label: "Transfer", icon: ArrowRightLeft, color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" }
              : categoryConfig[event.category] ?? categoryConfig.general;
            const CatIcon = cat.icon;
            const statusCfg = event.status ? statusConfig[event.status] ?? statusConfig.pending : null;
            const StatusIcon = statusCfg?.icon;
            const costBarWidth = event.cost ? Math.max((event.cost / maxCost) * 100, 8) : 0;

            return (
              <div
                key={event.id}
                className="relative mb-8 last:mb-0 cursor-pointer group"
                onClick={() => setSelectedEvent(event)}
              >
                {/* Dot on the timeline */}
                <div
                  className={`absolute -left-[calc(2rem+5px)] flex h-10 w-10 items-center justify-center rounded-full border-2 border-background ${cat.color} group-hover:scale-110 transition-transform`}
                >
                  <CatIcon className="h-4 w-4" />
                </div>

                <div className="space-y-1.5 rounded-lg p-2 -ml-2 transition-colors group-hover:bg-secondary/50">
                  {/* Date */}
                  <p className="font-body text-xs font-medium text-muted-foreground">
                    {format(new Date(event.date), isConstruction ? "yyyy" : "MMM d, yyyy")}
                    {event.propertyName && selectedProperty === "all" && (
                      <span className="ml-2 text-muted-foreground/60">· {event.propertyName}</span>
                    )}
                  </p>

                  {/* Title + thumbnail */}
                  <div className="flex items-center gap-3">
                    <h4 className="font-display text-sm font-semibold leading-snug">{event.title}</h4>
                    {event.image_url && (
                      <img src={event.image_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    )}
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="font-body text-xs text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {/* Status + Category badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="outline" className="font-body text-xs gap-1">
                      <CatIcon className="h-3 w-3" />
                      {cat.label}
                    </Badge>
                    {statusCfg && StatusIcon && (
                      <Badge variant={statusCfg.variant} className="font-body text-xs gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    )}
                  </div>

                  {/* Cost bar */}
                  {event.cost != null && event.cost > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-2 flex-1 max-w-xs rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${costBarWidth}%` }}
                        />
                      </div>
                      <span className="font-body text-xs font-semibold text-foreground">
                        ${event.cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyTimeline;
