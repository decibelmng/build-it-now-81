import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, BedDouble, Bath, Ruler, Calendar, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { propertySchema, validateForm } from "@/lib/schemas";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
import { usePropertyRoles } from "@/hooks/useAccessRole";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import PurchaseInfoSection from "@/components/dashboard/PurchaseInfoSection";
import CostBasisSummarySection from "@/components/dashboard/CostBasisSummarySection";
import HomeSystemsSettings from "@/components/dashboard/HomeSystemsSettings";
import LeaseDetailsCard from "@/components/dashboard/LeaseDetailsCard";
import { RESIDENCY_OPTIONS, useResidencyFeatures, type ResidencyType } from "@/hooks/useResidencyFeatures";

type Property = Tables<"properties">;

const propertyTypes = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi Family" },
  { value: "apartment", label: "Apartment" },
  { value: "other", label: "Other" },
];

interface PropertyCardsProps {
  onNavigate?: (section: string) => void;
}

const PropertyCards = ({ onNavigate }: PropertyCardsProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { rolesByProperty } = usePropertyRoles();
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const id = sessionStorage.getItem("selectedPropertyId");
    if (id) sessionStorage.removeItem("selectedPropertyId");
    return id;
  });
  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    property_type: "single_family", bedrooms: "", bathrooms: "", sqft: "", year_built: "",
    latitude: null as number | null, longitude: null as number | null,
  });
  const { predictions, loading: acLoading, search: acSearch, getDetails, clear: acClear } = useAddressAutocomplete();
  const [showPredictions, setShowPredictions] = useState(false);
  const addressWrapperRef = useRef<HTMLDivElement>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  // Pending incoming transfers
  const { data: incomingTransfers = [] } = useQuery({
    queryKey: ["incoming_transfers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_transfers")
        .select("*, properties(name, address, property_code)")
        .eq("status", "pending")
        .eq("to_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addProperty = useMutation({
    mutationFn: async () => {
      const validation = validateForm(propertySchema, form);
      if (!validation.success) throw new Error(validation.error);

      const { error } = await supabase.from("properties").insert({
        user_id: user!.id,
        name: form.name,
        address: form.address,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        property_type: form.property_type,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
        sqft: form.sqft ? parseInt(form.sqft) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setOpen(false);
      setForm({ name: "", address: "", city: "", state: "", zip: "", property_type: "single_family", bedrooms: "", bathrooms: "", sqft: "", year_built: "", latitude: null, longitude: null });
      toast({ title: "Property added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const acceptTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase.rpc("accept_property_transfer", { p_transfer_id: transferId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["incoming_transfers"] });
      toast({ title: "Property transferred to you!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const declineTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from("property_transfers")
        .update({ status: "declined" })
        .eq("id", transferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incoming_transfers"] });
      toast({ title: "Transfer declined" });
    },
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatType = (t: string) => propertyTypes.find((p) => p.value === t)?.label ?? t;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">My Home</h2>
          <p className="font-body text-sm text-muted-foreground">Manage your home</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body">
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Property</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); addProperty.mutate(); }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="font-body">Property Name *</Label>
                <Input placeholder="My Home" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="font-body" />
              </div>
              <div className="space-y-2 relative" ref={addressWrapperRef}>
                <Label className="font-body">Address *</Label>
                <div className="relative">
                  <Input
                    placeholder="Start typing an address..."
                    value={form.address}
                    onChange={(e) => {
                      setForm({ ...form, address: e.target.value });
                      acSearch(e.target.value);
                      setShowPredictions(true);
                    }}
                    onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                    onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                    required
                    className="font-body"
                  />
                  {acLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {showPredictions && predictions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                    {predictions.map((p) => (
                      <button
                        key={p.place_id}
                        type="button"
                        className="w-full px-3 py-2 text-left font-body text-sm hover:bg-accent/10 transition-colors first:rounded-t-md last:rounded-b-md"
                        onMouseDown={async () => {
                          const details = await getDetails(p.place_id);
                          if (details) {
                            setForm((prev) => ({
                              ...prev,
                              address: details.address,
                              city: details.city,
                              state: details.state,
                              zip: details.zip,
                              latitude: details.latitude,
                              longitude: details.longitude,
                            }));
                          }
                          acClear();
                          setShowPredictions(false);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {p.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">City</Label>
                  <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">State</Label>
                  <Input placeholder="CA" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">ZIP</Label>
                  <Input placeholder="90210" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="font-body" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Property Type</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="font-body">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label className="font-body">Beds</Label>
                  <Input type="number" placeholder="3" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Baths</Label>
                  <Input type="number" step="0.5" placeholder="2" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Sqft</Label>
                  <Input type="number" placeholder="1800" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Year</Label>
                  <Input type="number" placeholder="2005" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} className="font-body" />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={addProperty.isPending}>
                {addProperty.isPending ? "Adding..." : "Add Property"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Incoming transfer requests */}
      {incomingTransfers.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="font-display text-lg font-semibold">Pending Transfers</h3>
          {incomingTransfers.map((t: any) => (
            <Card key={t.id} className="border-accent/30 bg-accent/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-body text-sm font-medium">
                    Property transfer: <strong>{t.properties?.name}</strong>
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {t.properties?.address} · {t.properties?.property_code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
                    onClick={() => acceptTransfer.mutate(t.id)}
                    disabled={acceptTransfer.isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full font-body"
                    onClick={() => declineTransfer.mutate(t.id)}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardContent className="p-6"><div className="h-32 rounded-lg bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-display text-lg font-semibold">No properties yet</h3>
            <p className="mb-4 font-body text-sm text-muted-foreground">Add your first property to get started</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="rounded-full font-body">
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <Card
                key={property.id}
                className={`border-border/50 transition-shadow hover:shadow-card-hover cursor-pointer ${selectedPropertyId === property.id ? "ring-2 ring-accent" : ""}`}
                onClick={() => setSelectedPropertyId(selectedPropertyId === property.id ? null : property.id)}
              >
                <div className="h-36 rounded-t-lg bg-gradient-to-br from-accent/20 to-secondary flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-accent/60" />
                </div>
                <CardContent className="p-5">
                  <div className="mb-1 flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg font-semibold">{property.name}</h3>
                    {rolesByProperty[property.id] && rolesByProperty[property.id] !== "owner" && (
                      <Badge variant="outline" className="font-body text-[10px] capitalize">
                        Shared · {rolesByProperty[property.id]}
                      </Badge>
                    )}
                  </div>
                  {(property as any).property_code && (
                    <button
                      onClick={(e) => { e.stopPropagation(); copyCode((property as any).property_code, property.id); }}
                      className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                      title="Copy property code"
                    >
                      {copiedId === property.id ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                      {(property as any).property_code}
                    </button>
                  )}
                  <p className="mb-3 flex items-center gap-1 font-body text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.address}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-3 font-body text-xs text-muted-foreground">
                    {property.bedrooms && (
                      <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{property.bedrooms} bed</span>
                    )}
                    {property.bathrooms && (
                      <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} bath</span>
                    )}
                    {property.sqft && (
                      <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{property.sqft.toLocaleString()} sqft</span>
                    )}
                    {property.year_built && (
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{property.year_built}</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-body text-xs font-medium text-foreground">
                      {formatType(property.property_type)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Property details for selected property */}
          {selectedPropertyId && (
            <div className="mt-6 space-y-6">
              <PurchaseInfoSection
                property={properties.find((p) => p.id === selectedPropertyId)!}
              />
              <HomeSystemsSettings
                propertyId={selectedPropertyId}
                propertyType={properties.find((p) => p.id === selectedPropertyId)?.property_type || "single_family"}
                homeSystems={(properties.find((p) => p.id === selectedPropertyId) as any)?.home_systems || null}
                registryCompleted={(properties.find((p) => p.id === selectedPropertyId) as any)?.registry_completed || false}
                onNavigate={onNavigate}
                bathroomCount={properties.find((p) => p.id === selectedPropertyId)?.bathrooms || undefined}
              />
              <CostBasisSummarySection propertyId={selectedPropertyId} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PropertyCards;
