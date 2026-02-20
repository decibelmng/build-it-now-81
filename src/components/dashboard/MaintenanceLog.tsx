import { useState, useRef } from "react";
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
import { Plus, Wrench, CheckCircle2, Clock, AlertTriangle, Camera, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type MaintenanceLog = Tables<"maintenance_logs">;
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

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  in_progress: { label: "In Progress", icon: AlertTriangle, variant: "outline" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
};

const MaintenanceLogSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "general", property_id: "",
    cost: "", scheduled_date: "",
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

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addLog = useMutation({
    mutationFn: async () => {
      let image_url: string | null = null;

      if (photoFile && user) {
        const filePath = `${user.id}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from("maintenance-photos").upload(filePath, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("maintenance-photos").getPublicUrl(filePath);
        image_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("maintenance_logs").insert({
        user_id: user!.id,
        property_id: form.property_id,
        title: form.title,
        description: form.description || null,
        category: form.category,
        cost: form.cost ? parseFloat(form.cost) : null,
        scheduled_date: form.scheduled_date || null,
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
      setOpen(false);
      setForm({ title: "", description: "", category: "general", property_id: "", cost: "", scheduled_date: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      toast({ title: "Maintenance log added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: Record<string, unknown> = { status };
      if (status === "completed") update.completed_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("maintenance_logs").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] }),
  });

  // Photo preview dialog
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Maintenance Log</h2>
          <p className="font-body text-sm text-muted-foreground">Track repairs, upgrades, and scheduled maintenance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Log Maintenance</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addLog.mutate(); }} className="space-y-4">
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
                <Label className="font-body">Title *</Label>
                <Input placeholder="Fix leaky faucet" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Description</Label>
                <Textarea placeholder="Details about the maintenance..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="font-body" />
              </div>

              {/* Photo attachment */}
              <div className="space-y-2">
                <Label className="font-body flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Photo (optional)</Label>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/50 p-4 transition-colors hover:border-accent/40"
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-32 w-full rounded-lg object-cover" />
                  ) : (
                    <>
                      <Camera className="mb-1 h-6 w-6 text-muted-foreground" />
                      <p className="font-body text-xs text-muted-foreground">Click to attach a photo</p>
                    </>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                </div>
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
                  <Label className="font-body">Cost ($)</Label>
                  <Input type="number" step="0.01" placeholder="150" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Scheduled</Label>
                  <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="font-body" />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={addLog.isPending || !form.property_id}>
                {addLog.isPending ? "Adding..." : "Add Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Photo preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          {previewImage && <img src={previewImage} alt="Maintenance photo" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add a property first to start logging maintenance</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No maintenance logs</h3>
            <p className="font-body text-sm text-muted-foreground">Start tracking your home maintenance</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => {
            const cfg = statusConfig[log.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <Card key={log.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-4">
                    {log.image_url ? (
                      <img
                        src={log.image_url}
                        alt={log.title}
                        className="h-10 w-10 shrink-0 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(log.image_url)}
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Wrench className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-display text-sm font-semibold">{log.title}</h4>
                      <p className="font-body text-xs text-muted-foreground">
                        {log.properties?.name} · {categories.find((c) => c.value === log.category)?.label ?? log.category}
                        {log.cost ? ` · $${Number(log.cost).toFixed(2)}` : ""}
                      </p>
                      {log.scheduled_date && (
                        <p className="mt-0.5 font-body text-xs text-muted-foreground">
                          Scheduled: {format(new Date(log.scheduled_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.image_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewImage(log.image_url)}>
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Badge variant={cfg.variant} className="font-body text-xs">
                      <StatusIcon className="mr-1 h-3 w-3" />{cfg.label}
                    </Badge>
                    {log.status !== "completed" && (
                      <Select value={log.status} onValueChange={(v) => updateStatus.mutate({ id: log.id, status: v })}>
                        <SelectTrigger className="h-8 w-8 border-0 p-0 [&>svg]:hidden">
                          <span className="sr-only">Change status</span>
                          <span className="text-xs">⋮</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending" className="font-body text-xs">Pending</SelectItem>
                          <SelectItem value="in_progress" className="font-body text-xs">In Progress</SelectItem>
                          <SelectItem value="completed" className="font-body text-xs">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
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

export default MaintenanceLogSection;
