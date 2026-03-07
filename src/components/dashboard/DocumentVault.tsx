import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Upload, Trash2, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;
type Property = Tables<"properties">;

const docCategories = [
  { value: "deed", label: "Deed / Title" },
  { value: "insurance", label: "Insurance" },
  { value: "inspection", label: "Inspection Report" },
  { value: "warranty", label: "Warranty" },
  { value: "receipt", label: "Receipt" },
  { value: "permit", label: "Permit" },
  { value: "other", label: "Other" },
];

const previewableTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "application/pdf"];

const DocumentVault = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [form, setForm] = useState({ name: "", property_id: "", category: "other" });
  const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string; name: string } | null>(null);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadDoc = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error("Missing file");
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        property_id: form.property_id,
        name: form.name || file.name,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category: form.category,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
      setFile(null);
      setForm({ name: "", property_id: "", category: "other" });
      toast({ title: "Document uploaded!" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async (doc: Document) => {
      await supabase.storage.from("documents").remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const downloadDoc = async (doc: Document) => {
    const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
    if (error || !data) { toast({ title: "Download failed", variant: "destructive" }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = doc.name; a.click();
    URL.revokeObjectURL(url);
  };

  const openPreview = async (doc: any) => {
    if (!doc.file_type || !previewableTypes.includes(doc.file_type)) {
      toast({ title: "Preview not available", description: "This file type cannot be previewed. Try downloading instead." });
      return;
    }
    const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
    if (error || !data) { toast({ title: "Preview failed", variant: "destructive" }); return; }
    const url = URL.createObjectURL(data);
    setPreviewDoc({ url, type: doc.file_type, name: doc.name });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isPreviewable = (fileType: string | null) => fileType && previewableTypes.includes(fileType);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Document Vault</h2>
          <p className="font-body text-sm text-muted-foreground">Store deeds, insurance, warranties, and more</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0}>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Upload Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); uploadDoc.mutate(); }} className="space-y-4">
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
                <Label className="font-body">File *</Label>
                <div
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    fileDragOver ? "border-accent bg-accent/10" : "border-border/50 hover:border-accent/40"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setFileDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFileDragOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                >
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="font-body text-sm text-muted-foreground">
                    {file ? file.name : fileDragOver ? "Drop file here" : "Click or drag a file here"}
                  </p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">Document Name</Label>
                  <Input placeholder="Optional name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {docCategories.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="font-body">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={uploadDoc.isPending || !file || !form.property_id}>
                {uploadDoc.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => { if (previewDoc) { URL.revokeObjectURL(previewDoc.url); setPreviewDoc(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-base">{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          {previewDoc?.type === "application/pdf" ? (
            <iframe src={previewDoc.url} className="w-full h-[70vh] rounded-lg border border-border" />
          ) : previewDoc?.type?.startsWith("image/") ? (
            <img src={previewDoc.url} alt={previewDoc.name} className="w-full max-h-[70vh] rounded-lg object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add a property first to start uploading documents</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-14 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No documents yet</h3>
            <p className="font-body text-sm text-muted-foreground">Upload your first document to the vault</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">{doc.name}</h4>
                    <p className="font-body text-xs text-muted-foreground">
                      {doc.properties?.name} · {formatSize(doc.file_size)} · {format(new Date(doc.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-body text-xs">
                    {docCategories.find((c) => c.value === doc.category)?.label ?? doc.category}
                  </Badge>
                  {isPreviewable(doc.file_type) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPreview(doc)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadDoc(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteDoc.mutate(doc)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentVault;
