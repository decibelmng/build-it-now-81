import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, HelpCircle, ChevronDown, Save, TrendingUp, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

interface PurchaseInfoSectionProps {
  property: Property;
}

const CurrencyInput = ({ value, onChange, id, placeholder }: { value: string; onChange: (v: string) => void; id?: string; placeholder?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
    <Input
      id={id}
      type="number"
      step="0.01"
      min="0"
      className="pl-7 font-body"
      placeholder={placeholder || "0.00"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const PurchaseInfoSection = ({ property }: PurchaseInfoSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saleOpen, setSaleOpen] = useState(false);

  const [purchase, setPurchase] = useState({
    purchase_price: "",
    purchase_date: "",
    purchase_closing_costs: "",
  });

  const [monthlyDeposit, setMonthlyDeposit] = useState("");

  const [sale, setSale] = useState({
    sale_price: "",
    sale_date: "",
    sale_closing_costs: "",
    agent_commissions: "",
  });

  useEffect(() => {
    setPurchase({
      purchase_price: property.purchase_price != null ? String(property.purchase_price) : "",
      purchase_date: property.purchase_date || "",
      purchase_closing_costs: property.purchase_closing_costs != null ? String(property.purchase_closing_costs) : "",
    });
    setSale({
      sale_price: property.sale_price != null ? String(property.sale_price) : "",
      sale_date: property.sale_date || "",
      sale_closing_costs: property.sale_closing_costs != null ? String(property.sale_closing_costs) : "",
      agent_commissions: property.agent_commissions != null ? String(property.agent_commissions) : "",
    });
    if (property.sale_price != null) setSaleOpen(true);
  }, [property]);

  const hasPurchaseInfo = property.purchase_price != null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .update({
          purchase_price: purchase.purchase_price ? parseFloat(purchase.purchase_price) : null,
          purchase_date: purchase.purchase_date || null,
          purchase_closing_costs: purchase.purchase_closing_costs ? parseFloat(purchase.purchase_closing_costs) : null,
          sale_price: sale.sale_price ? parseFloat(sale.sale_price) : null,
          sale_date: sale.sale_date || null,
          sale_closing_costs: sale.sale_closing_costs ? parseFloat(sale.sale_closing_costs) : null,
          agent_commissions: sale.agent_commissions ? parseFloat(sale.agent_commissions) : null,
        })
        .eq("id", property.id);
      if (error) throw error;

      // Auto-create/update purchase_price valuation record
      if (purchase.purchase_price && user) {
        const { data: existing } = await supabase
          .from("property_valuations")
          .select("id")
          .eq("property_id", property.id)
          .eq("valuation_type", "purchase_price")
          .maybeSingle();

        const valuationData = {
          property_id: property.id,
          user_id: user.id,
          valuation_type: "purchase_price" as const,
          valuation_date: purchase.purchase_date || property.created_at.split("T")[0],
          value: parseFloat(purchase.purchase_price),
          source: "Purchase",
          notes: purchase.purchase_closing_costs
            ? `Closing costs: $${parseFloat(purchase.purchase_closing_costs).toLocaleString()}`
            : null,
        };

        if (existing?.id) {
          await supabase
            .from("property_valuations")
            .update(valuationData)
            .eq("id", existing.id);
        } else {
          await supabase
            .from("property_valuations")
            .insert(valuationData);
        }

        // Try to link a closing_documents doc
        const { data: closingDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("property_id", property.id)
          .eq("category", "closing_documents")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const valId = existing?.id;
        if (closingDoc?.id && valId) {
          await supabase
            .from("property_valuations")
            .update({ document_id: closingDoc.id })
            .eq("id", valId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property_valuations"] });
      queryClient.invalidateQueries({ queryKey: ["property_equity_summary"] });
      toast({ title: "Purchase information saved!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      {/* CTA Banner if no purchase info */}
      {!hasPurchaseInfo && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-body text-sm font-medium text-foreground">
              Add your purchase information to start tracking your home's cost basis for tax purposes.
            </p>
            <p className="font-body text-xs text-muted-foreground mt-1">
              This can save you thousands when you sell.
            </p>
          </div>
        </div>
      )}

      {/* Purchase Information */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Purchase Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-body">Purchase Price</Label>
              <CurrencyInput
                value={purchase.purchase_price}
                onChange={(v) => setPurchase({ ...purchase, purchase_price: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Purchase Date</Label>
              <Input
                type="date"
                value={purchase.purchase_date}
                onChange={(e) => setPurchase({ ...purchase, purchase_date: e.target.value })}
                className="font-body"
              />
            </div>
          </div>
          <div className="space-y-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="font-body flex items-center gap-1 cursor-help">
                    Closing Costs <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </Label>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Include title insurance, attorney fees, recording fees, transfer taxes, and other costs paid at closing. Do not include lender fees if you financed.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <CurrencyInput
              value={purchase.purchase_closing_costs}
              onChange={(v) => setPurchase({ ...purchase, purchase_closing_costs: v })}
            />
          </div>

          {/* Sale Information - Collapsible */}
          <Collapsible open={saleOpen} onOpenChange={setSaleOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors font-body w-full">
              <ChevronDown className={`h-4 w-4 transition-transform ${saleOpen ? "rotate-180" : ""}`} />
              Planning to sell?
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <p className="font-body text-xs text-muted-foreground">
                Fill this in when you sell to calculate your estimated capital gain.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-body">Sale Price</Label>
                  <CurrencyInput
                    value={sale.sale_price}
                    onChange={(v) => setSale({ ...sale, sale_price: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Sale Date</Label>
                  <Input
                    type="date"
                    value={sale.sale_date}
                    onChange={(e) => setSale({ ...sale, sale_date: e.target.value })}
                    className="font-body"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-body">Closing Costs</Label>
                  <CurrencyInput
                    value={sale.sale_closing_costs}
                    onChange={(v) => setSale({ ...sale, sale_closing_costs: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Agent Commissions</Label>
                  <CurrencyInput
                    value={sale.agent_commissions}
                    onChange={(v) => setSale({ ...sale, agent_commissions: v })}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Purchase Info"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseInfoSection;
