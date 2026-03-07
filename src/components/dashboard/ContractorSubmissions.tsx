import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, Eye, UserPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { indexContractorSubmissionFiles } from "@/lib/documentIndexing";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
  rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
};

const ContractorSubmissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState("pending");

  const { data: submissions = [] } = useQuery({
    queryKey: ["contractor_submissions", user?.id],
    queryFn: async () => {
      // Get all submissions through the user's access links
      const { data, error } = await supabase
        .from("contractor_submissions")
        .select("*, contractor_access_links!inner(user_id, property_id, label)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name, address");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contractor_submissions")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contractor_submissions"] }),
  });

  const approveAndCreateLog = useMutation({
    mutationFn: async (submission: any) => {
      // Update submission status
      const { error: updateError } = await supabase
        .from("contractor_submissions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", submission.id);
      if (updateError) throw updateError;

      // Create maintenance log from submission
      const categoryMap: Record<string, string> = {
        "HVAC": "hvac", "Plumbing": "plumbing", "Electrical": "electrical",
        "Roofing": "roofing", "Landscaping": "landscaping", "Appliance Repair": "appliance",
        "General Maintenance": "general", "Painting": "general", "Pest Control": "general", "Other": "general",
      };

      const { error: logError } = await supabase.from("maintenance_logs").insert({
        property_id: submission.property_id,
        user_id: user!.id,
        title: `${submission.service_category} — ${submission.contractor_company_name}`,
        description: submission.service_description +
          (submission.warranty_info ? `\n\nWarranty: ${submission.warranty_info}` : "") +
          (submission.notes ? `\n\nNotes: ${submission.notes}` : "") +
          `\n\n[Submitted by contractor: ${submission.contractor_contact_name}, ${submission.contractor_company_name}]`,
        category: categoryMap[submission.service_category] || "general",
        cost: submission.cost,
        scheduled_date: submission.service_date,
        completed_date: submission.service_date,
        status: "completed",
        scope: "routine",
        image_url: submission.photos?.[0] || null,
      });
      if (logError) throw logError;

      // If add_to_contacts, add the contractor as a contact
      let contactId: string | null = null;
      if (submission.add_to_contacts) {
        const { data: newContact } = await supabase.from("home_contacts").insert({
          property_id: submission.property_id,
          user_id: user!.id,
          name: submission.contractor_contact_name,
          company: submission.contractor_company_name,
          email: submission.contractor_email || null,
          phone: submission.contractor_phone || null,
          role: "contractor",
        }).select("id").single();
        contactId = newContact?.id || null;
      }

      // Auto-index contractor submission files into documents table
      await indexContractorSubmissionFiles({
        submission,
        user_id: user!.id,
        contact_id: contactId,
      });
    },
    onSuccess: (_, submission) => {
      queryClient.invalidateQueries({ queryKey: ["contractor_submissions"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Submission approved!",
        description: submission.add_to_contacts
          ? "Added to maintenance log and contacts."
          : "Added to maintenance log.",
      });
      setSelected(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to approve submission", variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contractor_submissions")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor_submissions"] });
      toast({ title: "Submission rejected" });
      setSelected(null);
    },
  });

  const getPropertyName = (pid: string) => properties.find((p) => p.id === pid)?.name || "Unknown";
  const filtered = submissions.filter((s: any) => s.status === tab);
  const pendingCount = submissions.filter((s: any) => s.status === "pending").length;

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("contractor-uploads").createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Contractor Submissions</h2>
        <p className="text-sm text-muted-foreground">
          Review service logs submitted by contractors.
          {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount} pending</Badge>}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            Pending {pendingCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No {tab} submissions.
              </CardContent>
            </Card>
          ) : (
            filtered.map((sub: any) => {
              const cfg = statusConfig[sub.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <Card key={sub.id} className="cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setSelected(sub)}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium truncate">{sub.contractor_company_name}</p>
                        <Badge variant={cfg.variant} className="text-xs">{sub.service_category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {sub.contractor_contact_name} · {getPropertyName(sub.property_id)} · {format(new Date(sub.service_date), "MMM d, yyyy")}
                        {sub.cost && ` · $${Number(sub.cost).toFixed(2)}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Eye className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.service_category} — {selected.contractor_company_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Contact</span><p className="font-medium">{selected.contractor_contact_name}</p></div>
                  <div><span className="text-muted-foreground">Company</span><p className="font-medium">{selected.contractor_company_name}</p></div>
                  {selected.contractor_email && <div><span className="text-muted-foreground">Email</span><p>{selected.contractor_email}</p></div>}
                  {selected.contractor_phone && <div><span className="text-muted-foreground">Phone</span><p>{selected.contractor_phone}</p></div>}
                  <div><span className="text-muted-foreground">Service Date</span><p>{format(new Date(selected.service_date), "MMM d, yyyy")}</p></div>
                  <div><span className="text-muted-foreground">Category</span><p>{selected.service_category}</p></div>
                  {selected.cost && <div><span className="text-muted-foreground">Cost</span><p className="font-medium">${Number(selected.cost).toFixed(2)}</p></div>}
                  <div><span className="text-muted-foreground">Property</span><p>{getPropertyName(selected.property_id)}</p></div>
                </div>

                <div>
                  <span className="text-muted-foreground">Description</span>
                  <p className="mt-1 whitespace-pre-wrap">{selected.service_description}</p>
                </div>

                {selected.warranty_info && (
                  <div>
                    <span className="text-muted-foreground">Warranty</span>
                    <p className="mt-1">{selected.warranty_info}</p>
                  </div>
                )}

                {selected.notes && (
                  <div>
                    <span className="text-muted-foreground">Notes</span>
                    <p className="mt-1">{selected.notes}</p>
                  </div>
                )}

                {selected.photos?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Photos ({selected.photos.length})</span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {selected.photos.map((path: string, i: number) => (
                        <button key={i} className="aspect-square rounded-md bg-secondary overflow-hidden"
                          onClick={async () => { const url = await getSignedUrl(path); if (url) window.open(url, "_blank"); }}>
                          <span className="flex items-center justify-center h-full text-xs text-muted-foreground">Photo {i + 1}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selected.receipt_files?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Receipts ({selected.receipt_files.length})</span>
                    <div className="mt-2 space-y-1">
                      {selected.receipt_files.map((path: string, i: number) => (
                        <button key={i} className="flex items-center gap-2 text-accent hover:underline text-xs"
                          onClick={async () => { const url = await getSignedUrl(path); if (url) window.open(url, "_blank"); }}>
                          <Download className="h-3 w-3" /> Receipt {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selected.add_to_contacts && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-accent" />
                    <span className="text-xs">This contractor requested to be added to your contacts.</span>
                  </div>
                )}

                {selected.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={() => approveAndCreateLog.mutate(selected)}
                      disabled={approveAndCreateLog.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => reject.mutate(selected.id)}
                      disabled={reject.isPending}>
                      <XCircle className="mr-2 h-4 w-4" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractorSubmissions;
