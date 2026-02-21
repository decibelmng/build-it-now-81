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
import { Plus, Zap, Flame, Wifi, Droplets, Trash2, ExternalLink, Phone, Mail, User, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const serviceTypes = [
  { value: "electric", label: "Electric", icon: Zap },
  { value: "gas", label: "Gas", icon: Flame },
  { value: "water", label: "Water", icon: Droplets },
  { value: "sewer", label: "Sewer", icon: Droplets },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "trash", label: "Trash/Recycling", icon: Trash2 },
  { value: "other", label: "Other", icon: Zap },
];

const PropertyUtilities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    property_id: "", service_type: "electric", provider_name: "",
    account_number: "", monthly_cost: "", vendor_url: "",
    contact_name: "", contact_phone: "", contact_email: "", notes: "",
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

  const { data: utilities = [], isLoading } = useQuery({
    queryKey: ["property_utilities", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_utilities")
        .select("*, properties(name)")
        .order("service_type");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addUtility = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("property_utilities").insert({
        user_id: user!.id,
        property_id: form.property_id,
        service_type: form.service_type,
        provider_name: form.provider_name,
        account_number: form.account_number || null,
        monthly_cost: form.monthly_cost ? parseFloat(form.monthly_cost) : null,
        vendor_url: form.vendor_url || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_utilities"] });
      setOpen(false);
      setForm({ property_id: "", service_type: "electric", provider_name: "", account_number: "", monthly_cost: "", vendor_url: "", contact_name: "", contact_phone: "", contact_email: "", notes: "" });
      toast({ title: "Utility added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUtility = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_utilities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_utilities"] });
      toast({ title: "Utility deleted" });
    },
  });

  const getServiceConfig = (type: string) => serviceTypes.find((s) => s.value === type) ?? serviceTypes[serviceTypes.length - 1];

  const totalMonthlyCost = utilities.reduce((sum: number, u: any) => sum + (u.monthly_cost ? Number(u.monthly_cost) : 0), 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Utilities</h2>
          <p className="font-body text-sm text-muted-foreground">
            Manage your utility accounts, costs, and provider contacts
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body" disabled={properties.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Add Utility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Add Utility Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addUtility.mutate(); }} className="space-y-4">
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
                  <Label className="font-body">Service Type *</Label>
                  <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="font-body">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Provider Name *</Label>
                  <Input placeholder="e.g. Duke Energy" value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} required className="font-body" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">Account Number</Label>
                  <Input placeholder="Account #" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Monthly Cost ($)</Label>
                  <Input type="number" step="0.01" placeholder="150.00" value={form.monthly_cost} onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })} className="font-body" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Vendor Website</Label>
                <Input placeholder="https://provider.com" value={form.vendor_url} onChange={(e) => setForm({ ...form, vendor_url: e.target.value })} className="font-body" />
              </div>

              {/* Contact info */}
              <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                <p className="font-body text-sm font-semibold">Provider Contact</p>
                <div className="space-y-2">
                  <Label className="font-body text-xs">Contact Name</Label>
                  <Input placeholder="Customer service rep" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="font-body" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="font-body text-xs">Phone</Label>
                    <Input placeholder="(555) 123-4567" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="font-body" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body text-xs">Email</Label>
                    <Input type="email" placeholder="support@provider.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="font-body" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-body">Notes</Label>
                <Textarea placeholder="Any additional details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="font-body" />
              </div>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={addUtility.isPending || !form.property_id || !form.provider_name}>
                {addUtility.isPending ? "Adding..." : "Add Utility"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly total banner */}
      {totalMonthlyCost > 0 && (
        <Card className="mb-4 border-accent/20 bg-accent/5">
          <CardContent className="flex items-center gap-3 p-3">
            <DollarSign className="h-5 w-5 text-accent shrink-0" />
            <p className="font-body text-sm">
              <strong className="font-display text-foreground">${totalMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="text-muted-foreground"> /month estimated total</span>
            </p>
          </CardContent>
        </Card>
      )}

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add a property first</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : utilities.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 font-display text-lg font-semibold">No utilities yet</h3>
            <p className="font-body text-sm text-muted-foreground">Track your gas, electric, water, internet, and more</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {utilities.map((util: any) => {
            const svc = getServiceConfig(util.service_type);
            const SvcIcon = svc.icon;
            return (
              <Card key={util.id} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <SvcIcon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-semibold">{util.provider_name}</h4>
                        <p className="font-body text-xs text-muted-foreground">
                          {(util as any).properties?.name} · {svc.label}
                          {util.account_number && <span> · Acct: {util.account_number}</span>}
                        </p>

                        {/* Cost */}
                        {util.monthly_cost && (
                          <p className="mt-1 font-body text-xs font-medium text-accent">
                            <DollarSign className="inline h-3 w-3" />
                            {Number(util.monthly_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}/mo
                          </p>
                        )}

                        {/* Contact info */}
                        <div className="mt-1.5 flex flex-wrap gap-3 font-body text-xs text-muted-foreground">
                          {util.contact_name && (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />{util.contact_name}
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

                        {util.notes && (
                          <p className="mt-1 font-body text-xs text-muted-foreground/70 line-clamp-1">{util.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-body text-xs">{svc.label}</Badge>
                      {util.vendor_url && (
                        <a href={util.vendor_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteUtility.mutate(util.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default PropertyUtilities;
