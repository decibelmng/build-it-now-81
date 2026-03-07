import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { CATEGORY_LABELS } from "./constants";
import DocumentDetail from "./DocumentDetail";
import DocumentUploadDialog from "./DocumentUploadDialog";

interface LinkedDocumentsProps {
  /** Filter key — provide exactly one */
  maintenanceLogId?: string;
  homeItemId?: string;
  contractorSubmissionId?: string;
  contactId?: string;
  /** Required for upload dialog */
  propertyId: string;
  propertyName?: string;
  userId?: string;
  /** Default category for new uploads */
  defaultCategory?: string;
  /** Navigate to Documents hub with filter */
  onViewAll?: () => void;
}

function getStorageBucket(doc: any): string {
  if (doc.maintenance_log_id) return "maintenance-photos";
  if (doc.contractor_submission_id) return "contractor-uploads";
  if (doc.home_item_id) return "home-item-attachments";
  return "property-documents";
}

const Thumb = ({ doc, onClick }: { doc: any; onClick: () => void }) => {
  const isImage = doc.file_type?.startsWith("image/");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage && doc.file_path) {
      supabase.storage
        .from(getStorageBucket(doc))
        .createSignedUrl(doc.file_path, 3600)
        .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl); });
    }
  }, [doc.file_path, isImage]);

  return (
    <div
      className="shrink-0 w-20 cursor-pointer rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-accent/40 hover:shadow-sm"
      onClick={onClick}
    >
      <div className="h-14 bg-secondary flex items-center justify-center">
        {isImage && url ? (
          <img src={url} alt={doc.title || doc.file_name} className="h-full w-full object-cover" />
        ) : doc.file_type === "application/pdf" ? (
          <FileText className="h-5 w-5 text-red-400" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="px-1.5 py-1">
        <p className="font-body text-[9px] font-medium line-clamp-1">{doc.title || doc.file_name}</p>
        <Badge variant="secondary" className="text-[8px] px-1 py-0 mt-0.5">
          {CATEGORY_LABELS[doc.category] || doc.category}
        </Badge>
      </div>
    </div>
  );
};

const LinkedDocuments = ({
  maintenanceLogId,
  homeItemId,
  contractorSubmissionId,
  contactId,
  propertyId,
  propertyName,
  userId,
  defaultCategory = "other",
  onViewAll,
}: LinkedDocumentsProps) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filterKey = maintenanceLogId
    ? "maintenance_log_id"
    : homeItemId
    ? "home_item_id"
    : contractorSubmissionId
    ? "contractor_submission_id"
    : "contact_id";

  const filterValue = maintenanceLogId || homeItemId || contractorSubmissionId || contactId;

  const { data: docs = [], refetch } = useQuery({
    queryKey: ["linked_documents", filterKey, filterValue],
    queryFn: async () => {
      if (!filterValue) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*, maintenance_logs(title, scheduled_date), contractor_submissions(contractor_company_name, service_category), home_items(name), home_contacts(name, company)")
        .eq(filterKey, filterValue)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!filterValue,
  });

  const selectedDoc = docs.find((d: any) => d.id === selectedDocId) || null;

  if (docs.length === 0 && !maintenanceLogId && !homeItemId) return null;

  const label = contactId ? "Documents" : "Documents";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs font-medium text-muted-foreground">
          {label} ({docs.length})
        </p>
        <div className="flex items-center gap-1">
          {onViewAll && docs.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-body" onClick={onViewAll}>
              View All <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          )}
          {(maintenanceLogId || homeItemId) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] font-body"
              onClick={() => setUploadOpen(true)}
            >
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          )}
        </div>
      </div>

      {docs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {docs.map((doc: any) => (
            <Thumb key={doc.id} doc={doc} onClick={() => setSelectedDocId(doc.id)} />
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <p className="font-body text-[10px] text-muted-foreground/60 italic">No documents attached</p>
      )}

      <DocumentDetail
        doc={selectedDoc}
        open={!!selectedDocId}
        onClose={() => setSelectedDocId(null)}
        onUpdated={() => refetch()}
      />

      {uploadOpen && (
        <DocumentUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          properties={[{ id: propertyId, name: propertyName || "Property" }]}
          onComplete={() => { refetch(); setUploadOpen(false); }}
          defaultLinkKey={filterKey === "maintenance_log_id" ? "maintenance_log_id" : filterKey === "home_item_id" ? "home_item_id" : undefined}
          defaultLinkValue={filterValue}
          defaultCategory={defaultCategory}
        />
      )}
    </div>
  );
};

export default LinkedDocuments;
