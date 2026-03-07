import { useState, useRef, useEffect, useCallback } from "react";
import { useSubscription } from "@/hooks/useSubscription";
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
import {
  Plus, Package, Zap, Droplets, Wind, Refrigerator, Trash2, Edit2,
  AlertTriangle, Gem, Upload, FileText, Image, Download, Loader2, Paperclip, X, Lock, Circle, Shield
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import UpgradeModal from "./UpgradeModal";
import { format, differenceInDays, differenceInMonths, isPast } from "date-fns";
import { indexInventoryAttachment, removeDocumentIndex } from "@/lib/documentIndexing";
import LinkedDocuments from "@/components/dashboard/documents/LinkedDocuments";
import ComponentMaintenanceHistory from "./ComponentMaintenanceHistory";
import { calculateComponentCompleteness } from "@/lib/componentCompleteness";
import { consumePendingInventoryAction } from "@/lib/pendingInventoryAction";
import { SYSTEMS_CATALOG, getEnabledComponents, avgReplacementCost, migrateOldRegistry, type HomeSystemsRegistry } from "@/lib/homeSystemsRegistry";

const homeComponentCategories = [
  { value: "roofing", label: "Roofing", icon: Package },
  { value: "hvac", label: "HVAC", icon: Wind },
  { value: "plumbing", label: "Plumbing", icon: Droplets },
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "appliance", label: "Appliance", icon: Refrigerator },
  { value: "structural", label: "Structural", icon: Package },
  { value: "exterior", label: "Exterior", icon: Package },
  { value: "general", label: "General", icon: Package },
];

const personalItemCategories = [
  { value: "furniture", label: "Furniture", icon: Package },
  { value: "electronics", label: "Electronics", icon: Zap },
  { value: "art_decor", label: "Art & Decor", icon: Gem },
  { value: "tools", label: "Tools & Equipment", icon: Package },
  { value: "sporting", label: "Sporting Goods", icon: Package },
  { value: "instruments", label: "Musical Instruments", icon: Package },
  { value: "jewelry", label: "Jewelry & Valuables", icon: Gem },
  { value: "other", label: "Other", icon: Package },
];

interface HomeInventoryProps {
  propertyId: string;
  itemType?: "home_component" | "personal_item";
  warrantyFilter?: boolean;
  onNavigate?: (section: string) => void;
}

const emptyItemForm = {
  name: "", category: "general", brand: "", model: "", serial_number: "",
  install_date: "", last_maintained: "", expected_replacement: "", warranty_expiry: "", notes: "",
  estimated_value: "", item_type: "" as "home_component" | "personal_item" | "",
  system_key: "" as string,
};

// Build flat list of system:component options for the dropdown
const systemComponentOptions = SYSTEMS_CATALOG.flatMap((sys) =>
  sys.components.map((comp) => ({
    value: `${sys.key}:${comp.key}`,
    label: `${comp.label}`,
    group: `${sys.icon} ${sys.label}`,
    systemKey: sys.key,
  }))
);

const HomeInventory = ({ propertyId, itemType = "home_component", warrantyFilter = false, onNavigate }: HomeInventoryProps) => {
  const itemCategories = itemType === "personal_item" ? personalItemCategories : homeComponentCategories;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [expandedAttachments, setExpandedAttachments] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tier } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isPro = tier === "pro";
  const dialogFileInputRef = useRef<HTMLInputElement>(null);
  const [fileDragOver, setFileDragOver] = useState(false);

  const itemsRef = useRef<any[]>([]);
  const pendingConsumed = useRef(false);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["home_items", propertyId, itemType, warrantyFilter],
    queryFn: async () => {
      let query = supabase
        .from("home_items")
        .select("*")
        .eq("property_id", propertyId)
        .eq("item_type", itemType)
        .or("is_active.is.null,is_active.eq.true")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (warrantyFilter) {
        const future = new Date();
        future.setDate(future.getDate() + 90);
        query = query.not("warranty_expiry", "is", null).lte("warranty_expiry", future.toISOString().split("T")[0]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!propertyId,
  });

  // Fetch registry data for this property
  const { data: propertyRegistry } = useQuery({
    queryKey: ["property_registry", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("home_systems, registry_completed")
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId && itemType === "home_component",
  });

  const rawHomeSystems = (propertyRegistry as any)?.home_systems || null;
  const homeSystems = rawHomeSystems ? (migrateOldRegistry(rawHomeSystems) || rawHomeSystems as HomeSystemsRegistry) : null;
  const registryCompleted = (propertyRegistry as any)?.registry_completed || false;

  // Compute skeleton cards for components needing details
  const skeletonComponents = itemType === "home_component" && registryCompleted && homeSystems
    ? getEnabledComponents(homeSystems)
        .filter((comp) => {
          const compKey = `${comp.systemKey}:${comp.key}`;
          const matchingItems = items.filter((i: any) => (i as any).system_key === compKey);
          if (matchingItems.length === 0) return true;
          return matchingItems.every((i: any) => (i as any).is_registry_skeleton && i.data_completeness === 0);
        })
        .sort((a, b) => b.annualCost - a.annualCost)
    : [];

  useEffect(() => {
    itemsRef.current = items;
    if (itemType !== "home_component" || pendingConsumed.current) return;
    
    const pending = consumePendingInventoryAction();
    if (!pending || Date.now() - pending.timestamp > 5000) return;
    pendingConsumed.current = true;

    if (pending.mode === "edit") {
      const existing = items.find((i: any) => i.category === pending.category);
      if (existing) {
        setEditingItem(existing.id);
        setItemForm({
          name: existing.name || "",
          category: existing.category || "general",
          brand: existing.brand || "",
          model: existing.model || "",
          serial_number: existing.serial_number || "",
          install_date: existing.install_date || "",
          last_maintained: existing.last_maintained || "",
          expected_replacement: existing.expected_replacement || "",
          warranty_expiry: existing.warranty_expiry || "",
          notes: existing.notes || "",
          estimated_value: existing.estimated_value ? String(existing.estimated_value) : "",
          item_type: "home_component",
        });
        setItemOpen(true);
        return;
      }
    }
    setEditingItem(null);
    setItemForm({ ...emptyItemForm, category: pending.category || "general", item_type: "home_component" });
    setItemOpen(true);
  }, [items, itemType]);

  // Fetch all attachments for items in this property
  const itemIds = items.map((i: any) => i.id);
  const { data: allAttachments = [] } = useQuery({
    queryKey: ["home_item_attachments", propertyId, itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      const { data, error } = await supabase
        .from("home_item_attachments")
        .select("*")
        .in("home_item_id", itemIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && itemIds.length > 0,
  });

  const upsertItem = useMutation({
    mutationFn: async () => {
      const effectiveType = itemForm.item_type || itemType;
      const payload: any = {
        property_id: propertyId,
        user_id: user!.id,
        name: itemForm.name,
        category: itemForm.category,
        brand: itemForm.brand || null,
        model: itemForm.model || null,
        serial_number: itemForm.serial_number || null,
        install_date: itemForm.install_date || null,
        last_maintained: itemForm.last_maintained || null,
        expected_replacement: itemForm.expected_replacement || null,
        warranty_expiry: itemForm.warranty_expiry || null,
        notes: itemForm.notes || null,
        item_type: effectiveType,
        estimated_value: effectiveType === "personal_item" && itemForm.estimated_value ? parseFloat(itemForm.estimated_value) : null,
        system_key: effectiveType === "home_component" && itemForm.system_key ? itemForm.system_key : null,
      };
      let itemId = editingItem;
      if (editingItem) {
        // Manual edit: clear log link and update timestamp
        payload.last_updated_from_log_id = null;
        payload.last_updated_at = new Date().toISOString();
        // Recalculate completeness
        payload.data_completeness = calculateComponentCompleteness({
          install_date: payload.install_date,
          brand: payload.brand,
          model: payload.model,
          warranty_expiry: payload.warranty_expiry,
          last_maintained: payload.last_maintained,
          estimated_value: payload.estimated_value,
          notes: payload.notes,
        });
        // Skeleton graduation: if user added meaningful data, mark as no longer skeleton
        const editedItem = items.find((i: any) => i.id === editingItem);
        if (editedItem && (editedItem as any).is_registry_skeleton) {
          const hasMeaningfulData = payload.install_date || payload.brand || payload.model || payload.warranty_expiry;
          if (hasMeaningfulData) {
            payload.is_registry_skeleton = false;
          }
        }
        const { error } = await supabase.from("home_items").update(payload).eq("id", editingItem);
        if (error) throw error;
      } else {
        payload.data_completeness = calculateComponentCompleteness({
          install_date: payload.install_date,
          brand: payload.brand,
          model: payload.model,
          warranty_expiry: payload.warranty_expiry,
          last_maintained: payload.last_maintained,
          estimated_value: payload.estimated_value,
          notes: payload.notes,
        });
        const { data, error } = await supabase.from("home_items").insert(payload).select("id").single();
        if (error) throw error;
        itemId = data.id;
      }
      // Upload any pending files
      if (pendingFiles.length > 0 && itemId) {
        for (const file of pendingFiles) {
          const ext = file.name.split(".").pop();
          const path = `${user!.id}/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("home-item-attachments")
            .upload(path, file);
          if (uploadError) continue;
          await supabase.from("home_item_attachments").insert({
            home_item_id: itemId,
            user_id: user!.id,
            file_path: path,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          });
          // Auto-index into documents
          await indexInventoryAttachment({
            file_path: path,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            property_id: propertyId,
            user_id: user!.id,
            home_item_id: itemId,
            item_name: itemForm.name,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_items", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["home_item_attachments"] });
      setItemOpen(false);
      setEditingItem(null);
      setItemForm(emptyItemForm);
      setPendingFiles([]);
      toast({ title: editingItem ? "Item updated" : "Item added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_items", propertyId] });
      toast({ title: "Item removed" });
    },
  });


  const uploadAttachment = useMutation({
    mutationFn: async ({ itemId, file, itemName }: { itemId: string; file: File; itemName?: string }) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${itemId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("home-item-attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("home_item_attachments").insert({
        home_item_id: itemId,
        user_id: user!.id,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
      });
      if (dbError) throw dbError;

      // Auto-index into documents
      const name = itemName || items.find((i: any) => i.id === itemId)?.name || "Inventory Item";
      await indexInventoryAttachment({
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        property_id: propertyId,
        user_id: user!.id,
        home_item_id: itemId,
        item_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_item_attachments"] });
      setUploadingFor(null);
      toast({ title: "File uploaded" });
    },
    onError: (err: Error) => {
      setUploadingFor(null);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (att: any) => {
      await supabase.storage.from("home-item-attachments").remove([att.file_path]);
      const { error } = await supabase.from("home_item_attachments").delete().eq("id", att.id);
      if (error) throw error;
      // Remove from documents index
      await removeDocumentIndex(att.file_path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_item_attachments"] });
      toast({ title: "Attachment removed" });
    },
  });

  const handleFileUpload = (itemId: string) => {
    setUploadingFor(itemId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingFor) {
      uploadAttachment.mutate({ itemId: uploadingFor, file });
    }
    e.target.value = "";
  };

  const getAttachmentUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from("home-item-attachments").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  };

  const AttachmentItem = ({ att }: { att: any }) => {
    const [url, setUrl] = useState<string>("");
    useEffect(() => {
      getAttachmentUrl(att.file_path).then(setUrl);
    }, [att.file_path]);
    if (!url) return <div className="h-20 w-20 rounded-lg bg-muted animate-pulse" />;
    return (
      <div className="group relative rounded-lg border border-border/50 overflow-hidden">
        {isImageType(att.file_type) ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={att.file_name} className="h-20 w-20 object-cover" />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-20 w-20 flex-col items-center justify-center bg-muted p-2">
            <FileText className="h-6 w-6 text-muted-foreground mb-1" />
            <span className="font-body text-[9px] text-muted-foreground text-center leading-tight truncate w-full">{att.file_name}</span>
          </a>
        )}
        <button onClick={() => deleteAttachment.mutate(att)} className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      </div>
    );
  };

  const openEditItem = (item: any) => {
    setEditingItem(item.id);
    setItemForm({
      name: item.name, category: item.category,
      brand: item.brand || "", model: item.model || "",
      serial_number: item.serial_number || "",
      install_date: item.install_date || "", last_maintained: item.last_maintained || "",
      expected_replacement: item.expected_replacement || "", warranty_expiry: item.warranty_expiry || "",
      notes: item.notes || "",
      estimated_value: item.estimated_value ? String(item.estimated_value) : "",
      item_type: item.item_type || itemType,
      system_key: item.system_key || "",
    });
    setItemOpen(true);
  };

  const getReplacementStatus = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const days = differenceInDays(d, new Date());
    if (isPast(d)) return { label: "Overdue", variant: "destructive" as const };
    if (days <= 90) return { label: "Soon", variant: "default" as const };
    return null;
  };

  const getFreshnessIndicator = (lastUpdatedAt: string | null) => {
    if (!lastUpdatedAt) return { color: "text-destructive", fill: "fill-destructive", label: "Needs attention — never updated" };
    const months = differenceInMonths(new Date(), new Date(lastUpdatedAt));
    if (months <= 6) {
      const ago = format(new Date(lastUpdatedAt), "MMM d, yyyy");
      return { color: "text-accent", fill: "fill-accent", label: `Updated ${ago}` };
    }
    if (months <= 12) {
      const ago = format(new Date(lastUpdatedAt), "MMM d, yyyy");
      return { color: "text-yellow-500", fill: "fill-yellow-500", label: `Last updated ${ago}` };
    }
    const ago = format(new Date(lastUpdatedAt), "MMM d, yyyy");
    return { color: "text-destructive", fill: "fill-destructive", label: `Needs attention — last updated ${ago}` };
  };

  // ── Export functions ──
  const exportCSV = () => {
    const headers = ["Name", "Category", "Brand/Manufacturer", "Model", "Serial Number", "Install Date", "Last Maintained", "Expected Replacement", "Warranty Expiry", "Notes"];
    const rows = items.map((item: any) => [
      item.name, item.category, item.brand || "", item.model || "", item.serial_number || "",
      item.install_date || "", item.last_maintained || "", item.expected_replacement || "",
      item.warranty_expiry || "", (item.notes || "").replace(/"/g, '""'),
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `home-inventory-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const exportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = items.map((item: any) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(itemCategories.find(c => c.value === item.category)?.label || item.category)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(item.brand || "—")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(item.model || "—")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(item.serial_number || "—")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.install_date ? format(new Date(item.install_date), "MMM yyyy") : "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.expected_replacement ? format(new Date(item.expected_replacement), "MMM yyyy") : "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(item.notes || "")}</td>
      </tr>
    `).join("");
    win.document.write(`
      <html><head><title>Home Inventory Report</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;text-align:left;padding:8px;border-bottom:2px solid #ddd}h1{margin-bottom:4px}p{color:#666;margin-top:0}</style>
      </head><body>
      <h1>Home Inventory Report</h1>
      <p>Generated ${format(new Date(), "MMMM d, yyyy")}</p>
      <table>
        <thead><tr><th>Item</th><th>Category</th><th>Manufacturer</th><th>Model</th><th>Serial #</th><th>Installed</th><th>Replace By</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>setTimeout(()=>{window.print()},500)</script>
      </body></html>
    `);
    win.document.close();
  };

  // Group items by category
  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const isImageType = (type: string | null) => type?.startsWith("image/");

  return (
    <div className="mt-8 space-y-6">
      {/* Hidden file input for inline uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/heic,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFileSelected}
      />

      {/* Registry not set up banner */}
      {itemType === "home_component" && (!registryCompleted || !homeSystems) && (
        <Card className="border-l-4 border-l-accent bg-accent/5 border-border/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-display text-sm font-semibold">🏠 Set up your home systems first</h4>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Tell us what's in your home to see personalized tracking and savings predictions.
              </p>
              <Button
                size="sm"
                className="mt-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-xs"
                onClick={() => onNavigate?.("properties")}
              >
                Set Up Systems
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" /> {itemType === "personal_item" ? "Personal Items" : "Home Components"}
            </h3>
            <p className="font-body text-sm text-muted-foreground">
              {itemType === "personal_item"
                ? "Track personal belongings for insurance and record-keeping."
                : "Track every component in your home — ages, serial numbers, maintenance dates, and replacements."}
            </p>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="rounded-full font-body text-xs" onClick={isPro ? exportCSV : () => setUpgradeOpen(true)}>
                  {isPro ? <Download className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />} CSV
                </Button>
                <Button size="sm" variant="outline" className="rounded-full font-body text-xs" onClick={isPro ? exportPDF : () => setUpgradeOpen(true)}>
                  {isPro ? <FileText className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />} PDF
                </Button>
              </div>
            )}
            <Dialog open={itemOpen} onOpenChange={(o) => { setItemOpen(o); if (!o) { setEditingItem(null); setItemForm(emptyItemForm); setPendingFiles([]); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body">
                  <Plus className="mr-1 h-4 w-4" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingItem ? "Edit Item" : itemType === "personal_item" ? "Add Personal Item" : "Add Home Component"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); upsertItem.mutate(); }} className="space-y-4">
                  {/* Item Type Selector */}
                  <div className="space-y-2">
                    <Label className="font-body">Item Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["home_component", "personal_item"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-sm font-body font-medium transition-colors ${
                            (itemForm.item_type || itemType) === t
                              ? "border-accent bg-accent/10 text-accent-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-accent/50"
                          }`}
                          onClick={() => setItemForm({ ...itemForm, item_type: t })}
                        >
                          {t === "home_component" ? "Home Component" : "Personal Item"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label className="font-body">Item Name *</Label>
                      <Input placeholder="e.g. Water Heater, Rolex Submariner" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Category</Label>
                      <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                        <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {((itemForm.item_type || itemType) === "personal_item" ? personalItemCategories : homeComponentCategories).map((c) => (
                            <SelectItem key={c.value} value={c.value} className="font-body">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(itemForm.item_type || itemType) === "home_component" && (
                      <div className="space-y-2">
                        <Label className="font-body flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" /> Linked System
                        </Label>
                        <Select value={itemForm.system_key || "none"} onValueChange={(v) => setItemForm({ ...itemForm, system_key: v === "none" ? "" : v })}>
                          <SelectTrigger className="font-body">
                            <SelectValue placeholder="None — not linked to a system" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            <SelectItem value="none" className="font-body text-muted-foreground">None</SelectItem>
                            {(() => {
                              const groups = systemComponentOptions.reduce<Record<string, typeof systemComponentOptions>>((acc, opt) => {
                                if (!acc[opt.group]) acc[opt.group] = [];
                                acc[opt.group].push(opt);
                                return acc;
                              }, {});
                              return Object.entries(groups).map(([group, opts]) => (
                                <div key={group}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground font-body">{group}</div>
                                  {opts.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="font-body pl-4">{opt.label}</SelectItem>
                                  ))}
                                </div>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <p className="font-body text-xs text-muted-foreground">Links this item to your home systems registry for forecast accuracy.</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="font-body">Manufacturer</Label>
                      <Input placeholder="e.g. Rheem, Rolex" value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Model</Label>
                      <Input placeholder="Model number" value={itemForm.model} onChange={(e) => setItemForm({ ...itemForm, model: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Serial Number</Label>
                      <Input placeholder="S/N" value={itemForm.serial_number} onChange={(e) => setItemForm({ ...itemForm, serial_number: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Install / Purchase Date</Label>
                      <Input type="date" value={itemForm.install_date} onChange={(e) => setItemForm({ ...itemForm, install_date: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Last Maintained</Label>
                      <Input type="date" value={itemForm.last_maintained} onChange={(e) => setItemForm({ ...itemForm, last_maintained: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Expected Replacement</Label>
                      <Input type="date" value={itemForm.expected_replacement} onChange={(e) => setItemForm({ ...itemForm, expected_replacement: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Warranty Expiry</Label>
                      <Input type="date" value={itemForm.warranty_expiry} onChange={(e) => setItemForm({ ...itemForm, warranty_expiry: e.target.value })} className="font-body" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Notes</Label>
                    <Textarea placeholder="Additional details, condition notes..." value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} className="font-body" rows={3} />
                  </div>
                  {(itemForm.item_type || itemType) === "personal_item" && (
                    <div className="space-y-2">
                      <Label className="font-body">Estimated Value ($)</Label>
                      <Input type="number" placeholder="e.g. 500" value={itemForm.estimated_value} onChange={(e) => setItemForm({ ...itemForm, estimated_value: e.target.value })} className="font-body" min="0" step="0.01" />
                      <p className="font-body text-xs text-muted-foreground">For insurance documentation purposes.</p>
                    </div>
                  )}
                  {/* ── File Attachments Section ── */}
                  <div className="space-y-2">
                    <Label className="font-body">Photos & Documents</Label>
                    <input
                      ref={dialogFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/heic,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                        fileDragOver
                          ? "border-accent bg-accent/10"
                          : "border-border/50 hover:border-accent/50 hover:bg-accent/5"
                      }`}
                      onClick={() => dialogFileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragOver(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragOver(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFileDragOver(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
                      }}
                    >
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                      <p className="font-body text-xs text-muted-foreground">
                        Click or drag files to add photos, receipts, or documents
                      </p>
                    </div>
                    {pendingFiles.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {pendingFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-body bg-muted/50 rounded-md px-2 py-1.5">
                            {file.type.startsWith("image/") ? (
                              <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive shrink-0"
                              onClick={(e) => { e.stopPropagation(); setPendingFiles((prev) => prev.filter((_, i) => i !== idx)); }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={upsertItem.isPending}>
                    {upsertItem.isPending ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {itemsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <h3 className="font-display text-lg font-semibold mb-1">What's in your home?</h3>
              <p className="font-body text-sm text-muted-foreground mb-4 max-w-sm text-center">
                Adding your roof, HVAC, water heater, and major systems helps HomeLog predict future costs and track warranties.
              </p>
              <div className="flex flex-wrap gap-2 mb-5 justify-center max-w-xs">
                {["Roof", "HVAC System", "Water Heater", "Electrical Panel", "Flooring"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1 font-body text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/50" />
                    {item}
                  </span>
                ))}
              </div>
              <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" onClick={() => setItemOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedItems).map(([cat, catItems]) => {
            const catInfo = itemCategories.find((c) => c.value === cat);
            const CatIcon = catInfo?.icon || Package;
            return (
              <div key={cat}>
                <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                  <CatIcon className="h-4 w-4" /> {catInfo?.label || cat}
                </h4>
                <div className="space-y-2">
                  {(catItems as any[]).map((item) => {
                    const status = getReplacementStatus(item.expected_replacement);
                    const itemAttachments = allAttachments.filter((a: any) => a.home_item_id === item.id);
                    const isExpanded = expandedAttachments === item.id;
                    const freshness = itemType === "home_component" ? getFreshnessIndicator(item.last_updated_at) : null;
                    const completeness = item.data_completeness ?? 0;
                    const completenessRadius = 14;
                    const completenessCircumference = 2 * Math.PI * completenessRadius;
                    const completenessOffset = completenessCircumference - (completeness / 100) * completenessCircumference;
                    return (
                      <Card key={item.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-body text-sm font-semibold">{item.name}</h5>
                                {/* Completeness Badge */}
                                {itemType === "home_component" && (
                                  <div className="relative inline-flex items-center justify-center" title={`${completeness}% complete`}>
                                    <svg width="32" height="32" className="-rotate-90">
                                      <circle cx="16" cy="16" r={completenessRadius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                                      <circle
                                        cx="16" cy="16" r={completenessRadius} fill="none"
                                        stroke="hsl(var(--accent))"
                                        strokeWidth="3"
                                        strokeDasharray={completenessCircumference}
                                        strokeDashoffset={completenessOffset}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="absolute font-body text-[8px] font-bold">{completeness}%</span>
                                  </div>
                                )}
                                {status && (
                                  <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                                    <AlertTriangle className="mr-1 h-3 w-3" />{status.label}
                                  </Badge>
                                )}
                                {item.warranty_expiry && isPast(new Date(item.warranty_expiry)) && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                    Warranty expired
                                  </Badge>
                                )}
                                {itemAttachments.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                    <Paperclip className="mr-1 h-3 w-3" />{itemAttachments.length}
                                  </Badge>
                                )}
                              </div>
                              {/* Freshness Indicator */}
                              {freshness && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <Circle className={`h-2 w-2 ${freshness.fill} ${freshness.color} shrink-0`} />
                                  <span className={`font-body text-[10px] ${freshness.color}`}>{freshness.label}</span>
                                </div>
                              )}
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
                                {item.brand && <span><strong>Manufacturer:</strong> {item.brand}</span>}
                                {item.model && <span><strong>Model:</strong> {item.model}</span>}
                                {item.serial_number && <span><strong>S/N:</strong> {item.serial_number}</span>}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
                                {item.install_date && <span><strong>Installed:</strong> {format(new Date(item.install_date), "MMM yyyy")}</span>}
                                {item.last_maintained && <span><strong>Last maintained:</strong> {format(new Date(item.last_maintained), "MMM d, yyyy")}</span>}
                                {item.expected_replacement && <span><strong>Replace by:</strong> {format(new Date(item.expected_replacement), "MMM yyyy")}</span>}
                                {item.warranty_expiry && (
                                  <span className={isPast(new Date(item.warranty_expiry)) ? "text-destructive/60" : ""}>
                                    <strong>Warranty:</strong> {format(new Date(item.warranty_expiry), "MMM yyyy")}
                                    {isPast(new Date(item.warranty_expiry)) && " (expired)"}
                                  </span>
                                )}
                                {item.estimated_value && <span><strong>Value:</strong> ${Number(item.estimated_value).toLocaleString()}</span>}
                              </div>
                              {item.notes && (
                                <p className="mt-1 font-body text-xs text-muted-foreground italic">{item.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => handleFileUpload(item.id)}
                                disabled={uploadAttachment.isPending && uploadingFor === item.id}
                                title="Upload photo, receipt, or document"
                              >
                                {uploadAttachment.isPending && uploadingFor === item.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Upload className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Attachments row */}
                          {itemAttachments.length > 0 && (
                            <div className="mt-3 border-t border-border/50 pt-3">
                              <button
                                onClick={() => setExpandedAttachments(isExpanded ? null : item.id)}
                                className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" />
                                {itemAttachments.length} attachment{itemAttachments.length !== 1 ? "s" : ""}
                                <span className="ml-1">{isExpanded ? "▾" : "▸"}</span>
                              </button>
                              {isExpanded && (
                                <div className="mt-2 space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {itemAttachments.map((att: any) => (
                                      <AttachmentItem key={att.id} att={att} />
                                    ))}
                                  </div>
                                  <LinkedDocuments
                                    homeItemId={item.id}
                                    propertyId={propertyId}
                                    defaultCategory="inventory_photo"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Maintenance History (home components only) */}
                          {itemType === "home_component" && (
                            <ComponentMaintenanceHistory
                              componentId={item.id}
                              propertyId={propertyId}
                              component={item}
                            />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Skeleton cards for systems needing details — grouped by parent system */}
        {skeletonComponents.length > 0 && (() => {
          // Group by parent system
          const grouped: Record<string, typeof skeletonComponents> = {};
          for (const comp of skeletonComponents) {
            if (!grouped[comp.systemKey]) grouped[comp.systemKey] = [];
            grouped[comp.systemKey].push(comp);
          }
          const systemOrder = SYSTEMS_CATALOG.map((s) => s.key);

          return (
            <div className="mt-6">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Systems Needing Details
              </h4>
              {registryCompleted && items.length > 0 && items.every((i: any) => (i as any).is_registry_skeleton && i.data_completeness === 0) && (
                <p className="font-body text-sm text-muted-foreground mb-4">
                  Your home has systems tracked. Add details to personalize your savings forecast — start with the highest-impact items below.
                </p>
              )}
              <div className="space-y-5">
                {systemOrder.filter((sk) => grouped[sk]).map((sysKey) => {
                  const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey)!;
                  const comps = grouped[sysKey];

                  return (
                    <div key={sysKey}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{sys.icon}</span>
                        <span className="font-body text-xs font-medium text-muted-foreground">{sys.label}</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {comps.map((comp) => {
                          const compKey = `${comp.systemKey}:${comp.key}`;
                          const skeletonItem = items.find((i: any) => (i as any).system_key === compKey);
                          const completenessRadius = 14;

                          return (
                            <Card key={compKey} className="border-2 border-dashed border-border/50">
                              <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                                <h5 className="font-body text-sm font-semibold">{comp.label}</h5>
                                <div className="relative inline-flex items-center justify-center" title="0% complete">
                                  <svg width="32" height="32" className="-rotate-90">
                                    <circle cx="16" cy="16" r={completenessRadius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                                  </svg>
                                  <span className="absolute font-body text-[8px] font-bold">0%</span>
                                </div>
                                <p className="font-body text-xs text-muted-foreground">
                                  Personalizes ${comp.annualCost}/yr in predictions
                                </p>
                                <Button
                                  size="sm"
                                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-xs"
                                  onClick={() => {
                                    if (skeletonItem) {
                                      openEditItem(skeletonItem);
                                    } else {
                                      const category = ({"roofing":"roofing","hvac":"hvac","plumbing":"plumbing","electrical":"electrical","exterior":"exterior","interior":"structural","appliances":"appliance","bathrooms":"plumbing","foundation":"structural","outdoor":"exterior","specialty":"general"} as Record<string,string>)[sysKey] || "general";
                                      setEditingItem(null);
                                      setItemForm({
                                        ...emptyItemForm,
                                        category,
                                        name: comp.label,
                                        item_type: "home_component",
                                      });
                                      setItemOpen(true);
                                    }
                                  }}
                                >
                                  Add Details
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

export default HomeInventory;
