import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function parseNum(val: string): number {
  return Number(val.replace(/[^0-9.]/g, "")) || 0;
}

const SavingsCalculator = () => {
  const [purchasePrice, setPurchasePrice] = useState("");
  const [yearsOwned, setYearsOwned] = useState("7");
  const [improvements, setImprovements] = useState("");

  const results = useMemo(() => {
    const pp = parseNum(purchasePrice);
    const imp = parseNum(improvements);
    const years = Number(yearsOwned);
    if (!pp || !imp) return null;

    const salePrice = pp * (1 + 0.04 * years);
    const gainWithout = Math.max(0, salePrice - pp);
    const gainWith = Math.max(0, salePrice - pp - imp);
    const taxWithout = gainWithout * 0.15;
    const taxWith = gainWith * 0.15;
    const savings = Math.max(0, taxWithout - taxWith);

    return {
      adjustedBasis: pp + imp,
      salePrice,
      taxWithout,
      taxWith,
      savings,
    };
  }, [purchasePrice, yearsOwned, improvements]);

  return (
    <section className="bg-secondary py-20 md:py-24">
      <div className="container mx-auto px-6">
        <h2 className="mx-auto mb-12 max-w-2xl text-center font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          See what you could save.
        </h2>

        <div className="mx-auto max-w-4xl">
          {/* Inputs */}
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <Label className="mb-2 block font-body text-sm font-medium text-foreground">
                Home purchase price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  placeholder="350,000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block font-body text-sm font-medium text-foreground">
                Years owned
              </Label>
              <Select value={yearsOwned} onValueChange={setYearsOwned}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y} {y === 1 ? "year" : "years"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1">
                <Label className="font-body text-sm font-medium text-foreground">
                  Estimated spent on improvements
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Think: new roof, kitchen/bath remodels, new HVAC, flooring,
                      windows, deck, landscaping
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  placeholder="25,000"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="mt-10 animate-fade-up rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div className="space-y-3 font-body">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your adjusted cost basis:</span>
                    <span className="font-semibold text-foreground">{fmt.format(results.adjustedBasis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated sale value:</span>
                    <span className="font-semibold text-foreground">{fmt.format(results.salePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Without tracking — estimated tax:</span>
                    <span className="font-semibold text-foreground">{fmt.format(results.taxWithout)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">With HomeLog tracking — estimated tax:</span>
                    <span className="font-semibold text-foreground">{fmt.format(results.taxWith)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-xl bg-sage-light p-6">
                  <span className="mb-1 font-body text-sm text-muted-foreground">Potential tax savings</span>
                  <span className="font-display text-4xl font-bold text-sage md:text-5xl">
                    {fmt.format(results.savings)}
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-accent px-10 py-6 font-body text-base font-semibold text-accent-foreground shadow-premium hover:bg-accent/90"
                >
                  <Link to="/auth?mode=signup">
                    Start Tracking My Improvements
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <p className="mx-auto mt-6 max-w-2xl text-center font-body text-xs leading-relaxed text-muted-foreground">
            Simplified estimate using 15% capital gains rate with basic appreciation. Actual savings depend on your tax bracket, filing status, and the $250K/$500K primary residence exclusion. HomeLog provides documentation — consult your tax advisor for specifics.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SavingsCalculator;
