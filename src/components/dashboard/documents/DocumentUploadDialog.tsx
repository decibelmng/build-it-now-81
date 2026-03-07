import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_GROUPS, CATEGORY_LABELS } from "./constants";
import { UNIVERSAL_FILE_ACCEPT, isImageFile, fileTypeLabel } from "@/lib/fileUploadConstants";
import FilePicker from "@/components/ui/file-picker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  properties: { id: string; name: string }[];
  onComplete: () => void;
  defaultLinkKey?: "maintenance_log_id" | "home_item_id";
  defaultLinkValue?: string;
  defaultCategory?: string;
}

const DocumentUploadDialog = ({ open, onOpenChange, properties, onComplete, defaultLinkKey, defaultLinkValue, defaultCategory }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    property_id: properties.length === 1 ? properties[0]?.id || "" : "",
    category: defaultCategory || "other",
    title: "",
    description: "",
    document_date: "",
    tags: "",
    maintenance_log_id: defaultLinkKey === "maintenance_log_id" ? (defaultLinkValue || "") : "",
    home_item_id: defaultLinkKey === "home_item_id" ? (defaultLinkValue || "") : "",
    contact_id: "",
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Maintenance logs for linking
  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ["maintenance_for_upload", user?.id, form.property_id],
    queryFn: async () => {
      let q = supabase
        .from("maintenance_logs")
        .select("id, title, scheduled_date")
        .order("created_at", { ascending: false })
        .limit(50);
      if (form.property_id) q = q.eq("property_id", form.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id,
  });

  // Inventory items for linking
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory_for_upload", user?.id, form.property_id],
    queryFn: async () => {
      let q = supabase
        .from("home_items")
        .select("id, name")
        .order("name")
        .limit(100);
      if (form.property_id) q = q.eq("property_id", form.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id,
  });

  // Contacts for linking
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts_for_upload", user?.id, form.property_id],
    queryFn: async () => {
      let q = supabase
        .from("home_contacts")
        .select("id, name, company")
        .order("name")
        .limit(100);
      if (form.property_id) q = q.eq("property_id", form.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!form.property_id,
  });

  const handleUpload = async () => {
    if (!user || files.length === 0 || !form.property_id) return;
    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${user.id}/${form.property_id}/${Date.now()}_${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("property-documents")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        // Create document record
        const title = form.title || (files.length === 1 ? file.name.replace(/\.[^/.]+$/, "") : file.name.replace(/\.[^/.]+$/, ""));
        const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null;

        const { error: insertError } = await supabase.from("documents").insert({
          user_id: user.id,
          property_id: form.property_id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          name: title,
          title,
          description: form.description || null,
          category: form.category,
          display_type: isImageFile(file) ? "photo" : file.type === "application/pdf" ? "receipt" : "other",
          document_date: form.document_date || null,
          tags,
          maintenance_log_id: form.maintenance_log_id || null,
          home_item_id: form.home_item_id || null,
          contact_id: form.contact_id || null,
        });
        if (insertError) throw insertError;

        setProgress(((i + 1) / files.length) * 100);
      }

      toast({ title: `${files.length} document${files.length > 1 ? "s" : ""} uploaded!` });
      setFiles([]);
      setForm({
        property_id: properties.length === 1 ? properties[0]?.id || "" : "",
        category: "other",
        title: "",
        description: "",
        document_date: "",
        tags: "",
        maintenance_log_id: "",
        home_item_id: "",
        contact_id: "",
      });
      onComplete();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property */}
          {properties.length > 1 && (
            <div className="space-y-2">
              <Label className="font-body">Property *</Label>
              <Select
                value={form.property_id}
                onValueChange={(v) => setForm({ ...form, property_id: v })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-body">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File Picker */}
          <div className="space-y-2">
            <Label className="font-body">Files *</Label>
            <FilePicker
              files={files}
              onChange={setFiles}
              maxFiles={20}
              label="Drop files here or click to browse"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="font-body">Category *</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger className="font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {Object.entries(CATEGORY_GROUPS).map(([, group]) => (
                  <div key={group.label}>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="font-body text-sm">
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Auto from filename"
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Document Date</Label>
              <Input
                type="date"
                value={form.document_date}
                onChange={(e) => setForm({ ...form, document_date: e.target.value })}
                className="font-body"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-body">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              className="font-body"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-body">Tags</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="tag1, tag2, tag3"
              className="font-body"
            />
          </div>

          {/* Optional Linking */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="font-body text-xs text-muted-foreground font-medium">
              Link to (optional)
            </p>
            <div className="grid grid-cols-1 gap-2">
              {maintenanceLogs.length > 0 && (
                <Select
                  value={form.maintenance_log_id || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, maintenance_log_id: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="font-body text-xs h-9">
                    <SelectValue placeholder="Link to maintenance entry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-body text-xs">
                      No maintenance link
                    </SelectItem>
                    {maintenanceLogs.map((log: any) => (
                      <SelectItem key={log.id} value={log.id} className="font-body text-xs">
                        {log.title}
                        {log.scheduled_date
                          ? ` — ${new Date(log.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {inventoryItems.length > 0 && (
                <Select
                  value={form.home_item_id || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, home_item_id: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="font-body text-xs h-9">
                    <SelectValue placeholder="Link to inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-body text-xs">
                      No inventory link
                    </SelectItem>
                    {inventoryItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.id} className="font-body text-xs">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {contacts.length > 0 && (
                <Select
                  value={form.contact_id || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, contact_id: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="font-body text-xs h-9">
                    <SelectValue placeholder="Link to contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-body text-xs">
                      No contractor link
                    </SelectItem>
                    {contacts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="font-body text-xs">
                        {c.name}{c.company ? ` · ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="font-body text-xs text-muted-foreground text-center">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !form.property_id}
            className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
          >
            {uploading
              ? "Uploading..."
              : `Upload ${files.length} File${files.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadDialog;
