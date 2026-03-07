import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Link2, Plus, Copy, Trash2, QrCode, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { useDefaultContractorLink } from "@/hooks/useDefaultContractorLink";
import QuickShareCard from "@/components/dashboard/QuickShareCard";

const ContractorLinks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [form, setForm] = useState({ property_id: "", label: "", expiry: "none" });

  // Get first property for default link
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const firstPropertyId = properties.length > 0 ? properties[0].id : undefined;
  const { defaultLink, ensureDefault, linkUrl: defaultLinkUrl } = useDefaultContractorLink(firstPropertyId);

  // Auto-create default link on load
  useEffect(() => {
    ensureDefault();
  }, [firstPropertyId, defaultLink]);


  const { data: links = [] } = useQuery({
    queryKey: ["contractor_links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_access_links")
        .select("*, contractor_submissions(id)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createLink = useMutation({
    mutationFn: async () => {
      let expiresAt: string | null = null;
      if (form.expiry === "24h") expiresAt = new Date(Date.now() + 86400000).toISOString();
      else if (form.expiry === "7d") expiresAt = new Date(Date.now() + 604800000).toISOString();
      else if (form.expiry === "30d") expiresAt = new Date(Date.now() + 2592000000).toISOString();

      const { data, error } = await supabase
        .from("contractor_access_links")
        .insert({
          property_id: form.property_id,
          user_id: user!.id,
          label: form.label || null,
          expires_at: expiresAt,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contractor_links"] });
      const url = `${window.location.origin}/service-log/${data.token}`;
      setCreatedLink(url);
      toast({ title: "Link created!", description: "Share this link with your contractor." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create link", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("contractor_access_links").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contractor_links"] }),
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contractor_access_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor_links"] });
      toast({ title: "Link deleted" });
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/service-log/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name || "Unknown";

  // Filter out the default link from the custom links list
  const customLinks = links.filter((l: any) => !l.is_default);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Contractor Links</h2>
          <p className="text-sm text-muted-foreground">Generate shareable links for contractors to log their service visits.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setCreatedLink(null); setForm({ property_id: "", label: "", expiry: "none" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Generate Link</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{createdLink ? "Link Created!" : "Generate Contractor Link"}</DialogTitle></DialogHeader>

            {createdLink ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Share this link with your contractor:</p>
                  <p className="text-sm font-mono break-all">{createdLink}</p>
                </div>
                <Button className="w-full" onClick={() => { navigator.clipboard.writeText(createdLink); toast({ title: "Copied!" }); }}>
                  <Copy className="mr-2 h-4 w-4" />Copy Link
                </Button>
                <div className="flex justify-center">
                  <QRCodeSVG value={createdLink} size={160} />
                </div>
                <p className="text-xs text-center text-muted-foreground">Scan this QR code to open the service log form</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Property *</Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Label (optional)</Label>
                  <Input placeholder="e.g., For ABC Plumbing" value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
                </div>
                <div>
                  <Label>Expiry</Label>
                  <Select value={form.expiry} onValueChange={(v) => setForm((f) => ({ ...f, expiry: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No expiry</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={!form.property_id || createLink.isPending}
                  onClick={() => createLink.mutate()}>
                  {createLink.isPending ? "Creating..." : "Create Link"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Modal */}
      <Dialog open={!!qrToken} onOpenChange={() => setQrToken(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>QR Code</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrToken && <QRCodeSVG value={`${window.location.origin}/service-log/${qrToken}`} size={200} />}
            <p className="text-xs text-muted-foreground">Scan to open the service log form</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Links List */}
      {links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No contractor links yet. Generate one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => {
            const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
            const submissionCount = link.contractor_submissions?.length || 0;

            return (
              <Card key={link.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{link.label || "Untitled link"}</p>
                      {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                      {!link.is_active && !isExpired && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                      {link.is_active && !isExpired && <Badge variant="default" className="text-xs">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getPropertyName(link.property_id)} · Created {format(new Date(link.created_at), "MMM d, yyyy")}
                      {link.expires_at && ` · Expires ${format(new Date(link.expires_at), "MMM d, yyyy")}`}
                      {submissionCount > 0 && ` · ${submissionCount} submission${submissionCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={link.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: link.id, is_active: checked })} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(link.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQrToken(link.token)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLink.mutate(link.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractorLinks;
