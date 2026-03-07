import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, FileText, Upload, Wrench, User, Package, MoreHorizontal, Download, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS } from "./constants";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  docs: any[];
  onSelect: (id: string) => void;
}

function getStorageBucket(doc: any): string {
  if (doc.maintenance_log_id) return "maintenance-photos";
  if (doc.contractor_submission_id) return "contractor-uploads";
  if (doc.home_item_id) return "home-item-attachments";
  return "property-documents";
}

function getSource(doc: any): string {
  if (doc.maintenance_log_id) return "maintenance";
  if (doc.contractor_submission_id) return "contractor";
  if (doc.home_item_id) return "inventory";
  return "direct";
}

function getLinkedName(doc: any): string {
  if (doc.maintenance_logs) return doc.maintenance_logs.title;
  if (doc.contractor_submissions) return doc.contractor_submissions.contractor_company_name;
  if (doc.home_items) return doc.home_items.name;
  return "—";
}

const sourceLabels: Record<string, string> = {
  maintenance: "Maintenance",
  contractor: "Contractor",
  inventory: "Inventory",
  direct: "Upload",
};

const SourceIcon = ({ source }: { source: string }) => {
  const cls = "h-3 w-3";
  switch (source) {
    case "maintenance": return <Wrench className={cls} />;
    case "contractor": return <User className={cls} />;
    case "inventory": return <Package className={cls} />;
    default: return <Upload className={cls} />;
  }
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const DocumentList = ({ docs, onSelect }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from(getStorageBucket(doc)).remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents_hub"] });
      queryClient.invalidateQueries({ queryKey: ["documents_important"] });
      toast({ title: "Document deleted" });
    },
  });

  const downloadDoc = async (doc: any) => {
    const { data, error } = await supabase.storage.from(getStorageBucket(doc)).download(doc.file_path);
    if (error || !data) { toast({ title: "Download failed", variant: "destructive" }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = doc.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left font-body font-medium text-muted-foreground px-4 py-2.5 text-xs">Title</th>
              <th className="text-left font-body font-medium text-muted-foreground px-3 py-2.5 text-xs hidden sm:table-cell">Category</th>
              <th className="text-left font-body font-medium text-muted-foreground px-3 py-2.5 text-xs hidden md:table-cell">Source</th>
              <th className="text-left font-body font-medium text-muted-foreground px-3 py-2.5 text-xs hidden lg:table-cell">Linked To</th>
              <th className="text-left font-body font-medium text-muted-foreground px-3 py-2.5 text-xs hidden sm:table-cell">Date</th>
              <th className="text-left font-body font-medium text-muted-foreground px-3 py-2.5 text-xs hidden lg:table-cell">Size</th>
              <th className="px-3 py-2.5 w-10"></th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc: any) => {
              const source = getSource(doc);
              const date = doc.document_date || doc.uploaded_at || doc.created_at;
              const isImage = doc.file_type?.startsWith("image/");
              return (
                <tr
                  key={doc.id}
                  className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => onSelect(doc.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        {isImage ? (
                          <FileText className="h-4 w-4 text-blue-400" />
                        ) : doc.file_type === "application/pdf" ? (
                          <FileText className="h-4 w-4 text-red-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-body text-xs font-medium truncate max-w-[200px]">
                        {doc.title || doc.file_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <SourceIcon source={source} />
                      {sourceLabels[source]}
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="font-body text-xs text-muted-foreground truncate max-w-[150px] block">
                      {getLinkedName(doc)}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="font-body text-xs text-muted-foreground">
                      {date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span className="font-body text-xs text-muted-foreground">
                      {formatSize(doc.file_size)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle important handled in detail view
                      }}
                    >
                      <Star
                        className={`h-4 w-4 ${doc.is_important ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-400"}`}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}>
                          <Download className="mr-2 h-3.5 w-3.5" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteMut.mutate(doc); }}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentList;
