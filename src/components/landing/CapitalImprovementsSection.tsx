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
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function parseNum(val: string): number {
  return Number(val.replace(/[^0-9.]/g, "")) || 0;
}

const CapitalImprovementsSection = () => {
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
    <section className="bg-primary py-20 md:py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-2 items-start">
          {/* Left — Copy */}
          <div className="lg:py-4">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="font-body text-sm font-semibold text-accent">Capital Improvements</span>
            </div>

            <h2 className="mb-6 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
              Track improvements.{" "}
              <span className="text-gradient-amber">Save on taxes.</span>
            </h2>

            <p className="mb-6 font-body text-base leading-relaxed text-primary-foreground/75">
              Every capital improvement you make — from a new roof to a kitchen
              remodel — increases your home's cost basis and reduces your capital
              gains tax when you sell. Most homeowners lose track of these over
              the years. HomeLog keeps an itemized record with receipts,
              contractor details, and an IRS-ready report you can hand to your
              CPA.
            </p>

            <p className="mb-8 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-5 py-4 font-body text-sm leading-relaxed text-primary-foreground/60">
              The average homeowner makes $40,000+ in improvements over 10
              years. At a 15% capital gains rate, that's{" "}
              <strong className="text-accent">$6,000 you could save</strong>.
            </p>

            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="group inline-flex items-center gap-1 font-body text-sm font-semibold text-accent transition-colors hover:text-accent/80"
            >
              Learn how cost basis tracking works
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Right — Calculator */}
          <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-8">
            <h3 className="mb-6 font-display text-xl font-semibold text-primary-foreground">
              See what you could save
            </h3>

            <div className="space-y-5">
              <div>
                <Label className="mb-2 block font-body text-sm font-medium text-primary-foreground/70">
                  Home purchase price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/40">$</span>
                  <Input
                    className="pl-7 bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                    placeholder="350,000"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block font-body text-sm font-medium text-primary-foreground/70">
                  Years owned
                </Label>
                <Select value={yearsOwned} onValueChange={setYearsOwned}>
                  <SelectTrigger className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground">
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
                <Label className="mb-2 block font-body text-sm font-medium text-primary-foreground/70">
                  Estimated spent on improvements
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/40">$</span>
                  <Input
                    className="pl-7 bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                    placeholder="25,000"
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {results && (
              <div className="mt-8 animate-fade-up">
                <div className="space-y-3 font-body text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/50">Adjusted cost basis:</span>
                    <span className="font-semibold text-primary-foreground">{fmt.format(results.adjustedBasis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/50">Estimated sale value:</span>
                    <span className="font-semibold text-primary-foreground">{fmt.format(results.salePrice)}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-accent/15 p-5 text-center">
                  <span className="mb-1 block font-body text-sm text-primary-foreground/60">
                    Potential tax savings
                  </span>
                  <span className="font-display text-4xl font-bold text-accent">
                    {fmt.format(results.savings)}
                  </span>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-accent px-8 py-5 font-body text-base font-semibold text-accent-foreground shadow-premium hover:bg-accent/90"
                  >
                    <Link to="/auth?mode=signup">
                      Start Tracking My Improvements
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-5 font-body text-xs text-primary-foreground/30 text-center">
              Simplified estimate using 15% capital gains rate. Consult your tax advisor.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapitalImprovementsSection;
