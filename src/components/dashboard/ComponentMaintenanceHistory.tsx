import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, History, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculateComponentCompleteness } from "@/lib/componentCompleteness";

interface ComponentMaintenanceHistoryProps {
  componentId: string;
  propertyId: string;
  component: any;
  onNavigateToLog?: (logId: string) => void;
}

const ComponentMaintenanceHistory = ({ componentId, propertyId, component, onNavigateToLog }: ComponentMaintenanceHistoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);

  // Linked logs for this component
  const { data: linkedLogs = [] } = useQuery({
    queryKey: ["component_linked_logs", componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, scheduled_date, completed_date, created_at, cost, contact_id, home_contacts(name)")
        .eq("component_id", componentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!componentId,
  });

  // Unlinked logs for manual linking
  const { data: unlinkedLogs = [] } = useQuery({
    queryKey: ["unlinked_logs_for_linking", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, scheduled_date, completed_date, created_at, cost, category")
        .eq("property_id", propertyId)
        .is("component_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!propertyId && linkDialogOpen,
  });

  const filteredUnlinked = unlinkedLogs.filter((log: any) =>
    log.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleLog = (logId: string) => {
    setSelectedLogs((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const handleLinkLogs = async () => {
    if (selectedLogs.length === 0) return;
    setLinking(true);
    try {
      for (const logId of selectedLogs) {
        await supabase
          .from("maintenance_logs")
          .update({ component_id: componentId, component_updated: true })
          .eq("id", logId);
      }

      // Recalculate completeness
      const completeness = calculateComponentCompleteness({
        install_date: component.install_date,
        brand: component.brand,
        model: component.model,
        warranty_expiry: component.warranty_expiry,
        last_maintained: component.last_maintained,
        estimated_value: component.estimated_value,
        notes: component.notes,
        contact_id: component.contact_id,
        last_updated_from_log_id: selectedLogs[0],
      });

      await supabase
        .from("home_items")
        .update({
          data_completeness: completeness,
          last_updated_from_log_id: selectedLogs[0],
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", componentId);

      queryClient.invalidateQueries({ queryKey: ["component_linked_logs", componentId] });
      queryClient.invalidateQueries({ queryKey: ["home_items"] });

      toast({
        title: `✅ ${selectedLogs.length} log${selectedLogs.length !== 1 ? "s" : ""} linked! Accuracy: ${completeness}%`,
      });

      setSelectedLogs([]);
      setLinkDialogOpen(false);
    } catch (err) {
      toast({ title: "Error linking logs", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-xs font-medium text-muted-foreground flex items-center gap-1">
          <History className="h-3 w-3" /> Maintenance History
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 font-body text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-0.5" /> Link Existing Log
        </Button>
      </div>

      {linkedLogs.length === 0 ? (
        <p className="font-body text-xs text-muted-foreground/70 italic">
          No maintenance logs linked yet. When you log maintenance for this component, it'll show up here automatically.
        </p>
      ) : (
        <div className="space-y-1.5">
          {linkedLogs.map((log: any) => {
            const logDate = log.scheduled_date || log.completed_date || log.created_at?.split("T")[0];
            return (
              <div key={log.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2.5 py-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-body text-xs font-medium">{log.title}</span>
                  <div className="flex gap-3 font-body text-[10px] text-muted-foreground">
                    {logDate && <span>{format(new Date(logDate), "MMM d, yyyy")}</span>}
                    {log.cost && <span>${Number(log.cost).toLocaleString()}</span>}
                    {(log as any).home_contacts?.name && <span>{(log as any).home_contacts.name}</span>}
                  </div>
                </div>
                {onNavigateToLog && (
                  <button
                    onClick={() => onNavigateToLog(log.id)}
                    className="font-body text-[10px] text-accent hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link Existing Log Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Link Logs to {component.name}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="font-body text-sm"
          />
          <ScrollArea className="max-h-64">
            {filteredUnlinked.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-4">
                No unlinked logs found.
              </p>
            ) : (
              <div className="space-y-1">
                {filteredUnlinked.map((log: any) => {
                  const logDate = log.scheduled_date || log.completed_date || log.created_at?.split("T")[0];
                  return (
                    <label
                      key={log.id}
                      className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedLogs.includes(log.id)}
                        onCheckedChange={() => toggleLog(log.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-body text-sm font-medium">{log.title}</span>
                        <div className="flex gap-2 font-body text-[10px] text-muted-foreground">
                          {logDate && <span>{format(new Date(logDate), "MMM d, yyyy")}</span>}
                          {log.cost && <span>${Number(log.cost).toLocaleString()}</span>}
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{log.category}</Badge>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {selectedLogs.length > 0 && (
            <Button
              className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
              onClick={handleLinkLogs}
              disabled={linking}
            >
              {linking ? "Linking..." : `Link ${selectedLogs.length} Log${selectedLogs.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComponentMaintenanceHistory;