import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Users, Phone, Mail, Trash2, Building2, Wrench, DollarSign, ChevronDown, ChevronUp, Zap, Paperclip, MoreVertical, Pencil, Star, Archive, ArchiveRestore, Globe, Search, Sparkles, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import LinkedDocuments from "@/components/dashboard/documents/LinkedDocuments";
import { contactSchema, normalizeWebsiteUrl, validateForm } from "@/lib/schemas";
import { useCanEditAnyProperty } from "@/hooks/useAccessRole";
import PropertyFilterBar from "@/components/dashboard/PropertyFilterBar";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";

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

type ContactForm = {
  name: string; role: string; company: string; phone: string; email: string;
  notes: string; property_id: string; website_url: string;
  is_preferred: boolean; share_to_directory: boolean;
};

const emptyForm: ContactForm = {
  name: "", role: "other", company: "", phone: "", email: "", notes: "",
  property_id: "", website_url: "", is_preferred: false, share_to_directory: true,
};

const HomeContacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEditAny = useCanEditAnyProperty();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedPropertyId, notifyIfDifferent } = usePropertyFilter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; jobs: number } | null>(null);

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
        .order("is_preferred", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: utilities = [] } = useQuery({
    queryKey: ["property_utilities_contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_utilities")
        .select("id, provider_name, service_type, contact_name, contact_phone, contact_email, monthly_cost, vendor_url, property_id, properties(name)")
        .order("provider_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

  const contactIds = contacts.map((c: any) => c.id);
  const { data: contactDocCounts = {} } = useQuery({
    queryKey: ["doc_counts_contacts", contactIds],
    queryFn: async () => {
      if (contactIds.length === 0) return {};
      const { data, error } = await supabase
        .from("documents")
        .select("contact_id")
        .in("contact_id", contactIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        counts[d.contact_id] = (counts[d.contact_id] || 0) + 1;
      });
      return counts;
    },
    enabled: contactIds.length > 0,
  });

  const openAddDialog = () => {
    setEditingId(null);
    const pref = selectedPropertyId !== "all" ? selectedPropertyId : properties[0]?.id ?? "";
    setForm({ ...emptyForm, property_id: pref });
    setDialogOpen(true);
  };

  const openEditDialog = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? "",
      role: c.role ?? "other",
      company: c.company ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
      property_id: c.property_id ?? "",
      website_url: c.website_url ?? "",
      is_preferred: !!c.is_preferred,
      share_to_directory: c.share_to_directory ?? true,
    });
    setDialogOpen(true);
  };

  const saveContact = useMutation({
    mutationFn: async () => {
      const validation = validateForm(contactSchema, form);
      if (!validation.success) throw new Error(validation.error);

      const payload = {
        property_id: form.property_id,
        name: form.name.trim(),
        role: form.role,
        company: form.company?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        notes: form.notes?.trim() || null,
        website_url: normalizeWebsiteUrl(form.website_url),
        is_preferred: form.is_preferred,
        share_to_directory: form.share_to_directory,
      };

      if (editingId) {
        const { error } = await supabase.from("home_contacts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_contacts").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      notifyIfDifferent(form.property_id);
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Contact updated" : "Contact added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePreferred = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("home_contacts").update({ is_preferred: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["home_contacts"] }),
  });

  const toggleArchived = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("home_contacts").update({ is_archived: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      toast({ title: vars.value ? "Contact archived" : "Contact restored" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // Snapshot name onto linked maintenance logs before delete so history stays readable
      const { error: snapErr } = await supabase
        .from("maintenance_logs")
        .update({ contact_name_snapshot: name })
        .eq("contact_id", id);
      if (snapErr) throw snapErr;

      const { error } = await supabase.from("home_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_contacts"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs_for_contacts"] });
      setDeleteTarget(null);
      toast({ title: "Contact deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getRoleLabel = (value: string) => roles.find((r) => r.value === value)?.label ?? value;

  const getContactStats = (contactId: string) => {
    const linked = allLogs.filter((l: any) => l.contact_id === contactId);
    const totalSpend = linked.reduce((sum: number, l: any) => sum + (l.cost || 0), 0);
    return { jobs: linked.length, totalSpend, logs: linked };
  };

  const visibleContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c: any) => {
      if (!!c.is_archived !== showArchived) return false;
      if (selectedPropertyId !== "all" && c.property_id !== selectedPropertyId) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      );
    });
  }, [contacts, search, showArchived, selectedPropertyId]);

  const archivedCount = contacts.filter((c: any) => c.is_archived).length;

  // ── Community directory suggestions ─────────────────────────────
  const selectedProperty = properties.find((p: any) => p.id === form.property_id);
  const propCity = (selectedProperty as any)?.city ?? null;
  const propState = (selectedProperty as any)?.state ?? null;

  // Debounce the company input
  const [companyDebounced, setCompanyDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setCompanyDebounced(form.company.trim()), 300);
    return () => clearTimeout(t);
  }, [form.company]);

  const isSharableRole = form.role !== "personal" && form.role !== "landlord";

  const { data: companySuggestions = [] } = useQuery({
    queryKey: ["directory_company_suggestions", companyDebounced, propState, propCity, form.role],
    queryFn: async () => {
      let q = supabase
        .from("service_provider_directory")
        .select("id, display_name, role, city, state, phone_normalized, times_saved")
        .ilike("display_name", `${companyDebounced}%`)
        .order("times_saved", { ascending: false })
        .limit(4);
      if (propState) q = q.eq("state", propState);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: dialogOpen && companyDebounced.length >= 2 && !!user,
  });

  // Empty-state "Popular pros near you"
  const showPopularPros = properties.length > 0 && contacts.length === 0 && !isLoading;
  const primaryProperty: any = properties[0];
  const popularCity = primaryProperty?.city ?? null;
  const popularState = primaryProperty?.state ?? null;

  const { data: popularPros = [] } = useQuery({
    queryKey: ["popular_pros", popularState, popularCity],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suggest_providers", {
        p_city: popularCity,
        p_state: popularState,
        p_limit: 6,
      } as any);
      if (error) throw error;
      return data ?? [];
    },
    enabled: showPopularPros && !!popularState,
  });

  const prefillFromDirectory = (s: any) => {
    setForm((f) => ({
      ...f,
      company: s.display_name ?? f.company,
      role: s.role ?? f.role,
      phone: f.phone || s.phone_normalized || "",
    }));
  };

  const addFromDirectory = (s: any) => {
    if (!primaryProperty?.id) return;
    setEditingId(null);
    setForm({
      ...emptyForm,
      property_id: primaryProperty.id,
      name: s.display_name ?? "",
      company: s.display_name ?? "",
      role: s.role ?? "other",
      phone: s.phone_normalized ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold">Home Contacts</h2>
          <p className="font-body text-sm text-muted-foreground">Your contractors, vendors, and service providers</p>
        </div>
        {canEditAny && (
          <Button
            onClick={openAddDialog}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
            disabled={properties.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Contact
          </Button>
        )}
      </div>

      <PropertyFilterBar />

      {properties.length > 0 && contacts.length > 0 && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 font-body"
            />
          </div>
          {archivedCount > 0 && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
              className="rounded-full font-body"
            >
              <Archive className="mr-2 h-3.5 w-3.5" />
              {showArchived ? `Showing archived (${archivedCount})` : `Archived (${archivedCount})`}
            </Button>
          )}
        </div>
      )}

      {/* Contact form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveContact.mutate(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="font-body">Property *</Label>
              <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                <SelectTrigger className="font-body"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-body">{getPropertyDisplayName(p)}</SelectItem>
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
            <div className="space-y-2 relative">
              <Label className="font-body">Company</Label>
              <Input placeholder="ABC Plumbing" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="font-body" />
              {isSharableRole && companySuggestions.length > 0 && !editingId && (
                <div className="rounded-lg border border-border/60 bg-background shadow-sm divide-y divide-border/40 overflow-hidden">
                  <div className="px-3 py-1.5 bg-muted/40 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-accent" />
                    <span className="font-body text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Suggested from other homeowners{propState ? ` near ${propCity ?? propState}` : ""}
                    </span>
                  </div>
                  {companySuggestions.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => prefillFromDirectory(s)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-body text-sm font-medium truncate">{s.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          Saved by {s.times_saved} homeowner{s.times_saved !== 1 ? "s" : ""}
                          {s.city ? ` nearby` : ""}
                        </p>
                      </div>
                      {s.role && <Badge variant="secondary" className="font-body text-[10px] shrink-0">{roles.find(r => r.value === s.role)?.label ?? s.role}</Badge>}
                    </button>
                  ))}
                </div>
              )}
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
              <Label className="font-body">Website</Label>
              <Input placeholder="https://example.com" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Notes</Label>
              <Textarea placeholder="Any additional details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="font-body" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="font-body text-sm font-medium">Preferred contact</p>
                <p className="font-body text-xs text-muted-foreground">Show at the top of the list</p>
              </div>
              <Switch checked={form.is_preferred} onCheckedChange={(v) => setForm({ ...form, is_preferred: v })} />
            </div>
            {isSharableRole && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div className="pr-3">
                  <p className="font-body text-sm font-medium">Share this business with other homeowners</p>
                  <p className="font-body text-xs text-muted-foreground">Only the business name, trade, phone and city. Never your name, notes, or what you paid.</p>
                </div>
                <Switch checked={form.share_to_directory} onCheckedChange={(v) => setForm({ ...form, share_to_directory: v })} />
              </div>
            )}
            <DialogFooter>
              <Button
                type="submit"
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
                disabled={saveContact.isPending || !form.property_id || !form.name}
              >
                {saveContact.isPending ? "Saving..." : editingId ? "Save changes" : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              {deleteTarget?.jobs
                ? `${deleteTarget.name} is linked to ${deleteTarget.jobs} maintenance log${deleteTarget.jobs !== 1 ? "s" : ""}. The logs will keep the contact's name for history, but the link will be removed.`
                : `${deleteTarget?.name ?? "This contact"} will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteContact.mutate({ id: deleteTarget.id, name: deleteTarget.name })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      ) : visibleContacts.length === 0 && utilities.length === 0 ? (
        <div className="space-y-4">
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 font-display text-lg font-semibold">
                {showArchived ? "No archived contacts" : search ? "No matches" : "No contacts yet"}
              </h3>
              <p className="font-body text-sm text-muted-foreground">
                {showArchived ? "Restore an archived contact to see it here" : "Save your go-to contractors and service providers"}
              </p>
            </CardContent>
          </Card>
          {showPopularPros && popularPros.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="font-display text-base font-semibold">Popular pros near you</h3>
                {(popularCity || popularState) && (
                  <span className="font-body text-xs text-muted-foreground">
                    <MapPin className="inline h-3 w-3 mr-0.5" />
                    {[popularCity, popularState].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {popularPros.map((p: any) => (
                  <Card key={p.id} className="border-border/50">
                    <CardContent className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold truncate">{p.display_name}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          Saved by {p.times_saved} homeowner{p.times_saved !== 1 ? "s" : ""}
                          {p.city ? ` in ${p.city}` : p.state ? ` in ${p.state}` : ""}
                        </p>
                        {p.role && (
                          <Badge variant="secondary" className="mt-1 font-body text-[10px]">
                            {roles.find(r => r.value === p.role)?.label ?? p.role}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full font-body shrink-0"
                        onClick={() => addFromDirectory(p)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleContacts.map((contact: any) => {
            const stats = getContactStats(contact.id);
            const isExpanded = expandedContact === contact.id;
            const docCount = (contactDocCounts as Record<string, number>)[contact.id] || 0;
            return (
              <Card key={contact.id} className={`border-border/50 transition-shadow hover:shadow-card-hover ${contact.is_archived ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-sm font-semibold truncate">{contact.name}</h4>
                          {contact.is_preferred && (
                            <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-label="Preferred" />
                          )}
                        </div>
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
                          {contact.website_url && (
                            <a href={contact.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                              <Globe className="h-3 w-3" />Website
                            </a>
                          )}
                        </div>
                        {(stats.jobs > 0 || docCount > 0) && (
                          <div className="mt-1.5 flex items-center gap-3 font-body text-xs">
                            {stats.jobs > 0 && (
                              <span className="inline-flex items-center gap-1 text-accent font-medium">
                                <Wrench className="h-3 w-3" />{stats.jobs} job{stats.jobs !== 1 ? "s" : ""}
                              </span>
                            )}
                            {stats.totalSpend > 0 && (
                              <span className="inline-flex items-center gap-1 text-accent font-medium">
                                <DollarSign className="h-3 w-3" />${stats.totalSpend.toLocaleString()}
                              </span>
                            )}
                            {docCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                                <Paperclip className="h-3 w-3" />{docCount} doc{docCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                        {contact.notes && (
                          <p className="mt-1 font-body text-xs text-muted-foreground/70 line-clamp-1">{contact.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="font-body text-xs">{getRoleLabel(contact.role)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${stats.jobs === 0 && docCount === 0 ? "invisible" : ""}`}
                        onClick={() => setExpandedContact(isExpanded ? null : contact.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePreferred.mutate({ id: contact.id, value: !contact.is_preferred })}>
                            <Star className={`mr-2 h-4 w-4 ${contact.is_preferred ? "fill-accent text-accent" : ""}`} />
                            {contact.is_preferred ? "Unmark preferred" : "Mark preferred"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleArchived.mutate({ id: contact.id, value: !contact.is_archived })}>
                            {contact.is_archived ? (
                              <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</>
                            ) : (
                              <><Archive className="mr-2 h-4 w-4" /> Archive</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget({ id: contact.id, name: contact.name, jobs: stats.jobs })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t border-border/50 pt-3 space-y-3">
                      {stats.jobs > 0 && (
                        <div className="space-y-2">
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
                      <LinkedDocuments
                        contactId={contact.id}
                        propertyId={contact.property_id}
                        propertyName={contact.properties?.name}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Utility Provider Contacts */}
      {!showArchived && utilities.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 font-display text-lg font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Utility Providers
          </h3>
          <div className="space-y-3">
            {utilities.map((util: any) => {
              const serviceLabel = util.service_type.charAt(0).toUpperCase() + util.service_type.slice(1);
              return (
                <Card key={util.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                          <Zap className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-display text-sm font-semibold">{util.provider_name}</h4>
                          <p className="font-body text-xs text-muted-foreground">
                            {util.properties?.name} · {serviceLabel}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-3 font-body text-xs text-muted-foreground">
                            {util.contact_name && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />{util.contact_name}
                              </span>
                            )}
                            {util.contact_phone && (
                              <a href={`tel:${util.contact_phone}`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                                <Phone className="h-3 w-3" />{util.contact_phone}
                              </a>
                            )}
                            {util.contact_email && (
                              <a href={`mailto:${util.contact_email}`} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                                <Mail className="h-3 w-3" />{util.contact_email}
                              </a>
                            )}
                          </div>
                          {util.monthly_cost && (
                            <p className="mt-1 font-body text-xs font-medium text-accent">
                              <DollarSign className="inline h-3 w-3" />${Number(util.monthly_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-body text-xs">{serviceLabel}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeContacts;
