import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

interface Props {
  property: Property;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted?: () => void;
}

const chunk = <T,>(arr: T[], size = 100): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const DeletePropertyDialog = ({ property, open, onOpenChange, onDeleted }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");

  const { data: counts, isLoading } = useQuery({
    queryKey: ["delete_property_counts", property.id],
    enabled: open,
    queryFn: async () => {
      const [logs, docs, items, accounts, payments, pendingTransfers, activeShares] = await Promise.all([
        supabase.from("maintenance_logs").select("id", { count: "exact", head: true }).eq("property_id", property.id),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("property_id", property.id),
        supabase.from("home_items").select("id", { count: "exact", head: true }).eq("property_id", property.id),
        supabase.from("property_utilities").select("id", { count: "exact", head: true }).eq("property_id", property.id),
        supabase.from("utility_payments").select("id", { count: "exact", head: true }).eq("property_id", property.id),
        supabase.from("property_transfers").select("id", { count: "exact", head: true }).eq("property_id", property.id).eq("status", "pending"),
        supabase.from("property_shares").select("id", { count: "exact", head: true }).eq("property_id", property.id).in("status", ["pending", "accepted"]),
      ]);
      return {
        logs: logs.count || 0,
        docs: docs.count || 0,
        items: items.count || 0,
        accounts: accounts.count || 0,
        payments: payments.count || 0,
        pendingTransfers: pendingTransfers.count || 0,
        activeShares: activeShares.count || 0,
      };
    },
  });

  const blocked = (counts?.pendingTransfers ?? 0) > 0 || (counts?.activeShares ?? 0) > 0;
  const canDelete = typed.trim() === property.name && !blocked;

  const del = useMutation({
    mutationFn: async () => {
      const leftover: { bucket: string; path: string; err: string }[] = [];

      // 1. Gather storage paths BEFORE deleting the row
      const [docsRows, itemRows, logRows, contractorRows] = await Promise.all([
        supabase.from("documents").select("file_path").eq("property_id", property.id),
        supabase.from("home_items").select("id").eq("property_id", property.id),
        supabase.from("maintenance_logs").select("image_url").eq("property_id", property.id),
        supabase.from("contractor_submissions").select("photos, receipt_files").eq("property_id", property.id),
      ]);

      const documentsPaths = (docsRows.data || []).map((d) => d.file_path).filter(Boolean) as string[];

      const itemIds = (itemRows.data || []).map((i) => i.id);
      let attachmentPaths: string[] = [];
      if (itemIds.length) {
        const { data: atts } = await supabase
          .from("home_item_attachments")
          .select("file_path")
          .in("home_item_id", itemIds);
        attachmentPaths = (atts || []).map((a) => a.file_path).filter(Boolean) as string[];
      }

      const maintenancePaths: string[] = [];
      for (const l of logRows.data || []) {
        if (!l.image_url) continue;
        const m = String(l.image_url).match(/maintenance-photos\/([^?]+)/);
        if (m) maintenancePaths.push(decodeURIComponent(m[1]));
      }

      const contractorPaths: string[] = [];
      for (const c of contractorRows.data || []) {
        (c.photos || []).forEach((p: string) => p && contractorPaths.push(p));
        (c.receipt_files || []).forEach((p: string) => p && contractorPaths.push(p));
      }

      // 2. Remove from storage (chunked, tolerate partial failure)
      const jobs: { bucket: string; paths: string[] }[] = [
        { bucket: "documents", paths: documentsPaths },
        { bucket: "home-item-attachments", paths: attachmentPaths },
        { bucket: "maintenance-photos", paths: maintenancePaths },
        { bucket: "contractor-uploads", paths: contractorPaths },
      ];

      for (const j of jobs) {
        for (const batch of chunk(j.paths, 100)) {
          if (!batch.length) continue;
          const { error } = await supabase.storage.from(j.bucket).remove(batch);
          if (error) {
            batch.forEach((p) => leftover.push({ bucket: j.bucket, path: p, err: error.message }));
          }
        }
      }

      if (leftover.length) {
        // eslint-disable-next-line no-console
        console.log("[delete-property] leftover storage paths:", leftover);
      }

      // 3. Delete the property (child rows cascade via FK)
      const { error: delErr } = await supabase.from("properties").delete().eq("id", property.id);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      toast({ title: "Property deleted", description: `${property.name} and all its data were removed.` });
      // Invalidate everything property-scoped
      qc.invalidateQueries();
      sessionStorage.removeItem("selectedPropertyId");
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!del.isPending) { onOpenChange(v); if (!v) setTyped(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete this property?
          </DialogTitle>
          <DialogDescription className="font-body">
            This permanently removes <span className="font-semibold">{property.name}</span> and every record tied to it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {blocked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-body text-sm">
                  {counts!.pendingTransfers > 0 && <div>There is a pending transfer on this property. Cancel it before deleting.</div>}
                  {counts!.activeShares > 0 && <div>This property is shared with {counts!.activeShares} collaborator{counts!.activeShares === 1 ? "" : "s"}. Revoke the shares first.</div>}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border border-border/50 bg-muted/40 p-3 space-y-1.5 font-body text-sm">
              <p className="font-medium text-foreground mb-1">What will be permanently deleted:</p>
              <div className="flex justify-between"><span>Maintenance logs</span><span>{counts?.logs ?? 0}</span></div>
              <div className="flex justify-between"><span>Documents</span><span>{counts?.docs ?? 0}</span></div>
              <div className="flex justify-between"><span>Inventory items</span><span>{counts?.items ?? 0}</span></div>
              <div className="flex justify-between"><span>Accounts &amp; utilities</span><span>{counts?.accounts ?? 0}</span></div>
              <div className="flex justify-between"><span>Payment history</span><span>{counts?.payments ?? 0}</span></div>
              <p className="text-xs text-muted-foreground pt-1">All uploaded photos, receipts, and files are also removed.</p>
            </div>

            {!blocked && (
              <div className="space-y-2">
                <Label className="font-body text-sm">
                  Type <span className="font-mono font-semibold">{property.name}</span> to confirm.
                </Label>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} className="font-body" autoFocus />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={del.isPending}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canDelete || del.isPending}
            onClick={() => del.mutate()}
          >
            {del.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePropertyDialog;
