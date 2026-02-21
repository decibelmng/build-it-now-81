import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Package, Zap, Droplets, Wind, Flame, Refrigerator, Trash2, Edit2,
  AlertTriangle, ClipboardList, X, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, isPast } from "date-fns";

const itemCategories = [
  { value: "hvac", label: "HVAC", icon: Wind },
  { value: "plumbing", label: "Plumbing", icon: Droplets },
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "appliance", label: "Appliance", icon: Refrigerator },
  { value: "structural", label: "Structural", icon: Package },
  { value: "exterior", label: "Exterior", icon: Package },
  { value: "general", label: "General", icon: Package },
];

const quickRefCategories = [
  { value: "filters", label: "Filters" },
  { value: "paint", label: "Paint Colors" },
  { value: "dimensions", label: "Dimensions" },
  { value: "utilities", label: "Utilities" },
  { value: "general", label: "General" },
];

interface HomeInventoryProps {
  propertyId: string;
}

const emptyItemForm = {
  name: "", category: "general", brand: "", model: "", serial_number: "",
  install_date: "", last_maintained: "", expected_replacement: "", warranty_expiry: "", notes: "",
};

const emptyQuickRef = { label: "", value: "", category: "general" };

const HomeInventory = ({ propertyId }: HomeInventoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [itemOpen, setItemOpen] = useState(false);
  const [quickRefOpen, setQuickRefOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [quickRefForm, setQuickRefForm] = useState(emptyQuickRef);
  const [editingRef, setEditingRef] = useState<string | null>(null);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["home_items", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_items")
        .select("*")
        .eq("property_id", propertyId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!propertyId,
  });

  const { data: quickRefs = [], isLoading: refsLoading } = useQuery({
    queryKey: ["home_quick_refs", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_quick_refs")
        .select("*")
        .eq("property_id", propertyId)
        .order("category", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!propertyId,
  });

  const upsertItem = useMutation({
    mutationFn: async () => {
      const payload = {
        property_id: propertyId,
        user_id: user!.id,
        name: itemForm.name,
        category: itemForm.category,
        brand: itemForm.brand || null,
        model: itemForm.model || null,
        serial_number: itemForm.serial_number || null,
        install_date: itemForm.install_date || null,
        last_maintained: itemForm.last_maintained || null,
        expected_replacement: itemForm.expected_replacement || null,
        warranty_expiry: itemForm.warranty_expiry || null,
        notes: itemForm.notes || null,
      };
      if (editingItem) {
        const { error } = await supabase.from("home_items").update(payload).eq("id", editingItem);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_items", propertyId] });
      setItemOpen(false);
      setEditingItem(null);
      setItemForm(emptyItemForm);
      toast({ title: editingItem ? "Item updated" : "Item added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_items", propertyId] });
      toast({ title: "Item removed" });
    },
  });

  const upsertQuickRef = useMutation({
    mutationFn: async () => {
      const payload = {
        property_id: propertyId,
        user_id: user!.id,
        label: quickRefForm.label,
        value: quickRefForm.value,
        category: quickRefForm.category,
      };
      if (editingRef) {
        const { error } = await supabase.from("home_quick_refs").update(payload).eq("id", editingRef);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_quick_refs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_quick_refs", propertyId] });
      setQuickRefOpen(false);
      setEditingRef(null);
      setQuickRefForm(emptyQuickRef);
      toast({ title: editingRef ? "Reference updated" : "Reference added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteQuickRef = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_quick_refs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home_quick_refs", propertyId] });
      toast({ title: "Reference removed" });
    },
  });

  const openEditItem = (item: any) => {
    setEditingItem(item.id);
    setItemForm({
      name: item.name,
      category: item.category,
      brand: item.brand || "",
      model: item.model || "",
      serial_number: item.serial_number || "",
      install_date: item.install_date || "",
      last_maintained: item.last_maintained || "",
      expected_replacement: item.expected_replacement || "",
      warranty_expiry: item.warranty_expiry || "",
      notes: item.notes || "",
    });
    setItemOpen(true);
  };

  const openEditRef = (ref: any) => {
    setEditingRef(ref.id);
    setQuickRefForm({ label: ref.label, value: ref.value, category: ref.category });
    setQuickRefOpen(true);
  };

  const getCategoryIcon = (cat: string) => {
    const found = itemCategories.find((c) => c.value === cat);
    return found ? found.icon : Package;
  };

  const getReplacementStatus = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const days = differenceInDays(d, new Date());
    if (isPast(d)) return { label: "Overdue", variant: "destructive" as const };
    if (days <= 90) return { label: "Soon", variant: "default" as const };
    return null;
  };

  // Group items by category
  const groupedItems = items.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Group quick refs by category
  const groupedRefs = quickRefs.reduce((acc: Record<string, any[]>, ref: any) => {
    const cat = ref.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ref);
    return acc;
  }, {});

  return (
    <div className="mt-8 space-y-6">
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="font-body">
            <Package className="mr-2 h-4 w-4" /> Home Inventory ({items.length})
          </TabsTrigger>
          <TabsTrigger value="quickref" className="font-body">
            <ClipboardList className="mr-2 h-4 w-4" /> Quick Reference ({quickRefs.length})
          </TabsTrigger>
        </TabsList>

        {/* ───── INVENTORY TAB ───── */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-muted-foreground">
              Track every item in your home — ages, serial numbers, maintenance dates, and replacements.
            </p>
            <Dialog open={itemOpen} onOpenChange={(o) => { setItemOpen(o); if (!o) { setEditingItem(null); setItemForm(emptyItemForm); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body">
                  <Plus className="mr-1 h-4 w-4" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingItem ? "Edit Item" : "Add Home Item"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); upsertItem.mutate(); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label className="font-body">Item Name *</Label>
                      <Input placeholder="e.g. Water Heater" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Category</Label>
                      <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                        <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {itemCategories.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="font-body">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Brand</Label>
                      <Input placeholder="e.g. Rheem" value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Model</Label>
                      <Input placeholder="Model number" value={itemForm.model} onChange={(e) => setItemForm({ ...itemForm, model: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Serial Number</Label>
                      <Input placeholder="S/N" value={itemForm.serial_number} onChange={(e) => setItemForm({ ...itemForm, serial_number: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Install Date</Label>
                      <Input type="date" value={itemForm.install_date} onChange={(e) => setItemForm({ ...itemForm, install_date: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Last Maintained</Label>
                      <Input type="date" value={itemForm.last_maintained} onChange={(e) => setItemForm({ ...itemForm, last_maintained: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Expected Replacement</Label>
                      <Input type="date" value={itemForm.expected_replacement} onChange={(e) => setItemForm({ ...itemForm, expected_replacement: e.target.value })} className="font-body" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Warranty Expiry</Label>
                      <Input type="date" value={itemForm.warranty_expiry} onChange={(e) => setItemForm({ ...itemForm, warranty_expiry: e.target.value })} className="font-body" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Notes</Label>
                    <Textarea placeholder="Additional details..." value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} className="font-body" />
                  </div>
                  <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={upsertItem.isPending}>
                    {upsertItem.isPending ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {itemsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : items.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-body text-sm text-muted-foreground mb-2">No items tracked yet</p>
                <p className="font-body text-xs text-muted-foreground max-w-sm text-center">
                  Start adding items like your water heater, HVAC system, appliances, and more to build your home's digital twin.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedItems).map(([cat, catItems]) => {
              const catInfo = itemCategories.find((c) => c.value === cat);
              const CatIcon = catInfo?.icon || Package;
              return (
                <div key={cat}>
                  <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                    <CatIcon className="h-4 w-4" /> {catInfo?.label || cat}
                  </h4>
                  <div className="space-y-2">
                    {(catItems as any[]).map((item) => {
                      const status = getReplacementStatus(item.expected_replacement);
                      return (
                        <Card key={item.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-body text-sm font-semibold">{item.name}</h5>
                                  {status && (
                                    <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                                      <AlertTriangle className="mr-1 h-3 w-3" />{status.label}
                                    </Badge>
                                  )}
                                  {item.warranty_expiry && isPast(new Date(item.warranty_expiry)) && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                      Warranty expired
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
                                  {item.brand && <span><strong>Brand:</strong> {item.brand}</span>}
                                  {item.model && <span><strong>Model:</strong> {item.model}</span>}
                                  {item.serial_number && <span><strong>S/N:</strong> {item.serial_number}</span>}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-muted-foreground">
                                  {item.install_date && <span><strong>Installed:</strong> {format(new Date(item.install_date), "MMM yyyy")}</span>}
                                  {item.last_maintained && <span><strong>Last maintained:</strong> {format(new Date(item.last_maintained), "MMM d, yyyy")}</span>}
                                  {item.expected_replacement && <span><strong>Replace by:</strong> {format(new Date(item.expected_replacement), "MMM yyyy")}</span>}
                                  {item.warranty_expiry && <span><strong>Warranty:</strong> {format(new Date(item.warranty_expiry), "MMM yyyy")}</span>}
                                </div>
                                {item.notes && (
                                  <p className="mt-1 font-body text-xs text-muted-foreground italic">{item.notes}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ───── QUICK REFERENCE TAB ───── */}
        <TabsContent value="quickref" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-muted-foreground">
              Quick-access specs — filter sizes, paint colors, dimensions, and more.
            </p>
            <Dialog open={quickRefOpen} onOpenChange={(o) => { setQuickRefOpen(o); if (!o) { setEditingRef(null); setQuickRefForm(emptyQuickRef); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body">
                  <Plus className="mr-1 h-4 w-4" /> Add Reference
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingRef ? "Edit Reference" : "Add Quick Reference"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); upsertQuickRef.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-body">Label *</Label>
                    <Input placeholder="e.g. HVAC Filter Size" value={quickRefForm.label} onChange={(e) => setQuickRefForm({ ...quickRefForm, label: e.target.value })} required className="font-body" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Value *</Label>
                    <Input placeholder="e.g. 20x25x1 (qty: 3)" value={quickRefForm.value} onChange={(e) => setQuickRefForm({ ...quickRefForm, value: e.target.value })} required className="font-body" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body">Category</Label>
                    <Select value={quickRefForm.category} onValueChange={(v) => setQuickRefForm({ ...quickRefForm, category: v })}>
                      <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {quickRefCategories.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="font-body">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold" disabled={upsertQuickRef.isPending}>
                    {upsertQuickRef.isPending ? "Saving..." : editingRef ? "Update" : "Add Reference"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {refsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : quickRefs.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-body text-sm text-muted-foreground mb-2">No quick references yet</p>
                <p className="font-body text-xs text-muted-foreground max-w-sm text-center">
                  Add things you always need to look up — filter sizes, paint colors, breaker labels, and more.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedRefs).map(([cat, catRefs]) => {
              const catInfo = quickRefCategories.find((c) => c.value === cat);
              return (
                <div key={cat}>
                  <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {catInfo?.label || cat}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(catRefs as any[]).map((ref) => (
                      <Card key={ref.id} className="border-border/50">
                        <CardContent className="flex items-center justify-between p-3">
                          <div className="min-w-0">
                            <p className="font-body text-xs text-muted-foreground">{ref.label}</p>
                            <p className="font-body text-sm font-semibold truncate">{ref.value}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRef(ref)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteQuickRef.mutate(ref.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomeInventory;
