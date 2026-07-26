import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, BedDouble, Bath, Ruler, Calendar, Copy, Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { propertySchema, validateForm } from "@/lib/schemas";
import { usePropertyRoles } from "@/hooks/useAccessRole";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import PurchaseInfoSection from "@/components/dashboard/PurchaseInfoSection";
import CostBasisSummarySection from "@/components/dashboard/CostBasisSummarySection";
import HomeSystemsSettings from "@/components/dashboard/HomeSystemsSettings";
import LeaseDetailsCard from "@/components/dashboard/LeaseDetailsCard";
import DeletePropertyDialog from "@/components/dashboard/DeletePropertyDialog";
import { RESIDENCY_OPTIONS, useResidencyFeatures, type ResidencyType } from "@/hooks/useResidencyFeatures";
import { getPropertyDisplayName } from "@/lib/propertyDisplay";
import { useCurrentProperty } from "@/hooks/useCurrentProperty";
import { HomeTabs } from "@/components/property/SectionTabs";

type Property = Tables<"properties">;

const propertyTypes = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi Family" },
  { value: "apartment", label: "Apartment" },
  { value: "other", label: "Other" },
];

/**
 * Renders details for the current property only. This route lives at
 * /p/:slug/home/details so the scope is always exactly one property — never
 * a list. Adding new properties happens on /portfolio.
 */
const PropertyCards = ({ onNavigate }: { onNavigate?: (section: string) => void } = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activePropertyId } = useCurrentProperty();
  const { rolesByProperty } = usePropertyRoles();
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property_detail", activePropertyId],
    enabled: !!activePropertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", activePropertyId!)
        .single();
      if (error) throw error;
      return data as Property;
    },
  });

  const [form, setForm] = useState<null | {
    name: string; address: string; city: string; state: string; zip: string;
    residency_type: ResidencyType; property_type: string;
    bedrooms: string; bathrooms: string; sqft: string; year_built: string;
  }>(null);

  // Sync form with loaded property once
  const initialLoaded = property?.id;
  if (property && (!form || (form as any)._id !== initialLoaded)) {
    setForm({
      _id: initialLoaded,
      name: property.name ?? "",
      address: property.address ?? "",
      city: property.city ?? "",
      state: property.state ?? "",
      zip: property.zip ?? "",
      residency_type: ((property as any).residency_type ?? "owned") as ResidencyType,
      property_type: property.property_type ?? "single_family",
      bedrooms: property.bedrooms?.toString() ?? "",
      bathrooms: property.bathrooms?.toString() ?? "",
      sqft: property.sqft?.toString() ?? "",
      year_built: property.year_built?.toString() ?? "",
    } as any);
  }

  const updateProperty = useMutation({
    mutationFn: async () => {
      if (!property || !form) return;
      const payload = {
        name: form.name, address: form.address,
        city: form.city || null, state: form.state || null, zip: form.zip || null,
        property_type: form.property_type,
        residency_type: form.residency_type,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
        sqft: form.sqft ? parseInt(form.sqft) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
      };
      const validation = validateForm(propertySchema, payload);
      if (!validation.success) throw new Error(validation.error);
      const { error } = await supabase.from("properties").update(payload as any).eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_detail", activePropertyId] });
      queryClient.invalidateQueries({ queryKey: ["reachable_properties"] });
      toast({ title: "Saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatType = (t: string) => propertyTypes.find((p) => p.value === t)?.label ?? t;

  if (isLoading || !property || !form) {
    return (
      <div className="space-y-4">
        <HomeTabs />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  const role = rolesByProperty[property.id];
  const feat = useResidencyFeatures(property);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold">{getPropertyDisplayName(property)}</h2>
        <p className="font-body text-sm text-muted-foreground">Home details</p>
      </div>

      <HomeTabs />

      {/* Basics summary card */}
      <Card className="mb-6 border-border/50">
        <CardContent className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {role && role !== "owner" && (
              <Badge variant="outline" className="font-body text-[10px] capitalize">
                Shared · {role}
              </Badge>
            )}
            {(property as any).property_code && (
              <button
                onClick={() => copyCode((property as any).property_code)}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                title="Copy property code"
              >
                {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                {(property as any).property_code}
              </button>
            )}
          </div>
          <p className="mb-3 flex items-center gap-1 font-body text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {property.address}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""}
          </p>
          <div className="flex flex-wrap gap-3 font-body text-xs text-muted-foreground">
            {property.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{property.bedrooms} bed</span>}
            {property.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} bath</span>}
            {property.sqft != null && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{property.sqft.toLocaleString()} sqft</span>}
            {property.year_built != null && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{property.year_built}</span>}
          </div>
          <div className="mt-3">
            <span className="rounded-full bg-secondary px-2.5 py-1 font-body text-xs font-medium text-foreground">
              {formatType(property.property_type ?? "")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit basics */}
      <Card className="mb-6 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold">Edit basics</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); updateProperty.mutate(); }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-body">Property name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="font-body" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="font-body">City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">ZIP</Label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="font-body" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-body">Do you own or rent?</Label>
                <Select value={form.residency_type} onValueChange={(v) => setForm({ ...form, residency_type: v as ResidencyType })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESIDENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="font-body">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Property type</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="font-body">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Beds</Label>
                <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Baths</Label>
                <Input type="number" step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Sqft</Label>
                <Input type="number" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Year</Label>
                <Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} className="font-body" />
              </div>
            </div>
            <Button type="submit" disabled={updateProperty.isPending} className="font-body">
              <Save className="mr-2 h-4 w-4" /> Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {feat.showLeaseDetails && <LeaseDetailsCard property={property} />}

      <div className="mt-6"><PurchaseInfoSection property={property} /></div>

      <div className="mt-6">
        <HomeSystemsSettings
          propertyId={property.id}
          propertyType={property.property_type || "single_family"}
          homeSystems={(property as any)?.home_systems || null}
          registryCompleted={(property as any)?.registry_completed || false}
          onNavigate={onNavigate}
          bathroomCount={property.bathrooms || undefined}
          residencyType={(property as any).residency_type}
        />
      </div>

      {feat.showCostBasis && (
        <div className="mt-6"><CostBasisSummarySection propertyId={property.id} /></div>
      )}

      <Card className="mt-6 border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="font-body text-sm text-muted-foreground">
            Permanently delete this property and every record, file, and photo tied to it.
          </div>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            className="font-body"
            aria-label={`Delete ${getPropertyDisplayName(property)}`}
          >
            Delete this property
          </Button>
        </CardContent>
      </Card>

      <DeletePropertyDialog property={property} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
};

export default PropertyCards;
