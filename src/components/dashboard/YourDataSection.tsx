import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const YourDataSection = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [
        { data: properties },
        { data: logs },
        { data: documents },
        { data: items },
        { data: contacts },
        { data: templates },
        { data: shares },
        { data: utilities },
      ] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("maintenance_logs").select("*"),
        supabase.from("documents").select("id, name, file_name, category, description, document_date, tags, is_important, created_at, property_id, system_key"),
        supabase.from("home_items").select("*"),
        supabase.from("home_contacts").select("*"),
        supabase.from("recurring_templates").select("*"),
        supabase.from("property_shares").select("*").eq("owner_id", user.id),
        supabase.from("property_utilities").select("*"),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_email: user.email,
        properties: properties ?? [],
        maintenance_logs: logs ?? [],
        documents: documents ?? [],
        home_items: items ?? [],
        contacts: contacts ?? [],
        templates: templates ?? [],
        shares: shares ?? [],
        utilities: utilities ?? [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `homelog-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Your data export is downloading" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await signOut();
      toast({ title: "Your account has been deleted" });
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: "Deletion failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteStep(1);
      setDeleteConfirm("");
    }
  };

  return (
    <>
      {/* Data Export */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" /> Export your data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-body text-sm text-muted-foreground">
            Download a copy of all your HomeLog data including properties, maintenance logs, documents metadata, home inventory, contacts, and financial records.
          </p>
          <Button
            variant="outline"
            className="rounded-full font-body font-semibold"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export my data
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Delete your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-body text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone. Your properties, maintenance logs, documents, and all other data will be permanently removed within 30 days.
          </p>
          <Button
            variant="destructive"
            className="rounded-full font-body font-semibold"
            onClick={() => { setDeleteOpen(true); setDeleteStep(1); setDeleteConfirm(""); }}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) { setDeleteOpen(false); setDeleteStep(1); setDeleteConfirm(""); } }}>
        <DialogContent className="max-w-sm">
          {deleteStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Are you sure?
                </DialogTitle>
                <DialogDescription className="font-body">
                  This will permanently delete your account and ALL data associated with it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <ul className="font-body text-sm text-muted-foreground space-y-1.5 list-disc ml-4">
                    <li>All properties, maintenance records, documents, inventory, and financial records will be deleted</li>
                    <li>Properties shared with others will have those shares revoked</li>
                    <li>Pending property transfers will be cancelled</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-full font-body" onClick={() => setDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-full font-body font-semibold"
                    onClick={() => setDeleteStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-destructive">Final confirmation</DialogTitle>
                <DialogDescription className="font-body">
                  To confirm, type <strong className="text-foreground">DELETE</strong> in the box below
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="font-mono text-center"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-full font-body" onClick={() => setDeleteStep(1)}>
                    Go Back
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-full font-body font-semibold"
                    onClick={handleDelete}
                    disabled={deleteConfirm !== "DELETE" || deleting}
                  >
                    {deleting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                    ) : (
                      "Permanently delete my account"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default YourDataSection;
