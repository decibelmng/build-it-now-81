import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, LayoutGrid, List, Star, GroupIcon, Wrench, User, Package, Wind } from "lucide-react";
import { SYSTEMS_CATALOG } from "@/lib/homeSystemsRegistry";
import DocumentFilters from "./DocumentFilters";
import DocumentGrid from "./DocumentGrid";
import DocumentList from "./DocumentList";
import DocumentDetail from "./DocumentDetail";
import DocumentUploadDialog from "./DocumentUploadDialog";
import {
  type DocumentFilters as Filters,
  DEFAULT_FILTERS,
  getActiveFilterCount,
  CATEGORY_GROUPS, CATEGORY_LABELS,
} from "./constants";
import { useCanEditAnyProperty } from "@/hooks/useAccessRole";

const PAGE_SIZE = 24;

const DocumentsHub = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canEditAny = useCanEditAnyProperty();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [groupMode, setGroupMode] = useState<"none" | "category" | "system">("none");
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Fetch properties for the property selector
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedPropertyId = properties.length > 0 ? properties[0].id : null;

  // Build query with server-side filters
  const buildQuery = useCallback(
    (forImportant = false) => {
      let q = supabase
        .from("documents")
        .select(
          "*, properties!documents_property_id_fkey(name), maintenance_logs(title, scheduled_date), contractor_submissions(contractor_company_name, service_category), home_items(name), home_contacts(name, company)",
          { count: "exact" }
        );

      if (forImportant) {
        q = q.eq("is_important", true);
      } else {
        // Apply filters
        if (filters.search) {
          q = q.or(
            `file_name.ilike.%${filters.search}%,title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
          );
        }

        if (filters.category !== "all") {
          q = q.eq("category", filters.category);
        } else if (filters.categoryGroup !== "all") {
          const group = CATEGORY_GROUPS[filters.categoryGroup];
          if (group) q = q.in("category", group.categories);
        }

        if (filters.source !== "all") {
          switch (filters.source) {
            case "direct":
              q = q
                .is("maintenance_log_id", null)
                .is("contractor_submission_id", null)
                .is("home_item_id", null);
              break;
            case "maintenance":
              q = q.not("maintenance_log_id", "is", null);
              break;
            case "contractor":
              q = q.not("contractor_submission_id", "is", null);
              break;
            case "inventory":
              q = q.not("home_item_id", "is", null);
              break;
          }
        }

        if (filters.fileType !== "all") {
          switch (filters.fileType) {
            case "photo":
              q = q.ilike("file_type", "image/%");
              break;
            case "pdf":
              q = q.eq("file_type", "application/pdf");
              break;
            case "doc":
              q = q.or(
                "file_type.eq.application/msword,file_type.eq.application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              );
              break;
          }
        }

        if (filters.contactId !== "all") {
          q = q.eq("contact_id", filters.contactId);
        }

        if (filters.systemKey !== "all") {
          q = q.eq("system_key", filters.systemKey);
        }

        const dateCol = filters.dateField;
        if (filters.dateFrom) q = q.gte(dateCol, filters.dateFrom);
        if (filters.dateTo) q = q.lte(dateCol, filters.dateTo);
      }

      return q.order("created_at", { ascending: false });
    },
    [filters]
  );

  // Important documents (always shown)
  const { data: importantDocs = [] } = useQuery({
    queryKey: ["documents_important", user?.id],
    queryFn: async () => {
      const { data, error } = await buildQuery(true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Main documents query with pagination
  const { data: docsResult, isLoading } = useQuery({
    queryKey: ["documents_hub", user?.id, filters, page],
    queryFn: async () => {
      const q = buildQuery(false)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await q;
      console.log("[DocumentsHub] query result:", { dataLen: data?.length, count, error, filters });
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user,
  });

  const documents = docsResult?.data || [];
  const totalCount = docsResult?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Contacts for filter dropdown
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts_for_filter", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_contacts")
        .select("id, name, company")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedDoc = selectedDocId
    ? [...importantDocs, ...documents].find((d: any) => d.id === selectedDocId) || null
    : null;

  const activeFilterCount = getActiveFilterCount(filters);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(0);
  };

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["documents_hub"] });
    queryClient.invalidateQueries({ queryKey: ["documents_important"] });
    setUploadOpen(false);
  };

  const handleDocumentUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["documents_hub"] });
    queryClient.invalidateQueries({ queryKey: ["documents_important"] });
  };

  // Group documents by category group
  const groupedDocuments = groupMode === "category"
    ? Object.entries(CATEGORY_GROUPS).reduce(
        (acc, [key, group]) => {
          const groupDocs = documents.filter((d: any) =>
            group.categories.includes(d.category)
          );
          if (groupDocs.length > 0) acc[key] = { label: group.label, docs: groupDocs };
          return acc;
        },
        {} as Record<string, { label: string; docs: any[] }>
      )
    : null;

  // Group documents by system
  const systemGroupedDocuments = groupMode === "system"
    ? (() => {
        const groups: Record<string, { label: string; icon: string; docs: any[] }> = {};
        const unlinked: any[] = [];
        for (const doc of documents) {
          const sysKey = (doc as any).system_key;
          if (!sysKey) { unlinked.push(doc); continue; }
          const sys = SYSTEMS_CATALOG.find((s) => s.key === sysKey);
          if (!groups[sysKey]) {
            groups[sysKey] = { label: sys?.label || sysKey, icon: sys?.icon || "📄", docs: [] };
          }
          groups[sysKey].docs.push(doc);
        }
        if (unlinked.length > 0) groups["__unlinked__"] = { label: "Unlinked", icon: "📦", docs: unlinked };
        return groups;
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Documents
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            All property files in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border">
            <Button
              variant={groupMode === "none" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 px-2 text-xs rounded-r-none"
              onClick={() => setGroupMode("none")}
            >
              All
            </Button>
            <Button
              variant={groupMode === "category" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 px-2 text-xs rounded-none border-x border-border"
              onClick={() => setGroupMode(groupMode === "category" ? "none" : "category")}
            >
              Category
            </Button>
            <Button
              variant={groupMode === "system" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 px-2 text-xs rounded-l-none"
              onClick={() => setGroupMode(groupMode === "system" ? "none" : "system")}
            >
              System
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {}}
            title="Group options"
          >
            <GroupIcon className="h-4 w-4 opacity-0" />
          </Button>
          <div className="flex rounded-lg border border-border">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {/* Important Documents */}
      {importantDocs.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> Important Documents
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {importantDocs.map((doc: any) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onClick={() => setSelectedDocId(doc.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <DocumentFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        activeCount={activeFilterCount}
        contacts={contacts}
      />

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : documents.length === 0 && activeFilterCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-secondary p-6 mb-4">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1">Your home's filing cabinet</h3>
          <p className="font-body text-sm text-muted-foreground max-w-md mb-5">
            Upload receipts, warranties, manuals, and inspection reports. They'll be automatically organized and linked to the right items.
          </p>
          <div className="flex flex-wrap gap-2 mb-5 justify-center max-w-sm">
            {["Receipts", "Warranties", "Manuals", "Inspection Reports", "Closing Documents"].map((doc) => (
              <span key={doc} className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1 font-body text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {doc}
              </span>
            ))}
          </div>
          <Button
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload Your First Document
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-body text-sm text-muted-foreground">
            No documents match your filters.
          </p>
          <Button variant="link" onClick={handleClearFilters} className="mt-1 font-body text-sm">
            Clear all filters
          </Button>
        </div>
      ) : groupMode === "category" && groupedDocuments ? (
        Object.entries(groupedDocuments).map(([key, group]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold">{group.label}</h3>
              <Badge variant="secondary" className="text-xs">{group.docs.length}</Badge>
            </div>
            {view === "grid" ? (
              <DocumentGrid docs={group.docs} onSelect={setSelectedDocId} />
            ) : (
              <DocumentList docs={group.docs} onSelect={setSelectedDocId} />
            )}
          </div>
        ))
      ) : groupMode === "system" && systemGroupedDocuments ? (
        Object.entries(systemGroupedDocuments).map(([key, group]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold">{group.icon} {group.label}</h3>
              <Badge variant="secondary" className="text-xs">{group.docs.length}</Badge>
            </div>
            {view === "grid" ? (
              <DocumentGrid docs={group.docs} onSelect={setSelectedDocId} />
            ) : (
              <DocumentList docs={group.docs} onSelect={setSelectedDocId} />
            )}
          </div>
        ))
      ) : view === "grid" ? (
        <DocumentGrid docs={documents} onSelect={setSelectedDocId} />
      ) : (
        <DocumentList docs={documents} onSelect={setSelectedDocId} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="font-body text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Detail Panel */}
      <DocumentDetail
        doc={selectedDoc}
        open={!!selectedDocId}
        onClose={() => setSelectedDocId(null)}
        onUpdated={handleDocumentUpdated}
      />

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        properties={properties}
        onComplete={handleUploadComplete}
      />
    </div>
  );
};

// Small card for important docs row + grid view
export const DocumentCard = ({
  doc,
  onClick,
  compact = false,
}: {
  doc: any;
  onClick: () => void;
  compact?: boolean;
}) => {
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

  return (
    <div
      className={`group relative cursor-pointer rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-card-hover hover:border-accent/30 ${
        compact ? "w-44 shrink-0" : ""
      }`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className={`bg-secondary flex items-center justify-center ${compact ? "h-24" : "h-32"}`}>
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt={doc.title || doc.file_name} className="h-full w-full object-cover" />
        ) : doc.file_type === "application/pdf" ? (
          <FileText className="h-8 w-8 text-red-400" />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Star */}
      {doc.is_important && (
        <div className="absolute top-2 right-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <p className="font-body text-xs font-medium line-clamp-2 mb-1">
          {doc.title || doc.file_name}
        </p>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {getCategoryLabel(doc.category)}
          </Badge>
          <SourceIcon source={getSourceFromDoc(doc)} />
        </div>
      </div>
    </div>
  );
};

function getStorageBucket(doc: any): string {
  if (doc.maintenance_log_id) return "maintenance-photos";
  if (doc.contractor_submission_id) return "contractor-uploads";
  if (doc.home_item_id) return "home-item-attachments";
  return "property-documents";
}

function getSourceFromDoc(doc: any): string {
  if (doc.maintenance_log_id) return "maintenance";
  if (doc.contractor_submission_id) return "contractor";
  if (doc.home_item_id) return "inventory";
  return "direct";
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

const SourceIcon = ({ source }: { source: string }) => {
  const cls = "h-3 w-3 text-muted-foreground";
  switch (source) {
    case "maintenance":
      return <Wrench className={cls} />;
    case "contractor":
      return <User className={cls} />;
    case "inventory":
      return <Package className={cls} />;
    default:
      return <Upload className={`${cls} opacity-50`} />;
  }
};

export default DocumentsHub;
