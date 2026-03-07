import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Star, FileText, Upload, Wrench, User, Package } from "lucide-react";
import { CATEGORY_LABELS } from "./constants";

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

const SourceIcon = ({ source }: { source: string }) => {
  const cls = "h-3 w-3 text-muted-foreground";
  switch (source) {
    case "maintenance": return <Wrench className={cls} />;
    case "contractor": return <User className={cls} />;
    case "inventory": return <Package className={cls} />;
    default: return <Upload className={`${cls} opacity-50`} />;
  }
};

const GridCard = ({ doc, onClick }: { doc: any; onClick: () => void }) => {
  const isImage = doc.file_type?.startsWith("image/");
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage && doc.file_path) {
      supabase.storage
        .from(getStorageBucket(doc))
        .createSignedUrl(doc.file_path, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setThumbUrl(data.signedUrl);
        });
    }
  }, [doc.file_path, isImage]);

  const source = getSource(doc);
  const date = doc.document_date || doc.uploaded_at || doc.created_at;

  return (
    <div
      className="group relative cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-card-hover hover:border-accent/30"
      onClick={onClick}
    >
      <div className="bg-secondary flex items-center justify-center h-32">
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt={doc.title || doc.file_name} className="h-full w-full object-cover" />
        ) : doc.file_type === "application/pdf" ? (
          <FileText className="h-10 w-10 text-red-400" />
        ) : (
          <FileText className="h-10 w-10 text-muted-foreground" />
        )}
      </div>

      {doc.is_important && (
        <div className="absolute top-2 right-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        </div>
      )}

      <div className="p-3">
        <p className="font-body text-xs font-medium line-clamp-2 mb-1.5">
          {doc.title || doc.file_name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {CATEGORY_LABELS[doc.category] || doc.category}
          </Badge>
          <SourceIcon source={source} />
          {date && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const DocumentGrid = ({ docs, onSelect }: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {docs.map((doc: any) => (
        <GridCard key={doc.id} doc={doc} onClick={() => onSelect(doc.id)} />
      ))}
    </div>
  );
};

export default DocumentGrid;
