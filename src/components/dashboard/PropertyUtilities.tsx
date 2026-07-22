import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, Zap, Flame, Wifi, Droplets, Trash2, ExternalLink, Phone, Mail, DollarSign,
  Shield, Home, Lock, TreePine, MoreVertical, Eye, EyeOff, Copy, ChevronDown,
  LogIn, Pencil, FileText, Receipt, TrendingUp, AlertCircle, Check, Tv, Car, CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, startOfMonth, parseISO, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { validateForm, utilityAccountSchema } from "@/lib/schemas";
import { useAccessRole } from "@/hooks/useAccessRole";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import PropertyFilterBar from "@/components/dashboard/PropertyFilterBar";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";

// ── Service type config ──
type ServiceType = {
  value: string;
  label: string;
  icon: any;
  group: string;
};

const SERVICE_TYPES: ServiceType[] = [
  { value: "electric", label: "Electric", icon: Zap, group: "utilities" },
  { value: "gas", label: "Gas", icon: Flame, group: "utilities" },
  { value: "propane", label: "Propane", icon: Flame, group: "utilities" },
  { value: "water", label: "Water", icon: Droplets, group: "utilities" },
  { value: "sewer", label: "Sewer", icon: Droplets, group: "utilities" },
  { value: "trash", label: "Trash / Recycling", icon: Trash2, group: "utilities" },
  { value: "internet", label: "Internet", icon: Wifi, group: "connectivity" },
  { value: "cable_tv", label: "Cable / TV", icon: Tv, group: "connectivity" },
  { value: "phone", label: "Phone", icon: Phone, group: "connectivity" },
  { value: "streaming", label: "Streaming", icon: Tv, group: "connectivity" },
  { value: "mortgage", label: "Mortgage", icon: Home, group: "financial" },
  { value: "heloc", label: "HELOC", icon: Home, group: "financial" },
  { value: "property_tax", label: "Property Tax", icon: Receipt, group: "financial" },
  { value: "rent_lease", label: "Rent / Lease", icon: Home, group: "financial" },
  { value: "homeowners_insurance", label: "Homeowners Insurance", icon: Shield, group: "insurance" },
  { value: "renters_insurance", label: "Renters Insurance", icon: Shield, group: "insurance" },
  { value: "flood_insurance", label: "Flood Insurance", icon: Shield, group: "insurance" },
  { value: "umbrella_policy", label: "Umbrella Policy", icon: Shield, group: "insurance" },
  { value: "home_warranty", label: "Home Warranty", icon: Shield, group: "insurance" },
  { value: "security_monitoring", label: "Security Monitoring", icon: Lock, group: "security" },
  { value: "fire_monitoring", label: "Fire Monitoring", icon: Lock, group: "security" },
  { value: "hoa", label: "HOA", icon: Home, group: "community" },
  { value: "condo_association", label: "Condo Association", icon: Home, group: "community" },
  { value: "lawn_care", label: "Lawn Care", icon: TreePine, group: "services" },
  { value: "pest_control", label: "Pest Control", icon: TreePine, group: "services" },
  { value: "pool_service", label: "Pool Service", icon: Droplets, group: "services" },
  { value: "tree_service", label: "Tree Service", icon: TreePine, group: "services" },
  { value: "snow_removal", label: "Snow Removal", icon: TreePine, group: "services" },
  { value: "cleaning_service", label: "Cleaning Service", icon: TreePine, group: "services" },
  { value: "hvac_service_plan", label: "HVAC Service Plan", icon: Zap, group: "services" },
  { value: "holiday_lighting", label: "Holiday Lighting", icon: TreePine, group: "services" },
  { value: "solar_lease", label: "Solar Lease", icon: Zap, group: "energy" },
  { value: "ev_charging", label: "EV Charging", icon: Car, group: "energy" },
  { value: "rent_received", label: "Rent Received", icon: CircleDollarSign, group: "income" },
  { value: "other", label: "Other", icon: DollarSign, group: "other" },
];

const GROUP_ORDER = ["utilities", "connectivity", "financial", "insurance", "security", "community", "services", "energy", "income", "other"];
const GROUP_LABELS: Record<string, string> = {
  utilities: "Utilities", connectivity: "Connectivity", financial: "Financial",
  insurance: "Insurance", security: "Security", community: "Community",
  services: "Services", energy: "Energy", income: "Income", other: "Other",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "stop_requested", label: "Stop requested" },
  { value: "transferred", label: "Transferred to new owner" },
  { value: "cancelled", label: "Cancelled" },
  { value: "paid_off", label: "Paid off" },
];

const PAID_VIA_OPTIONS = [
  { value: "direct", label: "Direct" },
  { value: "escrow", label: "Escrow" },
  { value: "included_in_rent", label: "Included in rent" },
  { value: "hoa_covered", label: "HOA covered" },
  { value: "landlord_paid", label: "Landlord paid" },
];

const STARTER_TYPES = [
  "electric", "gas", "water", "internet", "trash", "mortgage",
  "homeowners_insurance", "hoa", "security_monitoring",
];

const getSvc = (t: string) => SERVICE_TYPES.find((s) => s.value === t) ?? SERVICE_TYPES[SERVICE_TYPES.length - 1];
const maskAccount = (num?: string | null) => {
  if (!num) return null;
  if (num.length <= 4) return "••••";
  return "•••• " + num.slice(-4);
};
const fmt$ = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Empty account form ──
const emptyForm = (property_id: string, service_type = "electric"): any => ({
  property_id, service_type, provider_name: "",
  account_number: "", policy_number: "",
  current_balance: "", balance_as_of: "",
  vendor_url: "", login_url: "", username: "", email_on_account: "", password_hint: "",
  budget_amount: "", monthly_cost: "",
  is_autopay: false, due_day_of_month: "", paid_via: "direct",
  is_income: false, contract_end_date: "", include_in_transfer: true,
  contact_name: "", contact_phone: "", contact_email: "", notes: "",
});

// ── Main component ──
const PropertyUtilities = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { selectedPropertyId: propertyFilter, setSelectedPropertyId: setPropertyFilter } = usePropertyFilter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [prefillType, setPrefillType] = useState<string | null>(null);
  const [payingFor, setPayingFor] = useState<any | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [statusFor, setStatusFor] = useState<any | null>(null);
  const [deleteFor, setDeleteFor] = useState<any | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: utilities = [], isLoading } = useQuery({
    queryKey: ["property_utilities_full", user?.id],
    queryFn: async () => {
      // Owner rows come from the base table; shared rows come from the masked view
      // (credential fields excluded server-side for non-owners).
      const [{ data: owned, error: e1 }, { data: shared, error: e2 }] = await Promise.all([
        supabase.from("property_utilities").select("*, properties(name)").order("provider_name"),
        supabase.from("property_utilities_shared").select("*, properties(name)").order("provider_name"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const row of [...(owned ?? []), ...(shared ?? [])] as any[]) {
        if (!row?.id || seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
      }
      return merged;
    },
    enabled: !!user,
  });

  const utilityIds = utilities.map((u) => u.id);
  const { data: payments = [] } = useQuery({
    queryKey: ["utility_payments", user?.id, utilityIds.join(",")],
    queryFn: async () => {
      if (!utilityIds.length) return [];
      const { data, error } = await supabase
        .from("utility_payments")
        .select("*")
        .in("utility_id", utilityIds)
        .order("payment_month", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && utilityIds.length > 0,
  });

  // reveal timers
  useEffect(() => {
    const revealedIds = Object.keys(revealed).filter((k) => revealed[k]);
    if (!revealedIds.length) return;
    const timer = setTimeout(() => setRevealed({}), 15_000);
    return () => clearTimeout(timer);
  }, [revealed]);

  const filtered = useMemo(() => {
    if (!propertyFilter) return [];
    return utilities.filter((u) => u.property_id === propertyFilter);
  }, [utilities, propertyFilter]);

  const paymentsByUtility = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of payments) {
      (map[p.utility_id] ||= []).push(p);
    }
    return map;
  }, [payments]);

  const latestActual = (utilId: string) => {
    const list = paymentsByUtility[utilId];
    if (!list?.length) return null;
    return Number(list[0].amount);
  };

  // ── Summary ──
  const summary = useMemo(() => {
    let expense = 0, income = 0, active = 0, attention = 0;
    const now = new Date();
    for (const u of filtered) {
      const actual = latestActual(u.id);
      const amount = actual ?? (u.monthly_cost ? Number(u.monthly_cost) : 0);
      if (u.is_income) income += amount;
      else expense += amount;
      if (u.status === "active" || !u.status) active++;
      const contractSoon = u.contract_end_date && differenceInDays(parseISO(u.contract_end_date), now) <= 60 && differenceInDays(parseISO(u.contract_end_date), now) >= 0;
      if ((u.status && u.status !== "active") || contractSoon) attention++;
    }
    return { net: expense - income, active, attention };
  }, [filtered, paymentsByUtility]);

  // ── Grouped ──
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const u of filtered) {
      const grp = u.account_group || getSvc(u.service_type).group;
      (g[grp] ||= []).push(u);
    }
    // Sort: active first, then non-active dimmed
    for (const key of Object.keys(g)) {
      g[key].sort((a, b) => {
        const aActive = !a.status || a.status === "active" ? 0 : 1;
        const bActive = !b.status || b.status === "active" ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return (a.provider_name || "").localeCompare(b.provider_name || "");
      });
    }
    return g;
  }, [filtered]);

  const groupSubtotal = (list: any[]) => {
    let sum = 0;
    for (const u of list) {
      const actual = latestActual(u.id);
      const amt = actual ?? (u.monthly_cost ? Number(u.monthly_cost) : 0);
      sum += u.is_income ? -amt : amt;
    }
    return sum;
  };

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const parsed = validateForm(utilityAccountSchema, form);
      if (!parsed.success) throw new Error(parsed.error);
      const payload: any = {
        user_id: user!.id,
        property_id: form.property_id,
        service_type: form.service_type,
        provider_name: form.provider_name,
        account_number: form.account_number || null,
        policy_number: form.policy_number || null,
        current_balance: form.current_balance ? Number(form.current_balance) : null,
        balance_as_of: form.balance_as_of || null,
        vendor_url: form.vendor_url || null,
        login_url: form.login_url || null,
        username: form.username || null,
        email_on_account: form.email_on_account || null,
        password_hint: form.password_hint || null,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
        monthly_cost: form.monthly_cost ? Number(form.monthly_cost) : null,
        is_autopay: !!form.is_autopay,
        due_day_of_month: form.due_day_of_month ? Number(form.due_day_of_month) : null,
        paid_via: form.paid_via || "direct",
        is_income: form.service_type === "rent_received" ? true : !!form.is_income,
        contract_end_date: form.contract_end_date || null,
        include_in_transfer: form.include_in_transfer !== false,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        notes: form.notes || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("property_utilities").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("property_utilities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property_utilities_full"] });
      setSheetOpen(false); setEditing(null); setPrefillType(null);
      toast.success(editing ? "Account updated" : "Account added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_utilities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property_utilities_full"] });
      setDeleteFor(null);
      toast.success("Account deleted");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, status_date, status_note }: any) => {
      const { error } = await supabase.from("property_utilities")
        .update({ status, status_date: status_date || null, status_note: status_note || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property_utilities_full"] });
      setStatusFor(null);
      toast.success("Status updated");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ utility, payment_month, amount, note }: any) => {
      const monthDate = startOfMonth(parseISO(payment_month + "-01"));
      const { error } = await supabase.from("utility_payments").upsert({
        utility_id: utility.id,
        property_id: utility.property_id,
        user_id: user!.id,
        payment_month: format(monthDate, "yyyy-MM-dd"),
        amount: Number(amount),
        note: note || null,
      }, { onConflict: "utility_id,payment_month" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utility_payments"] });
      setPayingFor(null);
      toast.success("Payment logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("utility_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utility_payments"] });
      toast.success("Payment removed");
    },
  });

  const openAdd = (prefill?: string) => {
    setEditing(null);
    setPrefillType(prefill ?? null);
    setSheetOpen(true);
  };
  const openEdit = (u: any) => {
    setEditing(u);
    setPrefillType(null);
    setSheetOpen(true);
  };

  const activeProperty = propertyFilter || properties[0]?.id;
  const { role: activeRole, canEdit: canEditActive } = useAccessRole(activeProperty ?? null);
  const isViewerOnly = !!propertyFilter && activeRole === "viewer";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Accounts & Utilities</h2>
          <p className="font-body text-sm text-muted-foreground">
            Track home accounts, budgets, and monthly payments in one place
          </p>
        </div>
        {!isViewerOnly && (
          <Button
            onClick={() => openAdd()}
            disabled={properties.length === 0}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body min-h-[44px]"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        )}
      </div>


      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="font-body text-xs uppercase text-muted-foreground">Net monthly</p>
              <p className="mt-1 font-display text-xl font-bold">${fmt$(summary.net)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="font-body text-xs uppercase text-muted-foreground">Active accounts</p>
              <p className="mt-1 font-display text-xl font-bold">{summary.active}</p>
            </CardContent>
          </Card>
          <Card className={cn("border-border/50", summary.attention > 0 && "border-amber-500/40 bg-amber-500/5")}>
            <CardContent className="p-4">
              <p className={cn("font-body text-xs uppercase", summary.attention > 0 ? "text-amber-600" : "text-muted-foreground")}>Attention</p>
              <p className={cn("mt-1 font-display text-xl font-bold", summary.attention > 0 && "text-amber-600")}>{summary.attention}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      {properties.length === 0 ? (
        <EmptyState title="Add a property first" />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse border-border/50"><CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <StarterChecklist onPick={(t) => openAdd(t)} />
      ) : (
        <div className="space-y-4">
          {GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
            <GroupSection
              key={g}
              groupKey={g}
              items={grouped[g]}
              subtotal={groupSubtotal(grouped[g])}
              payments={paymentsByUtility}
              revealed={revealed}
              onReveal={(id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] }))}
              onEdit={openEdit}
              onPay={setPayingFor}
              onHistory={(id: string) => setHistoryFor(historyFor === id ? null : id)}
              historyFor={historyFor}
              onStatus={setStatusFor}
              onDelete={setDeleteFor}
              onDeletePayment={(id: string) => deletePaymentMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Sheet */}
      {sheetOpen && (
        <AccountFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          editing={editing}
          prefillType={prefillType}
          defaultProperty={activeProperty}
          properties={properties}
          onSubmit={(form: any) => saveMutation.mutate(form)}
          submitting={saveMutation.isPending}
        />
      )}

      {/* Payment Dialog */}
      {payingFor && (
        <PaymentDialog
          utility={payingFor}
          onClose={() => setPayingFor(null)}
          onSubmit={(vals: any) => paymentMutation.mutate({ utility: payingFor, ...vals })}
          submitting={paymentMutation.isPending}
        />
      )}

      {/* Status Dialog */}
      {statusFor && (
        <StatusDialog
          utility={statusFor}
          onClose={() => setStatusFor(null)}
          onSubmit={(vals: any) => statusMutation.mutate({ id: statusFor.id, ...vals })}
          submitting={statusMutation.isPending}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteFor?.provider_name} and its payment history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteFor && deleteMutation.mutate(deleteFor.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Empty state ──
const EmptyState = ({ title }: { title: string }) => (
  <Card className="border-dashed border-2 border-border/50">
    <CardContent className="flex flex-col items-center justify-center py-16">
      <Zap className="mb-4 h-10 w-10 text-muted-foreground" />
      <p className="font-body text-sm text-muted-foreground">{title}</p>
    </CardContent>
  </Card>
);

const StarterChecklist = ({ onPick }: { onPick: (t: string) => void }) => (
  <Card className="border-dashed border-2 border-border/50">
    <CardContent className="flex flex-col items-center py-12">
      <Zap className="mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="mb-1 font-display text-lg font-semibold">No accounts yet</h3>
      <p className="mb-6 font-body text-sm text-muted-foreground">Get started with a common account type</p>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_TYPES.map((t) => {
          const s = getSvc(t);
          const Icon = s.icon;
          return (
            <Button key={t} variant="outline" size="sm" onClick={() => onPick(t)} className="rounded-full font-body min-h-[36px]">
              <Icon className="mr-1.5 h-3.5 w-3.5" /> {s.label}
            </Button>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

// ── Group section ──
const GroupSection = ({
  groupKey, items, subtotal, payments, revealed, onReveal, onEdit, onPay, onHistory, historyFor, onStatus, onDelete, onDeletePayment,
}: any) => {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-secondary/40 px-4 py-2.5 hover:bg-secondary/60 transition-colors">
        <div className="flex items-center gap-2">
          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
          <span className="font-display text-sm font-semibold">{GROUP_LABELS[groupKey]}</span>
          <Badge variant="secondary" className="font-body text-xs">{items.length}</Badge>
        </div>
        <span className="font-body text-sm text-muted-foreground">
          {subtotal < 0 ? "+" : ""}${fmt$(Math.abs(subtotal))}/mo
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {items.map((u: any) => (
          <AccountCard
            key={u.id}
            u={u}
            payments={payments[u.id] ?? []}
            revealed={revealed[u.id]}
            onReveal={() => onReveal(u.id)}
            onEdit={() => onEdit(u)}
            onPay={() => onPay(u)}
            onHistory={() => onHistory(u.id)}
            historyOpen={historyFor === u.id}
            onStatus={() => onStatus(u)}
            onDelete={() => onDelete(u)}
            onDeletePayment={onDeletePayment}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ── Account card ──
const AccountCard = ({ u, payments, revealed, onReveal, onEdit, onPay, onHistory, historyOpen, onStatus, onDelete, onDeletePayment }: any) => {
  const svc = getSvc(u.service_type);
  const Icon = svc.icon;
  const status = u.status || "active";
  const isDim = status !== "active";
  const now = new Date();
  const daysToRenew = u.contract_end_date ? differenceInDays(parseISO(u.contract_end_date), now) : null;
  const renewsSoon = daysToRenew !== null && daysToRenew >= 0 && daysToRenew < 60;
  const latest = payments[0];
  const displayAmount = latest ? Number(latest.amount) : (u.monthly_cost ? Number(u.monthly_cost) : null);

  const copyAccount = async () => {
    if (!u.account_number) return;
    await navigator.clipboard.writeText(u.account_number);
    toast.success("Copied");
  };

  const statusBadge = () => {
    if (status === "active") return null;
    const cls =
      status === "stop_requested" ? "border-amber-500/40 bg-amber-500/10 text-amber-700" :
      status === "paid_off" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" :
      "border-border bg-secondary text-muted-foreground";
    return (
      <Badge variant="outline" className={cn("font-body text-xs", cls)}>
        {STATUS_OPTIONS.find((s) => s.value === status)?.label}
        {u.status_date && ` · ${format(parseISO(u.status_date), "MMM d")}`}
      </Badge>
    );
  };

  const paidViaLabel = u.paid_via && u.paid_via !== "direct"
    ? PAID_VIA_OPTIONS.find((p) => p.value === u.paid_via)?.label
    : null;

  return (
    <Card className={cn("border-border/50 transition-shadow hover:shadow-card-hover", isDim && "opacity-70")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-sm font-semibold truncate">{u.provider_name}</h4>
                {u.is_autopay && <Badge variant="outline" className="font-body text-xs border-accent/40 bg-accent/10 text-accent">Autopay</Badge>}
                {u.is_income && <Badge variant="outline" className="font-body text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-700">Income</Badge>}
                {renewsSoon && <Badge variant="outline" className="font-body text-xs border-amber-500/40 bg-amber-500/10 text-amber-700">Renews in {daysToRenew}d</Badge>}
                {paidViaLabel && <Badge variant="outline" className="font-body text-xs">{paidViaLabel}</Badge>}
                {statusBadge()}
              </div>
              <p className="mt-0.5 font-body text-xs text-muted-foreground">
                {u.properties?.name} · {svc.label}
              </p>

              {u.account_number && (
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs">
                  <span>{revealed ? u.account_number : maskAccount(u.account_number)}</span>
                  <button
                    type="button"
                    onClick={onReveal}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title={revealed ? "Hide (auto-hides in 15s)" : "Reveal"}
                  >
                    {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={copyAccount}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}

              {(u.service_type === "mortgage" || u.service_type === "heloc") && u.current_balance !== null && u.current_balance !== undefined && (
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Balance: <span className="font-medium text-foreground">${fmt$(Number(u.current_balance))}</span>
                  {u.balance_as_of && ` as of ${format(parseISO(u.balance_as_of), "MMM d, yyyy")}`}
                </p>
              )}

              {/* Quick actions */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {u.contact_phone && (
                  <a href={`tel:${u.contact_phone}`}>
                    <Button size="sm" variant="outline" className="h-7 rounded-full font-body text-xs"><Phone className="mr-1 h-3 w-3" />Call</Button>
                  </a>
                )}
                {u.vendor_url && (
                  <a href={u.vendor_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 rounded-full font-body text-xs"><ExternalLink className="mr-1 h-3 w-3" />Website</Button>
                  </a>
                )}
                {u.login_url && (
                  <a href={u.login_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 rounded-full font-body text-xs"><LogIn className="mr-1 h-3 w-3" />Log in</Button>
                  </a>
                )}
                {u.contact_email && (
                  <a href={`mailto:${u.contact_email}`}>
                    <Button size="sm" variant="outline" className="h-7 rounded-full font-body text-xs"><Mail className="mr-1 h-3 w-3" />Email</Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-start justify-between gap-2 md:flex-col md:items-end md:text-right">
            <div>
              {displayAmount !== null && (
                <p className={cn("font-display text-lg font-bold", u.is_income && "text-emerald-600")}>
                  {u.is_income ? "+" : ""}${fmt$(displayAmount)}
                </p>
              )}
              {u.budget_amount && (
                <p className="font-body text-xs text-muted-foreground">Budget ${fmt$(Number(u.budget_amount))}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={onPay}><DollarSign className="mr-2 h-4 w-4" />Log payment</DropdownMenuItem>
                <DropdownMenuItem onClick={onHistory}><Receipt className="mr-2 h-4 w-4" />Payment history</DropdownMenuItem>
                <DropdownMenuItem onClick={onStatus}><AlertCircle className="mr-2 h-4 w-4" />Change status</DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}><FileText className="mr-2 h-4 w-4" />Attach document</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {historyOpen && (
          <PaymentHistory utility={u} payments={payments} onDelete={onDeletePayment} />
        )}
      </CardContent>
    </Card>
  );
};

// ── Payment history mini-table ──
const PaymentHistory = ({ utility, payments, onDelete }: any) => {
  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, i) => startOfMonth(subMonths(now, i)));
  const byMonth: Record<string, any> = {};
  for (const p of payments) byMonth[format(parseISO(p.payment_month), "yyyy-MM")] = p;
  const budget = utility.budget_amount ? Number(utility.budget_amount) : null;
  const ytd = payments
    .filter((p: any) => new Date(p.payment_month).getFullYear() === now.getFullYear())
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  return (
    <div className="mt-4 rounded-lg border border-border/50 bg-secondary/30 p-3">
      <p className="mb-2 font-body text-xs font-semibold uppercase text-muted-foreground">Last 12 months</p>
      <div className="space-y-1 text-sm">
        {months.map((m) => {
          const key = format(m, "yyyy-MM");
          const p = byMonth[key];
          const amt = p ? Number(p.amount) : null;
          const delta = amt !== null && budget ? amt - budget : null;
          return (
            <div key={key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 font-body">
              <span className="text-muted-foreground">{format(m, "MMM yyyy")}</span>
              <span className={cn("font-medium", !amt && "text-muted-foreground/60")}>
                {amt !== null ? `$${fmt$(amt)}` : "—"}
              </span>
              <span className={cn("text-xs", delta === null ? "text-muted-foreground/50" : delta <= 0 ? "text-emerald-600" : "text-destructive")}>
                {delta !== null ? `${delta <= 0 ? "" : "+"}$${fmt$(Math.abs(delta))}` : ""}
              </span>
              {p ? (
                <button onClick={() => onDelete(p.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : <span />}
            </div>
          );
        })}
        <div className="mt-2 border-t border-border/50 pt-2 flex justify-between font-body text-sm font-semibold">
          <span>YTD</span>
          <span>${fmt$(ytd)}</span>
        </div>
      </div>
    </div>
  );
};

// ── Payment dialog ──
const PaymentDialog = ({ utility, onClose, onSubmit, submitting }: any) => {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [amount, setAmount] = useState(utility.budget_amount?.toString() ?? utility.monthly_cost?.toString() ?? "");
  const [note, setNote] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Log payment · {utility.provider_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ payment_month: month, amount, note }); }} className="space-y-3">
          <div><Label className="font-body">Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required className="font-body" /></div>
          <div><Label className="font-body">Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="font-body" /></div>
          <div><Label className="font-body">Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="font-body" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">{submitting ? "Saving..." : "Log payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Status dialog ──
const StatusDialog = ({ utility, onClose, onSubmit, submitting }: any) => {
  const [status, setStatus] = useState(utility.status || "active");
  const [date, setDate] = useState(utility.status_date ?? format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState(utility.status_note ?? "");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Change status · {utility.provider_name}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ status, status_date: date, status_note: note }); }} className="space-y-3">
          <div>
            <Label className="font-body">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value} className="font-body">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="font-body">Effective date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-body" /></div>
          <div><Label className="font-body">Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="font-body" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">{submitting ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ── Add/Edit sheet ──
const AccountFormSheet = ({ open, onOpenChange, editing, prefillType, defaultProperty, properties, onSubmit, submitting }: any) => {
  const [form, setForm] = useState<any>(() => {
    if (editing) {
      return {
        ...emptyForm(editing.property_id, editing.service_type),
        ...Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, v ?? ""])),
        is_autopay: !!editing.is_autopay,
        is_income: !!editing.is_income,
        include_in_transfer: editing.include_in_transfer !== false,
      };
    }
    return emptyForm(defaultProperty || "", prefillType || "electric");
  });
  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));

  const isInsurance = ["homeowners_insurance", "renters_insurance", "flood_insurance", "umbrella_policy", "home_warranty"].includes(form.service_type);
  const isLoan = form.service_type === "mortgage" || form.service_type === "heloc";

  const grouped = useMemo(() => {
    const g: Record<string, ServiceType[]> = {};
    for (const s of SERVICE_TYPES) (g[s.group] ||= []).push(s);
    return g;
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">{editing ? "Edit account" : "Add account"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="mt-4 space-y-6" autoComplete="off">
          {/* Provider */}
          <Section title="Provider">
            <div><Label className="font-body">Property *</Label>
              <Select value={form.property_id} onValueChange={(v) => set({ property_id: v })}>
                <SelectTrigger className="font-body"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id} className="font-body">{getPropertyDisplayName(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="font-body">Type *</Label>
              <Select value={form.service_type} onValueChange={(v) => set({ service_type: v, is_income: v === "rent_received" ? true : form.is_income })}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{GROUP_LABELS[g]}</SelectLabel>
                      {grouped[g].map((s) => <SelectItem key={s.value} value={s.value} className="font-body">{s.label}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="font-body">Provider name *</Label>
              <Input value={form.provider_name} onChange={(e) => set({ provider_name: e.target.value })} required className="font-body" />
            </div>
          </Section>

          {/* Account */}
          <Section title="Account">
            <div><Label className="font-body">Account number</Label>
              <Input value={form.account_number} onChange={(e) => set({ account_number: e.target.value })} autoComplete="off" className="font-body" />
            </div>
            {isInsurance && (
              <div><Label className="font-body">Policy number</Label>
                <Input value={form.policy_number} onChange={(e) => set({ policy_number: e.target.value })} autoComplete="off" className="font-body" />
              </div>
            )}
            {isLoan && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="font-body">Current balance</Label>
                  <Input type="number" step="0.01" value={form.current_balance} onChange={(e) => set({ current_balance: e.target.value })} className="font-body" />
                </div>
                <div><Label className="font-body">Balance as of</Label>
                  <Input type="date" value={form.balance_as_of} onChange={(e) => set({ balance_as_of: e.target.value })} className="font-body" />
                </div>
              </div>
            )}
          </Section>

          {/* Access */}
          <Section title="Access">
            <div><Label className="font-body">Website</Label><Input value={form.vendor_url} onChange={(e) => set({ vendor_url: e.target.value })} placeholder="https://provider.com" className="font-body" /></div>
            <div><Label className="font-body">Login URL</Label><Input value={form.login_url} onChange={(e) => set({ login_url: e.target.value })} className="font-body" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-body">Username</Label><Input value={form.username} onChange={(e) => set({ username: e.target.value })} autoComplete="off" className="font-body" /></div>
              <div><Label className="font-body">Email on account</Label><Input type="email" value={form.email_on_account} onChange={(e) => set({ email_on_account: e.target.value })} autoComplete="off" className="font-body" /></div>
            </div>
            <div>
              <Label className="font-body">Password hint</Label>
              <Input value={form.password_hint} onChange={(e) => set({ password_hint: e.target.value })} autoComplete="off" className="font-body" placeholder="e.g. 1Password › Duke Energy" />
              <p className="mt-1 font-body text-xs text-muted-foreground">We never store passwords — note where yours lives, e.g. 1Password.</p>
            </div>
          </Section>

          {/* Billing */}
          <Section title="Billing">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-body">Budget ($)</Label><Input type="number" step="0.01" value={form.budget_amount} onChange={(e) => set({ budget_amount: e.target.value })} className="font-body" /></div>
              <div><Label className="font-body">Typical cost ($)</Label><Input type="number" step="0.01" value={form.monthly_cost} onChange={(e) => set({ monthly_cost: e.target.value })} className="font-body" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-body">Due day (1-31)</Label><Input type="number" min={1} max={31} value={form.due_day_of_month} onChange={(e) => set({ due_day_of_month: e.target.value })} className="font-body" /></div>
              <div><Label className="font-body">Paid via</Label>
                <Select value={form.paid_via} onValueChange={(v) => set({ paid_via: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAID_VIA_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value} className="font-body">{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div><p className="font-body text-sm font-medium">Autopay</p><p className="font-body text-xs text-muted-foreground">Charges post automatically</p></div>
              <Switch checked={form.is_autopay} onCheckedChange={(v) => set({ is_autopay: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div><p className="font-body text-sm font-medium">This is income</p><p className="font-body text-xs text-muted-foreground">Rent received or similar</p></div>
              <Switch checked={form.is_income} onCheckedChange={(v) => set({ is_income: v })} disabled={form.service_type === "rent_received"} />
            </div>
          </Section>

          {/* Dates */}
          <Section title="Dates">
            <div><Label className="font-body">Contract end date</Label><Input type="date" value={form.contract_end_date} onChange={(e) => set({ contract_end_date: e.target.value })} className="font-body" /></div>
          </Section>

          {/* Transfer */}
          <Section title="Transfer">
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <p className="font-body text-sm font-medium">Include in property transfer</p>
                <p className="font-body text-xs text-muted-foreground">New owner gets provider + phone + costs, never your account number or login.</p>
              </div>
              <Switch checked={form.include_in_transfer} onCheckedChange={(v) => set({ include_in_transfer: v })} />
            </div>
          </Section>

          {/* Contact */}
          <Section title="Provider contact">
            <div><Label className="font-body">Contact name</Label><Input value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} className="font-body" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="font-body">Phone</Label><Input value={form.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} className="font-body" /></div>
              <div><Label className="font-body">Email</Label><Input type="email" value={form.contact_email} onChange={(e) => set({ contact_email: e.target.value })} className="font-body" /></div>
            </div>
          </Section>

          <Section title="Notes">
            <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} className="font-body" rows={3} />
          </Section>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !form.property_id || !form.provider_name}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold min-h-[44px]">
              {submitting ? "Saving..." : editing ? "Save changes" : "Add account"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <p className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    <div className="space-y-3">{children}</div>
  </div>
);

export default PropertyUtilities;
