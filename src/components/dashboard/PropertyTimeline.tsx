import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Home, Wrench, Droplets, Zap, Wind, Hammer, TreePine, Cog,
  CheckCircle2, Clock, AlertTriangle, Building,
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
  general: { label: "General", icon: Wrench, color: "bg-secondary text-muted-foreground" },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  in_progress: { label: "In Progress", icon: AlertTriangle, variant: "outline" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
};

interface TimelineEvent {
  id: string;
  type: "construction" | "maintenance";
  date: string;
  title: string;
  description?: string | null;
  category: string;
  cost: number | null;
  status?: string;
  propertyName?: string;
}

const PropertyTimeline = () => {
  const { user } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");

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

  // Build timeline events
  const events: TimelineEvent[] = [];

  // Add construction events from properties
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

  // Add maintenance events
  const filteredLogs = selectedProperty === "all" ? logs : logs.filter((l: any) => l.property_id === selectedProperty);

  filteredLogs.forEach((log: any) => {
    const eventDate = log.completed_date || log.scheduled_date || log.created_at?.split("T")[0];
    events.push({
      id: log.id,
      type: "maintenance",
      date: eventDate,
      title: log.title,
      description: log.description,
      category: log.category,
      cost: log.cost ? Number(log.cost) : null,
      status: log.status,
      propertyName: log.properties?.name,
    });
  });

  // Sort chronologically (oldest first)
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Find max cost for bar scaling
  const maxCost = Math.max(...events.map((e) => e.cost ?? 0), 1);

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

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No timeline events</h3>
            <p className="font-body text-sm text-muted-foreground">
              Add properties with a year built and maintenance logs to see your timeline
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative ml-4 border-l-2 border-border pl-8">
          {events.map((event, idx) => {
            const isConstruction = event.type === "construction";
            const cat = isConstruction
              ? { label: "Construction", icon: Building, color: "bg-accent/20 text-accent" }
              : categoryConfig[event.category] ?? categoryConfig.general;
            const CatIcon = cat.icon;
            const statusCfg = event.status ? statusConfig[event.status] ?? statusConfig.pending : null;
            const StatusIcon = statusCfg?.icon;
            const costBarWidth = event.cost ? Math.max((event.cost / maxCost) * 100, 8) : 0;

            return (
              <div key={event.id} className="relative mb-8 last:mb-0">
                {/* Dot on the timeline */}
                <div
                  className={`absolute -left-[calc(2rem+5px)] flex h-10 w-10 items-center justify-center rounded-full border-2 border-background ${cat.color}`}
                >
                  <CatIcon className="h-4 w-4" />
                </div>

                <div className="space-y-1.5">
                  {/* Date */}
                  <p className="font-body text-xs font-medium text-muted-foreground">
                    {format(new Date(event.date), isConstruction ? "yyyy" : "MMM d, yyyy")}
                    {event.propertyName && selectedProperty === "all" && (
                      <span className="ml-2 text-muted-foreground/60">· {event.propertyName}</span>
                    )}
                  </p>

                  {/* Title */}
                  <h4 className="font-display text-sm font-semibold leading-snug">{event.title}</h4>

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

          {/* "Today" marker */}
          <div className="relative">
            <div className="absolute -left-[calc(2rem+5px)] flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-accent/10">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            </div>
            <p className="font-body text-xs font-semibold text-accent pt-2.5">Today</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyTimeline;
