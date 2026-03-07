import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Star, Download, Trash2, FileText, Wrench, User, Package, Upload, X, ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_LABELS, CATEGORY_GROUPS, DISPLAY_TYPES } from "./constants";

interface Props {
  doc: any | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function getStorageBucket(doc: any): string {
  if (doc.maintenance_log_id) return "maintenance-photos";
  if (doc.contractor_submission_id) return "contractor-uploads";
  if (doc.home_item_id) return "home-item-attachments";
  return "property-documents";
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const allCategories = Object.values(CATEGORY_GROUPS).flatMap((g) => g.categories);

const DocumentDetail = ({ doc, open, onClose, onUpdated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDisplayType, setEditDisplayType] = useState("");
  const [editDocDate, setEditDocDate] = useState("");
  const [editTags, setEditTags] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Load preview URL
  useEffect(() => {
    if (!doc) return;
    setEditTitle(doc.title || doc.file_name || "");
    setEditDesc(doc.description || "");
    setEditCategory(doc.category || "other");
    setEditDisplayType(doc.display_type || "other");
    setEditDocDate(doc.document_date || "");
    setEditTags(doc.tags?.join(", ") || "");

    const bucket = getStorageBucket(doc);
    supabase.storage
      .from(bucket)
      .createSignedUrl(doc.file_path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setPreviewUrl(data.signedUrl);
      });

    return () => {
      setPreviewUrl(null);
    };
  }, [doc?.id]);

  const updateDoc = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("documents").update(updates).eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onUpdated();
      toast({ title: "Document updated" });
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async () => {
      const bucket = getStorageBucket(doc);
      await supabase.storage.from(bucket).remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents_hub"] });
      queryClient.invalidateQueries({ queryKey: ["documents_important"] });
      toast({ title: "Document deleted" });
      setDeleteOpen(false);
      onClose();
    },
  });

  const downloadDoc = async () => {
    if (!doc) return;
    const bucket = getStorageBucket(doc);
    const { data, error } = await supabase.storage.from(bucket).download(doc.file_path);
    if (error || !data) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    updateDoc.mutate({
      title: editTitle,
      name: editTitle,
      description: editDesc || null,
      category: editCategory,
      display_type: editDisplayType,
      document_date: editDocDate || null,
      tags: editTags ? editTags.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
    });
  };

  const toggleImportant = () => {
    updateDoc.mutate({ is_important: !doc.is_important });
  };

  if (!doc) return null;

  const isImage = doc.file_type?.startsWith("image/");
  const isPdf = doc.file_type === "application/pdf";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="font-display text-lg flex-1 pr-4">
                {doc.title || doc.file_name}
              </SheetTitle>
              <button onClick={toggleImportant} className="shrink-0 mt-1">
                <Star
                  className={`h-5 w-5 ${
                    doc.is_important
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground hover:text-yellow-400"
                  }`}
                />
              </button>
            </div>
          </SheetHeader>

          {/* Preview */}
          <div className="px-6 mt-4">
            <div className="rounded-xl border border-border bg-secondary overflow-hidden">
              {isImage && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={doc.title || doc.file_name}
                  className="w-full max-h-[400px] object-contain"
                />
              ) : isPdf && previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[400px]"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="font-body text-sm text-muted-foreground">
                    Preview not available
                  </p>
                  <Button
                    variant="link"
                    onClick={downloadDoc}
                    className="mt-1 font-body text-sm"
                  >
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="px-6 py-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-body text-xs text-muted-foreground">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="font-body"
                onBlur={handleSave}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Add description..."
                className="font-body"
                rows={2}
                onBlur={handleSave}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body text-xs text-muted-foreground">Category</Label>
                <Select
                  value={editCategory}
                  onValueChange={(v) => {
                    setEditCategory(v);
                    updateDoc.mutate({ category: v });
                  }}
                >
                  <SelectTrigger className="font-body text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(CATEGORY_GROUPS).map(([, group]) => (
                      <div key={group.label}>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </div>
                        {group.categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="font-body text-xs">
                            {CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-body text-xs text-muted-foreground">Display Type</Label>
                <Select
                  value={editDisplayType}
                  onValueChange={(v) => {
                    setEditDisplayType(v);
                    updateDoc.mutate({ display_type: v });
                  }}
                >
                  <SelectTrigger className="font-body text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value} className="font-body text-xs">
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body text-xs text-muted-foreground">Document Date</Label>
                <Input
                  type="date"
                  value={editDocDate}
                  onChange={(e) => setEditDocDate(e.target.value)}
                  className="font-body text-xs"
                  onBlur={handleSave}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs text-muted-foreground">Tags</Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="tag1, tag2..."
                  className="font-body text-xs"
                  onBlur={handleSave}
                />
              </div>
            </div>

            {/* Read-only metadata */}
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 space-y-2">
              <div className="flex justify-between text-xs font-body">
                <span className="text-muted-foreground">Uploaded</span>
                <span>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
              </div>
              <div className="flex justify-between text-xs font-body">
                <span className="text-muted-foreground">File Size</span>
                <span>{formatSize(doc.file_size)}</span>
              </div>
              <div className="flex justify-between text-xs font-body">
                <span className="text-muted-foreground">File Type</span>
                <span>{doc.file_type || "—"}</span>
              </div>
            </div>

            {/* Source Links */}
            <div className="space-y-2">
              <Label className="font-body text-xs text-muted-foreground">Source</Label>
              <div className="space-y-1.5">
                {doc.maintenance_log_id && doc.maintenance_logs && (
                  <div className="flex items-center gap-2 text-xs font-body text-accent">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>From maintenance log: {doc.maintenance_logs.title}</span>
                  </div>
                )}
                {doc.contractor_submission_id && doc.contractor_submissions && (
                  <div className="flex items-center gap-2 text-xs font-body text-accent">
                    <User className="h-3.5 w-3.5" />
                    <span>Submitted by contractor: {doc.contractor_submissions.contractor_company_name}</span>
                  </div>
                )}
                {doc.home_item_id && doc.home_items && (
                  <div className="flex items-center gap-2 text-xs font-body text-accent">
                    <Package className="h-3.5 w-3.5" />
                    <span>Attached to: {doc.home_items.name}</span>
                  </div>
                )}
                {doc.contact_id && doc.home_contacts && (
                  <div className="flex items-center gap-2 text-xs font-body text-accent">
                    <User className="h-3.5 w-3.5" />
                    <span>Contractor: {doc.home_contacts.name}{doc.home_contacts.company ? ` · ${doc.home_contacts.company}` : ""}</span>
                  </div>
                )}
                {!doc.maintenance_log_id && !doc.contractor_submission_id && !doc.home_item_id && (
                  <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Direct upload</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 font-body"
                onClick={downloadDoc}
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button
                variant="destructive"
                className="font-body"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Document</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-muted-foreground">
            This will permanently remove this document. Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="font-body">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDoc.mutate()}
              disabled={deleteDoc.isPending}
              className="font-body"
            >
              {deleteDoc.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentDetail;
