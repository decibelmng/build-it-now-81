import { useState } from "react";
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
import { Plus, Share2, UserPlus, Trash2, Check, X, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

const PropertySharing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", email: "" });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  // Shares I've sent (as owner)
  const { data: sentShares = [], isLoading: loadingSent } = useQuery({
    queryKey: ["property_shares_sent", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_shares")
        .select("*, properties(name)")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Shares I've received
  const { data: receivedShares = [], isLoading: loadingReceived } = useQuery({
    queryKey: ["property_shares_received", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_shares")
        .select("*, properties(name)")
        .eq("shared_with_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      // Look up if this email has an account
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("display_name", form.email) // We can't look up by email directly
        .maybeSingle();

      const { error } = await supabase.from("property_shares").insert({
        property_id: form.property_id,
        owner_id: user!.id,
        shared_with_email: form.email.toLowerCase(),
        shared_with_user_id: profile?.user_id ?? null,
        status: profile?.user_id ? "pending" : "invited",
      });
      if (error) {
        if (error.code === "23505") throw new Error("This user already has access to this property");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_shares_sent"] });
      setOpen(false);
      setForm({ property_id: "", email: "" });
      toast({ title: "Invitation sent!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const respondToShare = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase.from("property_shares").update({ status: "accepted" }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("property_shares").update({ status: "declined" }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_shares_received"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Share updated" });
    },
  });

  const removeShare = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_shares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_shares_sent"] });
      toast({ title: "Share removed" });
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "accepted": return <Badge variant="default" className="font-body text-xs">Active</Badge>;
      case "pending": return <Badge variant="secondary" className="font-body text-xs">Pending</Badge>;
      case "invited": return <Badge variant="outline" className="font-body text-xs">Invited</Badge>;
      case "declined": return <Badge variant="destructive" className="font-body text-xs">Declined</Badge>;
      default: return <Badge variant="secondary" className="font-body text-xs">{status}</Badge>;
    }
  };

  const isLoading = loadingSent || loadingReceived;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Property Sharing</h2>
          <p className="font-body text-sm text-muted-foreground">Invite collaborators to view and manage your properties</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Invite Collaborator</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); inviteUser.mutate(); }} className="space-y-4">
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
                <Label className="font-body">Email Address *</Label>
                <Input type="email" placeholder="collaborator@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="font-body" />
              </div>
              <p className="font-body text-xs text-muted-foreground">
                The user will get full collaborator access — they can view everything and add logs, documents, and contacts.
              </p>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={inviteUser.isPending || !form.property_id}>
                {inviteUser.isPending ? "Inviting..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Received invitations */}
      {receivedShares.filter((s: any) => s.status === "pending").length > 0 && (
        <div className="mb-6">
          <h3 className="font-display text-lg font-semibold mb-3">Pending Invitations</h3>
          <div className="space-y-3">
            {receivedShares.filter((s: any) => s.status === "pending").map((share: any) => (
              <Card key={share.id} className="border-l-4 border-l-accent border-border/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <Share2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-semibold">{share.properties?.name}</h4>
                      <p className="font-body text-xs text-muted-foreground">
                        Shared by {share.shared_with_email !== user?.email ? "the property owner" : "you"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="rounded-full font-body text-xs" onClick={() => respondToShare.mutate({ id: share.id, accept: true })}>
                      <Check className="mr-1 h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full font-body text-xs text-destructive" onClick={() => respondToShare.mutate({ id: share.id, accept: false })}>
                      <X className="mr-1 h-3 w-3" /> Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sent shares */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-3">Shared Access</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-14 rounded bg-muted" /></CardContent></Card>)}
          </div>
        ) : sentShares.length === 0 && receivedShares.filter((s: any) => s.status === "accepted").length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Share2 className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 font-display text-lg font-semibold">No shared properties</h3>
              <p className="font-body text-sm text-muted-foreground">Invite collaborators to share property access</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sentShares.map((share: any) => (
              <Card key={share.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-semibold">{share.shared_with_email}</h4>
                      <p className="font-body text-xs text-muted-foreground">
                        {share.properties?.name} · Invited {format(new Date(share.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(share.status)}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeShare.mutate(share.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {receivedShares.filter((s: any) => s.status === "accepted").map((share: any) => (
              <Card key={share.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <Share2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-semibold">{share.properties?.name}</h4>
                      <p className="font-body text-xs text-muted-foreground">Shared with you · Collaborator access</p>
                    </div>
                  </div>
                  <Badge variant="default" className="font-body text-xs">Active</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertySharing;
