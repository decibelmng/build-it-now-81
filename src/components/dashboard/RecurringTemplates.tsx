import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, RefreshCw, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const categories = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "landscaping", label: "Landscaping" },
  { value: "appliance", label: "Appliance" },
  { value: "general", label: "General" },
];

const intervals = [
  { value: 1, label: "Monthly" },
  { value: 3, label: "Quarterly" },
  { value: 6, label: "Semi-Annual" },
  { value: 12, label: "Annual" },
  { value: 24, label: "Every 2 Years" },
  { value: 60, label: "Every 5 Years" },
];

const RecurringTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "general", property_id: "",
    estimated_cost: "", interval_months: "12", next_due_date: "",
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["recurring_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_templates")
        .select("*, properties(name)")
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recurring_templates").insert({
        user_id: user!.id,
        property_id: form.property_id,
        title: form.title,
        description: form.description || null,
        category: form.category,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        interval_months: parseInt(form.interval_months),
        next_due_date: form.next_due_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_templates"] });
      setOpen(false);
      setForm({ title: "", description: "", category: "general", property_id: "", estimated_cost: "", interval_months: "12", next_due_date: "" });
      toast({ title: "Recurring template created!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("recurring_templates").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring_templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const createLogFromTemplate = useMutation({
    mutationFn: async (template: any) => {
      // Create the maintenance log
      const { error: logError } = await supabase.from("maintenance_logs").insert({
        user_id: user!.id,
        property_id: template.property_id,
        title: template.title,
        description: template.description,
        category: template.category,
        cost: template.estimated_cost,
        scheduled_date: template.next_due_date,
      });
      if (logError) throw logError;

      // Advance the next_due_date
      const nextDate = addMonths(new Date(template.next_due_date), template.interval_months);
      const { error: updateError } = await supabase.from("recurring_templates").update({
        next_due_date: format(nextDate, "yyyy-MM-dd"),
        last_created_at: new Date().toISOString(),
      }).eq("id", template.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_templates"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
      toast({ title: "Maintenance log created from template!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isDue = (dateStr: string) => new Date(dateStr) <= new Date();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Recurring Maintenance</h2>
          <p className="font-body text-sm text-muted-foreground">Set up templates for recurring tasks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Create Recurring Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addTemplate.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body">Property *</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger className="font-body"><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="font-body">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Task Title *</Label>
                <Input placeholder="HVAC filter replacement" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Description</Label>
                <Textarea placeholder="Details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="font-body" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="font-body">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Est. Cost ($)</Label>
                  <Input type="number" step="0.01" placeholder="50" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Frequency</Label>
                  <Select value={form.interval_months} onValueChange={(v) => setForm({ ...form, interval_months: v })}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {intervals.map((i) => (
                        <SelectItem key={i.value} value={i.value.toString()} className="font-body">{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Next Due Date *</Label>
                <Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} required className="font-body" />
              </div>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={addTemplate.isPending || !form.property_id || !form.next_due_date}>
                {addTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add a property first</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No recurring templates</h3>
            <p className="font-body text-sm text-muted-foreground">Create templates for tasks that repeat on a schedule</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl: any) => {
            const due = isDue(tmpl.next_due_date);
            const intervalLabel = intervals.find((i) => i.value === tmpl.interval_months)?.label ?? `Every ${tmpl.interval_months}mo`;
            return (
              <Card key={tmpl.id} className={`border-border/50 transition-shadow hover:shadow-card-hover ${due && tmpl.active ? "border-l-4 border-l-accent" : ""}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <RefreshCw className={`h-5 w-5 ${tmpl.active ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-semibold">{tmpl.title}</h4>
                      <p className="font-body text-xs text-muted-foreground">
                        {tmpl.properties?.name} · {categories.find((c) => c.value === tmpl.category)?.label ?? tmpl.category}
                        {tmpl.estimated_cost ? ` · ~$${Number(tmpl.estimated_cost).toFixed(0)}` : ""}
                      </p>
                      <p className="mt-0.5 font-body text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Next: {format(new Date(tmpl.next_due_date), "MMM d, yyyy")} · {intervalLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {due && tmpl.active && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full font-body text-xs"
                        onClick={() => createLogFromTemplate.mutate(tmpl)}
                        disabled={createLogFromTemplate.isPending}
                      >
                        Create Log
                      </Button>
                    )}
                    {due && tmpl.active && (
                      <Badge variant="destructive" className="font-body text-xs">Due</Badge>
                    )}
                    <Switch
                      checked={tmpl.active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: tmpl.id, active: checked })}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTemplate.mutate(tmpl.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecurringTemplates;
