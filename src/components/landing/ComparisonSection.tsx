import { Check, X } from "lucide-react";

const withoutItems = [
  "Receipts lost in junk drawers and email inboxes",
  '"I think we spent about $15K on that kitchen?"',
  "Scrambling to find documentation at tax time",
  "Paying thousands more in capital gains than necessary",
  "Buyer has no idea what's been done to the home",
];

const withItems = [
  "Every receipt photographed and automatically categorized",
  "Exact costs, dates, contractors, and photos for every project",
  "One-click IRS-ready report with attached receipts",
  "Documented cost basis that reduces your tax bill",
  "Complete verified home history transfers to the buyer",
];

const ComparisonSection = () => {
  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto px-6">
        <h2 className="mx-auto mb-14 max-w-3xl text-center font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          Stop hoping you'll remember.{" "}
          <span className="text-gradient-amber">Start knowing you're covered.</span>
        </h2>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Without */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
            <h3 className="mb-6 font-display text-lg font-semibold text-destructive">
              Without HomeLog
            </h3>
            <ul className="space-y-4">
              {withoutItems.map((item) => (
                <li key={item} className="flex gap-3 font-body text-sm leading-relaxed text-muted-foreground">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-destructive/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* With */}
          <div className="rounded-2xl border border-sage/30 bg-sage-light p-8">
            <h3 className="mb-6 font-display text-lg font-semibold text-sage">
              With HomeLog
            </h3>
            <ul className="space-y-4">
              {withItems.map((item) => (
                <li key={item} className="flex gap-3 font-body text-sm leading-relaxed text-foreground">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
