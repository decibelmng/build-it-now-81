import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

interface LeaseMeta {
  lease_start?: string;
  security_deposit?: string;
  renewal_notice_date?: string;
}

const parseLeaseMeta = (notes: string | null): LeaseMeta => {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const CurrencyInput = ({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
    <Input id={id} type="number" step="0.01" min="0" className="pl-7 font-body" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const LeaseDetailsCard = ({ property }: { property: Property }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaseAccount } = useQuery({
    queryKey: ["lease_account", property.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_utilities")
        .select("*")
        .eq("property_id", property.id)
        .eq("service_type", "rent_lease")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    monthly_rent: "",
    lease_start: "",
    lease_end: "",
    security_deposit: "",
    landlord_name: "",
    landlord_phone: "",
    renewal_notice_date: "",
  });

  useEffect(() => {
    if (leaseAccount) {
      const meta = parseLeaseMeta(leaseAccount.notes);
      setForm({
        monthly_rent: leaseAccount.monthly_cost != null ? String(leaseAccount.monthly_cost) : "",
        lease_start: meta.lease_start ?? "",
        lease_end: leaseAccount.contract_end_date ?? "",
        security_deposit: meta.security_deposit ?? "",
        landlord_name: leaseAccount.provider_name ?? "",
        landlord_phone: leaseAccount.contact_phone ?? "",
        renewal_notice_date: meta.renewal_notice_date ?? "",
      });
    }
  }, [leaseAccount]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const meta: LeaseMeta = {
        lease_start: form.lease_start || undefined,
        security_deposit: form.security_deposit || undefined,
        renewal_notice_date: form.renewal_notice_date || undefined,
      };
      const payload = {
        user_id: user.id,
        property_id: property.id,
        service_type: "rent_lease" as const,
        provider_name: form.landlord_name || "Landlord",
        monthly_cost: form.monthly_rent ? parseFloat(form.monthly_rent) : null,
        contract_end_date: form.lease_end || null,
        contact_phone: form.landlord_phone || null,
        notes: JSON.stringify(meta),
      };
      if (leaseAccount?.id) {
        const { error } = await supabase.from("property_utilities").update(payload).eq("id", leaseAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("property_utilities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lease_account", property.id] });
      queryClient.invalidateQueries({ queryKey: ["property_utilities"] });
      toast({ title: "Lease details saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Lease Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-body text-xs text-muted-foreground">
          Your landlord handles the building. Keep your lease terms and contacts here.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="font-body">Monthly Rent</Label>
            <CurrencyInput value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Security Deposit</Label>
            <CurrencyInput value={form.security_deposit} onChange={(v) => setForm({ ...form, security_deposit: v })} />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Lease Start</Label>
            <Input type="date" className="font-body" value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Lease End</Label>
            <Input type="date" className="font-body" value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Landlord / Property Manager</Label>
            <Input className="font-body" placeholder="Name" value={form.landlord_name} onChange={(e) => setForm({ ...form, landlord_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Landlord Phone</Label>
            <Input type="tel" className="font-body" placeholder="(555) 555-5555" value={form.landlord_phone} onChange={(e) => setForm({ ...form, landlord_phone: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="font-body">Renewal Notice Date</Label>
            <Input type="date" className="font-body" value={form.renewal_notice_date} onChange={(e) => setForm({ ...form, renewal_notice_date: e.target.value })} />
            <p className="font-body text-xs text-muted-foreground">The date you must notify the landlord if you're not renewing.</p>
          </div>
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
        >
          <Save className="mr-2 h-4 w-4" />
          {save.isPending ? "Saving..." : "Save Lease Details"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LeaseDetailsCard;
