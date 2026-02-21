import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Phone, Mail, Trash2, Building2, Wrench, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const roles = [
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "hvac", label: "HVAC Tech" },
  { value: "roofer", label: "Roofer" },
  { value: "landscaper", label: "Landscaper" },
  { value: "handyman", label: "Handyman" },
  { value: "painter", label: "Painter" },
  { value: "inspector", label: "Inspector" },
  { value: "insurance", label: "Insurance Agent" },
  { value: "realtor", label: "Realtor" },
  { value: "other", label: "Other" },
];

const HomeContacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", role: "other", company: "", phone: "", email: "", notes: "", property_id: "",
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["home_contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_contacts")
        .select("*, properties(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all maintenance logs to compute per-contact stats
  const { data: allLogs = [] } = useQuery({
    queryKey: ["maintenance_logs_for_contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("id, title, cost, category, status, completed_date, created_at, contact_id, reference_code, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("home_contacts").insert({
        user_id: user!.id,
        property_id: form.property_id,
        name: form.name,
        role: form.role,
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      setOpen(false);
      setForm({ name: "", role: "other", company: "", phone: "", email: "", notes: "", property_id: "" });
      toast({ title: "Contact added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      toast({ title: "Contact deleted" });
    },
  });

  const getRoleLabel = (value: string) => roles.find((r) => r.value === value)?.label ?? value;

  // Compute per-contact stats
  const getContactStats = (contactId: string) => {
    const linked = allLogs.filter((l: any) => l.contact_id === contactId);
    const totalSpend = linked.reduce((sum: number, l: any) => sum + (l.cost || 0), 0);
    return { jobs: linked.length, totalSpend, logs: linked };
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Home Contacts</h2>
          <p className="font-body text-sm text-muted-foreground">Your contractors, vendors, and service providers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addContact.mutate(); }} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">Name *</Label>
                  <Input placeholder="John Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="font-body">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Company</Label>
                <Input placeholder="ABC Plumbing" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="font-body" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">Phone</Label>
                  <Input placeholder="(555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Email</Label>
                  <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="font-body" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Notes</Label>
                <Textarea placeholder="Any additional details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="font-body" />
              </div>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={addContact.isPending || !form.property_id || !form.name}>
                {addContact.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add a property first to start saving contacts</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No contacts yet</h3>
            <p className="font-body text-sm text-muted-foreground">Save your go-to contractors and service providers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact: any) => {
            const stats = getContactStats(contact.id);
            const isExpanded = expandedContact === contact.id;
            return (
              <Card key={contact.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-semibold">{contact.name}</h4>
                        <p className="font-body text-xs text-muted-foreground">
                          {contact.properties?.name}
                          {contact.company && (
                            <span className="inline-flex items-center gap-1 ml-2"><Building2 className="h-3 w-3" />{contact.company}</span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-3 font-body text-xs text-muted-foreground">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                              <Phone className="h-3 w-3" />{contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                              <Mail className="h-3 w-3" />{contact.email}
                            </a>
                          )}
                        </div>
                        {/* Linked stats */}
                        {stats.jobs > 0 && (
                          <div className="mt-1.5 flex items-center gap-3 font-body text-xs">
                            <span className="inline-flex items-center gap-1 text-accent font-medium">
                              <Wrench className="h-3 w-3" />{stats.jobs} job{stats.jobs !== 1 ? "s" : ""}
                            </span>
                            <span className="inline-flex items-center gap-1 text-accent font-medium">
                              <DollarSign className="h-3 w-3" />${stats.totalSpend.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {contact.notes && (
                          <p className="mt-1 font-body text-xs text-muted-foreground/70 line-clamp-1">{contact.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-body text-xs">{getRoleLabel(contact.role)}</Badge>
                      {stats.jobs > 0 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedContact(isExpanded ? null : contact.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteContact.mutate(contact.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded repair history */}
                  {isExpanded && stats.jobs > 0 && (
                    <div className="mt-3 border-t border-border/50 pt-3 space-y-2">
                      <p className="font-body text-xs font-medium text-muted-foreground">Repair History</p>
                      {stats.logs.map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-body text-xs font-medium">{log.title}</p>
                              {log.reference_code && (
                                <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded text-muted-foreground">{log.reference_code}</span>
                              )}
                            </div>
                            <p className="font-body text-xs text-muted-foreground">
                              {log.properties?.name} · {log.category}
                              {log.completed_date ? ` · ${format(new Date(log.completed_date), "MMM d, yyyy")}` : ""}
                            </p>
                          </div>
                          {log.cost && (
                            <span className="font-body text-xs font-medium">${Number(log.cost).toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomeContacts;