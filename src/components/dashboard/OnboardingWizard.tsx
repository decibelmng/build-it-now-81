import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, ArrowRight, CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
import SystemToggleGrid from "./SystemToggleGrid";
import { getDefaultRegistry, syncRegistryToInventory, type HomeSystemsRegistry } from "@/lib/homeSystemsRegistry";

const propertyTypes = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi Family" },
  { value: "other", label: "Other" },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    property_type: "single_family", bedrooms: "", bathrooms: "", sqft: "", year_built: "",
    latitude: null as number | null, longitude: null as number | null,
  });
  const [systemsRegistry, setSystemsRegistry] = useState<HomeSystemsRegistry>({});
  const [savingSystems, setSavingSystems] = useState(false);

  const { predictions, loading: acLoading, search: acSearch, getDetails, clear: acClear } = useAddressAutocomplete();
  const [showPredictions, setShowPredictions] = useState(false);
  const addressWrapperRef = useRef<HTMLDivElement>(null);

  const bathroomCount = form.bathrooms ? parseFloat(form.bathrooms) : 2;

  const addProperty = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("properties").insert({
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
      } as any).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (propertyId: string) => {
      setCreatedPropertyId(propertyId);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setSystemsRegistry(getDefaultRegistry(form.property_type, bathroomCount));
      setStep(2);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveSystems = async () => {
    if (!createdPropertyId || !user) return;
    setSavingSystems(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ home_systems: systemsRegistry, registry_completed: true } as any)
        .eq("id", createdPropertyId);
      if (error) throw error;

      await syncRegistryToInventory(createdPropertyId, user.id, systemsRegistry, [], bathroomCount);

      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["home_items"] });
      setStep(3);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSystems(false);
    }
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full border-border/50 shadow-premium">
          <CardContent className="flex flex-col items-center text-center p-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
              <Home className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mb-2 font-display text-2xl font-bold">Welcome to HomeLog!</h2>
            <p className="mb-6 font-body text-muted-foreground">
              Let's get started by adding your first property. This will be the foundation for tracking maintenance, documents, and costs.
            </p>
            <Button
              onClick={() => setStep(1)}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold px-8"
            >
              Add My First Property <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              onClick={onComplete}
              className="mt-4 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Systems setup
  if (step === 2) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-2xl w-full border-border/50 shadow-premium">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                <span className="text-2xl">🏠</span>
              </div>
              <h2 className="font-display text-xl font-bold">What does your home have?</h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Toggle the systems in your home. This powers your personalized savings forecast.
              </p>
            </div>

            <SystemToggleGrid
              registry={systemsRegistry}
              onChange={setSystemsRegistry}
              bathroomCount={bathroomCount}
              showAccuracy
            />

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => setStep(3)}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
              <Button
                onClick={handleSaveSystems}
                disabled={savingSystems}
                className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
              >
                {savingSystems ? "Saving..." : "Continue to Dashboard"}
                {!savingSystems && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Success
  if (step === 3) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full border-border/50 shadow-premium">
          <CardContent className="flex flex-col items-center text-center p-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage/10">
              <CheckCircle2 className="h-8 w-8 text-sage" />
            </div>
            <h2 className="mb-2 font-display text-2xl font-bold">You're all set!</h2>
            <p className="mb-6 font-body text-muted-foreground">
              Your property has been added. You can now start logging maintenance, uploading documents, and tracking costs.
            </p>
            <Button
              onClick={onComplete}
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold px-8"
            >
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Property form
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg w-full border-border/50 shadow-premium">
        <CardContent className="p-6">
          <h2 className="mb-1 font-display text-xl font-bold">Add Your First Property</h2>
          <p className="mb-5 font-body text-sm text-muted-foreground">Tell us about your home</p>
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
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onComplete} className="rounded-full font-body">Skip</Button>
              <Button type="submit" className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={addProperty.isPending}>
                {addProperty.isPending ? "Adding..." : "Add Property"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;
