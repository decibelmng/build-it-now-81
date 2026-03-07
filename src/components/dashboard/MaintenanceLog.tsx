import { useState, useRef, useEffect } from "react";
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
import { Plus, Wrench, CheckCircle2, Clock, AlertTriangle, Camera, Image as ImageIcon, Users, Pencil } from "lucide-react";
import { useDefaultContractorLink } from "@/hooks/useDefaultContractorLink";
import ServiceLinkPopover from "@/components/dashboard/ServiceLinkPopover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

const scopes = [
  { value: "routine", label: "Routine" },
  { value: "major_repair", label: "Major Repair" },
  { value: "improvement", label: "Improvement" },
];

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  in_progress: { label: "In Progress", icon: AlertTriangle, variant: "outline" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
};

const vendorRoles = [
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "hvac", label: "HVAC Tech" },
  { value: "roofer", label: "Roofer" },
  { value: "landscaper", label: "Landscaper" },
  { value: "handyman", label: "Handyman" },
  { value: "painter", label: "Painter" },
  { value: "other", label: "Other" },
];

const emptyForm = { title: "", description: "", category: "general", property_id: "", cost: "", scheduled_date: "", contact_id: "", status: "pending", scope: "routine" };

const MaintenanceLogSection = ({ onNavigate }: { onNavigate?: (section: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", role: "other", company: "", phone: "", email: "" });
  const [form, setForm] = useState({ ...emptyForm });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowNewVendor(false);
    setNewVendor({ name: "", role: "other", company: "", phone: "", email: "" });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (log: any) => {
    setForm({
      title: log.title,
      description: log.description || "",
      category: log.category,
      property_id: log.property_id,
      cost: log.cost ? String(log.cost) : "",
      scheduled_date: log.scheduled_date || "",
      contact_id: log.contact_id || "",
      status: log.status,
      scope: log.scope || "routine",
    });
    setEditingId(log.id);
    setPhotoPreview(log.image_url || null);
    setPhotoFile(null);
    setShowNewVendor(false);
    setNewVendor({ name: "", role: "other", company: "", phone: "", email: "" });
    setOpen(true);
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

  const firstPropertyId = properties.length > 0 ? properties[0].id : undefined;
  const { defaultLink, ensureDefault, linkUrl: defaultLinkUrl } = useDefaultContractorLink(firstPropertyId);

  // Auto-create default link on load
  useEffect(() => {
    ensureDefault();
  }, [firstPropertyId, defaultLink]);

  // Query pending contractor submissions
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending_submissions_count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return data?.length ?? 0;
    },
    enabled: !!user,
  });

  // Use count from header for accurate count
  const { data: pendingSubmissionsCount = 0 } = useQuery({
    queryKey: ["pending_submissions_exact_count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contractor_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["home_contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_contacts").select("id, name, company, role").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["maintenance_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, properties(name), home_contacts(name, company)")
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url: string | null | undefined = undefined; // undefined = don't change
      let contact_id: string | null = form.contact_id || null;

      // Upload new photo if selected
      if (photoFile && user) {
        const filePath = `${user.id}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from("maintenance-photos").upload(filePath, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage.from("maintenance-photos").createSignedUrl(filePath, 31536000);
        image_url = urlData?.signedUrl || null;
      }

      // If creating a new vendor inline
      if (showNewVendor && newVendor.name && form.property_id) {
        const { data: newContact, error: contactError } = await supabase
          .from("home_contacts")
          .insert({
            user_id: user!.id,
            property_id: form.property_id,
            name: newVendor.name,
            role: newVendor.role,
            company: newVendor.company || null,
            phone: newVendor.phone || null,
            email: newVendor.email || null,
          })
          .select("id")
          .single();
        if (contactError) throw contactError;
        contact_id = newContact.id;
      }

      const payload: Record<string, unknown> = {
        property_id: form.property_id,
        title: form.title,
        description: form.description || null,
        category: form.category,
        cost: form.cost ? parseFloat(form.cost) : null,
        scheduled_date: form.scheduled_date || null,
        contact_id,
        status: form.status,
        scope: form.scope,
      };

      if (image_url !== undefined) payload.image_url = image_url;

      // Update completed_date based on status
      if (form.status === "completed") {
        // Only set completed_date if not already set (for new completions)
        if (!editingId) payload.completed_date = new Date().toISOString().split("T")[0];
      }

      if (editingId) {
        const { error } = await supabase.from("maintenance_logs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("maintenance_logs").insert({
          user_id: user!.id,
          property_id: form.property_id,
          title: form.title,
          description: form.description || null,
          category: form.category,
          cost: form.cost ? parseFloat(form.cost) : null,
          scheduled_date: form.scheduled_date || null,
          contact_id,
          image_url: image_url !== undefined ? image_url : null,
          scope: form.scope,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs_for_contacts"] });
      setOpen(false);
      resetForm();
      toast({ title: editingId ? "Maintenance log updated!" : "Maintenance log added!" });
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

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Maintenance Log</h2>
          <p className="font-body text-sm text-muted-foreground">Track repairs, upgrades, and scheduled maintenance</p>
        </div>
        <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0} onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Entry
        </Button>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Edit Maintenance Log" : "Log Maintenance"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
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

            {/* Vendor / Contact selector */}
            <div className="space-y-2">
              <Label className="font-body flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Vendor / Contractor</Label>
              {!showNewVendor ? (
                <div className="space-y-2">
                  <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Select vendor (optional)" /></SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="font-body">
                          {c.name}{c.company ? ` · ${c.company}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="font-body text-xs" onClick={() => { setShowNewVendor(true); setForm({ ...form, contact_id: "" }); }}>
                    <Plus className="mr-1 h-3 w-3" /> Add New Vendor
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs font-medium text-muted-foreground">New Vendor</span>
                    <Button type="button" variant="ghost" size="sm" className="font-body text-xs h-6" onClick={() => { setShowNewVendor(false); setNewVendor({ name: "", role: "other", company: "", phone: "", email: "" }); }}>
                      Cancel
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="font-body text-xs">Name *</Label>
                      <Input placeholder="John Smith" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} className="font-body h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-body text-xs">Role</Label>
                      <Select value={newVendor.role} onValueChange={(v) => setNewVendor({ ...newVendor, role: v })}>
                        <SelectTrigger className="font-body h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {vendorRoles.map((r) => (
                            <SelectItem key={r.value} value={r.value} className="font-body text-sm">{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Company</Label>
                    <Input placeholder="ABC Plumbing" value={newVendor.company} onChange={(e) => setNewVendor({ ...newVendor, company: e.target.value })} className="font-body h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="font-body text-xs">Phone</Label>
                      <Input placeholder="(555) 123-4567" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} className="font-body h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-body text-xs">Email</Label>
                      <Input type="email" placeholder="john@example.com" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} className="font-body h-8 text-sm" />
                    </div>
                  </div>
                </div>
              )}
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

            <div className="space-y-2">
              <Label className="font-body">Scope</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {scopes.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="font-body">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status selector (visible when editing) */}
            {editingId && (
              <div className="space-y-2">
                <Label className="font-body">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="font-body">Pending</SelectItem>
                    <SelectItem value="in_progress" className="font-body">In Progress</SelectItem>
                    <SelectItem value="completed" className="font-body">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={saveMutation.isPending || !form.property_id || (showNewVendor && !newVendor.name)}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Save Changes" : "Add Entry"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm font-semibold">{log.title}</h4>
                        {log.scope && log.scope !== "routine" && (
                          <Badge variant={log.scope === "major_repair" ? "destructive" : "outline"} className="font-body text-[10px] px-1.5 py-0">
                            {scopes.find((s) => s.value === log.scope)?.label ?? log.scope}
                          </Badge>
                        )}
                        {log.reference_code && (
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{log.reference_code}</span>
                        )}
                      </div>
                      <p className="font-body text-xs text-muted-foreground">
                        {log.properties?.name} · {categories.find((c) => c.value === log.category)?.label ?? log.category}
                        {log.cost ? ` · $${Number(log.cost).toFixed(2)}` : ""}
                      </p>
                      {log.home_contacts && (
                        <p className="font-body text-xs text-accent">
                          <Users className="mr-1 inline h-3 w-3" />
                          {log.home_contacts.name}{log.home_contacts.company ? ` · ${log.home_contacts.company}` : ""}
                        </p>
                      )}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(log)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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