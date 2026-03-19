import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Wrench, CheckCircle2, Clock, AlertTriangle, Image as ImageIcon, Users, Pencil, Paperclip, TrendingUp, ListFilter, Trash2, ChevronsUpDown, Check, Package, X } from "lucide-react";
import FilePicker from "@/components/ui/file-picker";
import { useDefaultContractorLink } from "@/hooks/useDefaultContractorLink";
import ServiceLinkPopover from "@/components/dashboard/ServiceLinkPopover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { indexMaintenancePhoto, removeDocumentIndex } from "@/lib/documentIndexing";
import { maintenanceLogSchema, validateForm, validateFiles } from "@/lib/schemas";
import LinkedDocuments from "@/components/dashboard/documents/LinkedDocuments";
import ExpenseTypeField from "@/components/dashboard/ExpenseTypeField";
import BulkClassifyDialog from "@/components/dashboard/BulkClassifyDialog";
import { useCostBasisAggregated } from "@/hooks/useCostBasisSummary";
import { matchLogToComponent } from "@/lib/componentMatcher";
import ComponentUpdateSheet from "@/components/dashboard/ComponentUpdateSheet";
import { cn } from "@/lib/utils";
import { SYSTEMS_CATALOG, type HomeSystemsRegistry, migrateOldRegistry } from "@/lib/homeSystemsRegistry";

type Property = Tables<"properties">;

// Fallback categories for legacy users without registry
const legacyCategories = [
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

const emptyForm = { title: "", description: "", category: "general", property_id: "", cost: "", scheduled_date: "", contact_id: "", status: "pending", scope: "routine", expense_type: "repair", tax_notes: "" };

const MaintenanceCostBar = () => {
  const { data: costBasis } = useCostBasisAggregated();
  if (!costBasis) return null;
  const { totalImprovements, totalRepairs, improvementCount, repairCount } = costBasis;
  if (totalImprovements === 0 && totalRepairs === 0) return null;
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-secondary/50 px-4 py-2.5 font-body text-sm">
      <span className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-sage" />
        <span className="text-muted-foreground">Capital Improvements:</span>
        <span className="font-semibold">{fmt(totalImprovements)}</span>
        <span className="text-xs text-muted-foreground">({improvementCount} entries)</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Repairs & Maintenance:</span>
        <span className="font-semibold">{fmt(totalRepairs)}</span>
        <span className="text-xs text-muted-foreground">({repairCount} entries)</span>
      </span>
    </div>
  );
};

const MaintenanceLogSection = ({ onNavigate }: { onNavigate?: (section: string) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", role: "other", company: "", phone: "", email: "" });
  const [form, setForm] = useState({ ...emptyForm });
  const [bulkClassifyOpen, setBulkClassifyOpen] = useState(false);

  // Related Component state — now multi-select
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [componentComboOpen, setComponentComboOpen] = useState(false);
  const [showNewComponent, setShowNewComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentType, setNewComponentType] = useState("general");

  // Post-save bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetData, setSheetData] = useState<{
    logId: string;
    componentId: string | null;
    componentName: string | null;
    componentType: string | null;
    isNewComponent: boolean;
    logDate: string;
    logCost: string;
    logContactName: string;
    propertyId: string;
  } | null>(null);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setAttachedFiles([]);
    setExistingImageUrl(null);
    setShowNewVendor(false);
    setNewVendor({ name: "", role: "other", company: "", phone: "", email: "" });
    setSelectedComponentIds([]);
    setShowNewComponent(false);
    setNewComponentName("");
    setNewComponentType("general");
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
      expense_type: log.expense_type || "repair",
      tax_notes: log.tax_notes || "",
    });
    setEditingId(log.id);
    // Load linked components from junction table
    setSelectedComponentIds(log.component_id ? [log.component_id] : []);
    setExistingImageUrl(log.image_url || null);
    setAttachedFiles([]);
    setShowNewVendor(false);
    setNewVendor({ name: "", role: "other", company: "", phone: "", email: "" });
    setShowNewComponent(false);
    setOpen(true);
    // Async load junction table components
    if (log.id) {
      supabase.from("maintenance_log_components")
        .select("component_id")
        .eq("log_id", log.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSelectedComponentIds(data.map((d: any) => d.component_id));
          }
        });
    }
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

  useEffect(() => {
    ensureDefault();
  }, [firstPropertyId, defaultLink]);

  const { data: pendingSubmissionsCount = 0 } = useQuery({
    queryKey: ["pending_submissions_count", user?.id],
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

  // Fetch home components for the selected property (with system_key for grouping)
  const { data: homeComponents = [] } = useQuery({
    queryKey: ["home_components_for_property", form.property_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("id, name, category, item_type, data_completeness, install_date, brand, model, warranty_expiry, last_maintained, notes, estimated_value, system_key, system_instance")
        .eq("property_id", form.property_id)
        .eq("item_type", "home_component")
        .or("is_active.is.null,is_active.eq.true")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!form.property_id,
  });

  // Fetch property registry for dynamic categories (Prompt 7)
  const selectedProperty = properties.find((p) => p.id === form.property_id);
  const rawPropSystems = (selectedProperty as any)?.home_systems || null;
  const propRegistry = rawPropSystems ? (migrateOldRegistry(rawPropSystems) || rawPropSystems as HomeSystemsRegistry) : null;
  const propRegistryCompleted = (selectedProperty as any)?.registry_completed || false;

  // Build categories from registry or fall back to legacy
  const categories = (() => {
    if (!propRegistryCompleted || !propRegistry) return legacyCategories;
    const enabled: { value: string; label: string; icon: string }[] = [];
    for (const sys of SYSTEMS_CATALOG) {
      const entry = propRegistry[sys.key];
      if (entry?.enabled) {
        enabled.push({ value: sys.key, label: sys.label, icon: sys.icon });
      }
    }
    enabled.push({ value: "general", label: "General", icon: "🔧" });
    return enabled;
  })();

  // Filter components by selected category (Prompt 7)
  const filteredComponents = form.category && form.category !== "general"
    ? homeComponents.filter((c: any) => {
        const sk = (c as any).system_key as string | null;
        return sk ? sk.startsWith(form.category + ":") : c.category === form.category;
      })
    : homeComponents;

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

  const logIds = logs.map((l: any) => l.id);
  const { data: docCounts = {} } = useQuery({
    queryKey: ["doc_counts_maintenance", logIds],
    queryFn: async () => {
      if (logIds.length === 0) return {};
      const { data, error } = await supabase
        .from("documents")
        .select("maintenance_log_id")
        .in("maintenance_log_id", logIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        counts[d.maintenance_log_id] = (counts[d.maintenance_log_id] || 0) + 1;
      });
      return counts;
    },
    enabled: logIds.length > 0,
  });

  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url: string | null | undefined = undefined;
      let contact_id: string | null = form.contact_id || null;

      const uploadedPaths: { path: string; file: File }[] = [];
      if (attachedFiles.length > 0 && user) {
        for (const file of attachedFiles) {
          const filePath = `${user.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from("maintenance-photos").upload(filePath, file);
          if (uploadError) continue;
          uploadedPaths.push({ path: filePath, file });
        }
        const firstImage = uploadedPaths.find((u) => u.file.type.startsWith("image/"));
        if (firstImage) {
          const { data: urlData } = await supabase.storage.from("maintenance-photos").createSignedUrl(firstImage.path, 31536000);
          image_url = urlData?.signedUrl || null;
        }
      }

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

      // Handle inline new component creation
      let component_id: string | null = selectedComponentIds.length > 0 ? selectedComponentIds[0] : null;
      if (showNewComponent && newComponentName) {
        const { data: newComp, error: compErr } = await supabase
          .from("home_items")
          .insert({
            user_id: user!.id,
            property_id: form.property_id,
            name: newComponentName,
            category: newComponentType,
            item_type: "home_component",
          })
          .select("id")
          .single();
        if (compErr) throw compErr;
        component_id = newComp.id;
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
        expense_type: form.expense_type,
        tax_notes: form.tax_notes || null,
        component_id: component_id || null,
      };

      // Compute system_key from selected components
      if (selectedComponentIds.length > 0 || component_id) {
        const allIds = showNewComponent && component_id ? [component_id] : selectedComponentIds;
        const selectedComps = homeComponents.filter((c) => allIds.includes(c.id));
        const systemPrefixes = new Set(selectedComps.map((c: any) => (c.system_key as string)?.split(":")[0]).filter(Boolean));
        if (systemPrefixes.size === 1) {
          payload.system_key = Array.from(systemPrefixes)[0];
        } else if (systemPrefixes.size > 1) {
          const primaryComp = homeComponents.find((c) => c.id === (component_id || allIds[0]));
          payload.system_key = (primaryComp as any)?.system_key?.split(":")[0] || null;
        }
      }

      if (image_url !== undefined) payload.image_url = image_url;

      if (form.status === "completed") {
        if (!editingId) payload.completed_date = form.scheduled_date || new Date().toISOString().split("T")[0];
      }

      let logId = editingId;
      if (editingId) {
        if (uploadedPaths.length > 0) {
          const { data: oldLog } = await supabase.from("maintenance_logs").select("image_url").eq("id", editingId).single();
          if (oldLog?.image_url) {
            const oldPathMatch = oldLog.image_url.match(/maintenance-photos\/([^?]+)/);
            if (oldPathMatch) await removeDocumentIndex(oldPathMatch[1]);
          }
        }
        const { error } = await supabase.from("maintenance_logs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: newLog, error } = await supabase.from("maintenance_logs").insert({
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
          expense_type: form.expense_type,
          tax_notes: form.tax_notes || null,
          component_id: component_id || null,
        }).select("id").single();
        if (error) throw error;
        logId = newLog.id;
      }

      // Save junction table rows for multi-component linking
      if (logId) {
        const allComponentIds = showNewComponent && component_id
          ? [component_id]
          : selectedComponentIds;

        if (allComponentIds.length > 0) {
          // Delete old junction rows if editing
          if (editingId) {
            await supabase.from("maintenance_log_components").delete().eq("log_id", logId);
          }
          // Insert new junction rows
          const junctionRows = allComponentIds.map((cid) => ({
            log_id: logId!,
            component_id: cid,
          }));
          await supabase.from("maintenance_log_components").insert(junctionRows as any);
        }
      }

      for (const uploaded of uploadedPaths) {
        if (logId) {
          await indexMaintenancePhoto({
            file_path: uploaded.path,
            file_name: uploaded.file.name,
            file_type: uploaded.file.type,
            file_size: uploaded.file.size,
            property_id: form.property_id,
            user_id: user!.id,
            maintenance_log_id: logId,
            log_title: form.title,
            log_date: form.scheduled_date || undefined,
          });
        }
      }

      // Run componentMatcher if no component was explicitly selected
      let matchResult: { componentId: string | null; componentType: string | null; confidence: number; isNewComponent: boolean } | null = null;
      if (!component_id) {
        const components = homeComponents.map((c) => ({ id: c.id, name: c.name, category: c.category, item_type: c.item_type }));
        const result = matchLogToComponent(form.title, form.description, form.category, components);
        if (result.confidence >= 0.6) {
          matchResult = result;
        }
      }

      // Find contact name for the sheet
      let contactName = "";
      if (contact_id) {
        const c = contacts.find((ct) => ct.id === contact_id);
        contactName = c ? c.name : "";
      } else if (showNewVendor) {
        contactName = newVendor.name;
      }

      return { logId: logId!, component_id, matchResult, contactName };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs_for_contacts"] });
      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      setOpen(false);

      const shouldShowSheet = result.component_id || result.matchResult;
      if (shouldShowSheet && !editingId) {
        const matchedComp = result.component_id
          ? homeComponents.find((c) => c.id === result.component_id)
          : result.matchResult?.componentId
            ? homeComponents.find((c) => c.id === result.matchResult!.componentId)
            : null;

        setSheetData({
          logId: result.logId,
          componentId: result.component_id || result.matchResult?.componentId || null,
          componentName: matchedComp?.name || result.matchResult?.componentType || null,
          componentType: matchedComp?.category || result.matchResult?.componentType || null,
          isNewComponent: result.matchResult?.isNewComponent ?? false,
          logDate: form.scheduled_date,
          logCost: form.cost,
          logContactName: result.contactName,
          propertyId: form.property_id,
        });
        setSheetOpen(true);
      } else {
        toast({ title: editingId ? "Maintenance log updated!" : "Maintenance log added!" });
      }

      resetForm();
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

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
      toast({ title: "Maintenance log deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const selectedComponentNames = homeComponents.filter((c) => selectedComponentIds.includes(c.id));

  return (
    <div>
      {pendingSubmissionsCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
          <p className="text-sm font-medium">
            You have <span className="font-bold">{pendingSubmissionsCount}</span> pending contractor submission{pendingSubmissionsCount !== 1 ? "s" : ""} to review
          </p>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.("contractor-submissions")}>
            Review
          </Button>
        </div>
      )}

      <MaintenanceCostBar />

      <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Maintenance Log</h2>
          <p className="font-body text-sm text-muted-foreground">Track repairs, upgrades, and scheduled maintenance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full font-body text-xs" onClick={() => setBulkClassifyOpen(true)}>
            <ListFilter className="mr-1 h-3.5 w-3.5" /> Classify Expenses
          </Button>
          {defaultLinkUrl && (
            <ServiceLinkPopover linkUrl={defaultLinkUrl} onNavigateToLinks={() => onNavigate?.("contractor-links")} />
          )}
          <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0} onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Entry
          </Button>
        </div>
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
              <Select value={form.property_id} onValueChange={(v) => { setForm({ ...form, property_id: v }); setSelectedComponentIds([]); }}>
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

            {/* Related Component — positioned after category, before description */}
            {form.property_id && (
              <div className="space-y-1.5">
                <Label className="font-body flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Related Components</Label>
                {!showNewComponent ? (
                  <>
                    <Popover open={componentComboOpen} onOpenChange={setComponentComboOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={componentComboOpen} className="w-full justify-between font-body font-normal h-auto min-h-9 text-sm py-1.5">
                          {selectedComponentNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedComponentNames.map((c) => (
                                <Badge key={c.id} variant="secondary" className="text-[10px] px-1.5 py-0.5 font-normal">
                                  {c.name}
                                  <button
                                    type="button"
                                    className="ml-1 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedComponentIds((prev) => prev.filter((id) => id !== c.id));
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Link to components (optional)</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search components..." className="font-body" />
                          <CommandList>
                            <CommandEmpty className="font-body text-sm py-3 text-center">No components found.</CommandEmpty>
                            {selectedComponentIds.length > 0 && (
                              <CommandGroup>
                                <CommandItem
                                  value="__clear__"
                                  onSelect={() => { setSelectedComponentIds([]); }}
                                  className="font-body text-sm text-muted-foreground"
                                >
                                  Clear all
                                </CommandItem>
                              </CommandGroup>
                            )}
                            {(() => {
                              // Group by system_key prefix
                              const grouped: Record<string, typeof filteredComponents> = {};
                              for (const comp of filteredComponents) {
                                const sk = (comp as any).system_key as string | null;
                                const sysPrefix = sk?.split(":")[0] || "other";
                                if (!grouped[sysPrefix]) grouped[sysPrefix] = [];
                                grouped[sysPrefix].push(comp);
                              }
                              return Object.entries(grouped).map(([sysKey, comps]) => {
                                const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
                                const label = sys ? `${sys.icon} ${sys.label}` : "Other";
                                return (
                                  <CommandGroup key={sysKey} heading={label}>
                                    {comps.map((comp) => {
                                      const isSelected = selectedComponentIds.includes(comp.id);
                                      return (
                                        <CommandItem
                                          key={comp.id}
                                          value={comp.name}
                                          onSelect={() => {
                                            setSelectedComponentIds((prev) =>
                                              isSelected
                                                ? prev.filter((id) => id !== comp.id)
                                                : [...prev, comp.id]
                                            );
                                            // Auto-set category if selecting first component (Prompt 7)
                                            if (!isSelected && selectedComponentIds.length === 0 && (comp as any).system_key) {
                                              const compSysKey = ((comp as any).system_key as string).split(":")[0];
                                              if (compSysKey && categories.some((c) => c.value === compSysKey)) {
                                                setForm((f) => ({ ...f, category: compSysKey }));
                                              }
                                            }
                                          }}
                                          className="font-body text-sm"
                                        >
                                          <Checkbox checked={isSelected} className="mr-2 h-4 w-4" />
                                          {comp.name}
                                          <span className="ml-auto text-xs text-muted-foreground">{comp.category}</span>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                );
                              });
                            })()}
                            <CommandGroup>
                              <CommandItem
                                value="__new__"
                                onSelect={() => { setShowNewComponent(true); setSelectedComponentIds([]); setComponentComboOpen(false); }}
                                className="font-body text-sm text-accent"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Component
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="font-body text-xs text-muted-foreground">Link to the components this work serviced</p>
                  </>
                ) : (
                  <div className="rounded-lg border border-border/50 p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs font-medium text-muted-foreground">New Component</span>
                      <Button type="button" variant="ghost" size="sm" className="font-body text-xs h-6" onClick={() => { setShowNewComponent(false); setNewComponentName(""); setNewComponentType("general"); }}>
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="font-body text-xs">Name *</Label>
                        <Input placeholder="e.g. HVAC System" value={newComponentName} onChange={(e) => setNewComponentName(e.target.value)} className="font-body h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-body text-xs">Type</Label>
                        <Select value={newComponentType} onValueChange={setNewComponentType}>
                          <SelectTrigger className="font-body h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {legacyCategories.map((c) => (
                              <SelectItem key={c.value} value={c.value} className="font-body text-sm">{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* File attachments */}
            <div className="space-y-2">
              <Label className="font-body">Attachments (optional)</Label>
              {existingImageUrl && attachedFiles.length === 0 && (
                <div className="mb-2">
                  <img src={existingImageUrl} alt="Existing" className="h-24 rounded-lg object-cover" />
                  <p className="font-body text-[10px] text-muted-foreground mt-1">Current photo — add new files below to replace</p>
                </div>
              )}
              <FilePicker
                files={attachedFiles}
                onChange={setAttachedFiles}
                maxFiles={10}
                label="Click to add photos or documents"
              />
            </div>

            {/* Expense Type */}
            <ExpenseTypeField
              value={form.expense_type}
              onChange={(v) => setForm({ ...form, expense_type: v })}
              taxNotes={form.tax_notes}
              onTaxNotesChange={(v) => setForm({ ...form, tax_notes: v })}
            />

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

            <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={saveMutation.isPending || !form.property_id || (showNewVendor && !newVendor.name) || (showNewComponent && !newComponentName)}>
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

      {/* Post-save component update sheet */}
      {sheetData && (
        <ComponentUpdateSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          logId={sheetData.logId}
          logDate={sheetData.logDate}
          logCost={sheetData.logCost}
          logContactName={sheetData.logContactName}
          componentId={sheetData.componentId}
          componentName={sheetData.componentName}
          componentType={sheetData.componentType}
          isNewComponent={sheetData.isNewComponent}
          propertyId={sheetData.propertyId}
          existingComponent={sheetData.componentId ? homeComponents.find((c) => c.id === sheetData.componentId) : null}
        />
      )}

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="mb-4 h-10 w-10 text-muted-foreground/50" />
            <h3 className="mb-1 font-display text-lg font-semibold">Add a property first</h3>
            <p className="font-body text-sm text-muted-foreground">You need at least one property to start logging maintenance</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-1 font-display text-lg font-semibold">Your maintenance timeline starts here</h3>
            <p className="font-body text-sm text-muted-foreground text-center max-w-md mb-5">
              Log your first repair, service call, or improvement to start building your home's complete history.
            </p>
            <div className="flex gap-3">
              <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Log First Entry
              </Button>
              {defaultLinkUrl && (
                <Button variant="outline" className="rounded-full font-body" onClick={() => onNavigate?.("contractor-links")}>
                  <Users className="mr-2 h-4 w-4" /> Share Link with Contractor
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => {
            const cfg = statusConfig[log.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const logDocCount = (docCounts as Record<string, number>)[log.id] || 0;
            const isExpanded = expandedLog === log.id;
            return (
              <Card key={log.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
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
                          {log.expense_type === "capital_improvement" && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-body text-[10px] px-1.5 py-0">
                              <TrendingUp className="mr-0.5 h-3 w-3" />Improvement
                            </Badge>
                          )}
                          {log.reference_code && (
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{log.reference_code}</span>
                          )}
                          {logDocCount > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground cursor-pointer" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                              <Paperclip className="mr-0.5 h-3 w-3" />{logDocCount}
                            </Badge>
                          )}
                        </div>
                        <p className="font-body text-xs text-muted-foreground">
                          {log.properties?.name} · {legacyCategories.find((c) => c.value === log.category)?.label ?? log.category}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this maintenance log?")) deleteLog.mutate(log.id); }}>
                        <Trash2 className="h-4 w-4" />
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
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-border/50 pt-3">
                      <LinkedDocuments
                        maintenanceLogId={log.id}
                        propertyId={log.property_id}
                        propertyName={log.properties?.name}
                        defaultCategory="maintenance_photo"
                        onViewAll={() => onNavigate?.("documents")}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BulkClassifyDialog open={bulkClassifyOpen} onOpenChange={setBulkClassifyOpen} />
    </div>
  );
};

export default MaintenanceLogSection;
