import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, X, ClipboardList, Shield } from "lucide-react";
import HomeInventory from "@/components/dashboard/HomeInventory";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

interface HomeInventoryPageProps {
  onNavigate?: (section: string) => void;
}

const HomeInventoryPage = ({ onNavigate }: HomeInventoryPageProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"home_component" | "personal_item">("home_component");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);

  // Count items with warranties expiring in 90 days
  const { data: expiringCount = 0 } = useQuery({
    queryKey: ["expiring_warranty_count", user?.id],
    queryFn: async () => {
      const future = new Date();
      future.setDate(future.getDate() + 90);
      const { count, error } = await supabase
        .from("home_items")
        .select("id", { count: "exact", head: true })
        .not("warranty_expiry", "is", null)
        .lte("warranty_expiry", future.toISOString().split("T")[0]);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("name");
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  // Auto-select first property
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Query archived personal items (property_id is null)
  const { data: archivedItems = [] } = useQuery({
    queryKey: ["archived_personal_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("*")
        .eq("item_type", "personal_item")
        .is("property_id", null)
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user && activeTab === "personal_item",
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Home Inventory
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            Track every component, system, and personal item in your home.
          </p>
        </div>
        {properties.length > 1 && (
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-56 font-body">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-body">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {expiringCount > 0 && (
          <button
            onClick={() => setShowExpiringSoon(!showExpiringSoon)}
            className="shrink-0"
          >
            <Badge
              variant={showExpiringSoon ? "default" : "outline"}
              className="gap-1 cursor-pointer font-body"
            >
              <Shield className="h-3 w-3" />
              Expiring Soon ({expiringCount})
            </Badge>
          </button>
        )}
      </div>

      {properties.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">Add a property first to start tracking inventory.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "home_component" | "personal_item")} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="home_component" className="font-body">Home Components</TabsTrigger>
            <TabsTrigger value="personal_item" className="font-body">Personal Items</TabsTrigger>
          </TabsList>

          <TabsContent value="home_component">
            {selectedPropertyId && (
              <HomeInventory propertyId={selectedPropertyId} itemType="home_component" warrantyFilter={showExpiringSoon} onNavigate={onNavigate} />
            )}
          </TabsContent>

          <TabsContent value="personal_item">
            {showPersonalBanner && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-body text-sm text-foreground font-medium">Track your personal belongings</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    Personal items are for insurance records and peace of mind. They are private to your account and are never included when transferring your Home Profile to a new owner.
                  </p>
                </div>
                <button onClick={() => setShowPersonalBanner(false)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {selectedPropertyId && (
              <HomeInventory propertyId={selectedPropertyId} itemType="personal_item" warrantyFilter={showExpiringSoon} onNavigate={onNavigate} />
            )}

            {/* Archived personal items from transferred properties */}
            {archivedItems.length > 0 && (
              <div className="mt-8">
                <h3 className="font-display text-lg font-semibold mb-3 text-muted-foreground">
                  Archived Items (from transferred properties)
                </h3>
                <div className="space-y-2">
                  {archivedItems.map((item: any) => (
                    <Card key={item.id} className="border-border/50 opacity-75">
                      <CardContent className="p-4">
                        <h5 className="font-body text-sm font-semibold">{item.name}</h5>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
                          {item.brand && <span><strong>Brand:</strong> {item.brand}</span>}
                          {item.estimated_value && <span><strong>Value:</strong> ${Number(item.estimated_value).toLocaleString()}</span>}
                          {item.notes && <span className="italic">{item.notes}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default HomeInventoryPage;
