import { DollarSign, FileText, Camera, Link, ClipboardList, ArrowRightLeft } from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Capital Improvement Tracker",
    description:
      "Every expense is automatically classified as a capital improvement or routine repair. Your running cost basis updates in real time — no spreadsheets, no shoeboxes of receipts.",
  },
  {
    icon: FileText,
    title: "IRS-Ready Reports",
    description:
      "Generate a professional tax report with one click: itemized improvements, contractor details, and receipt images — ready to hand to your CPA.",
  },
  {
    icon: Camera,
    title: "Receipt & Document Vault",
    description:
      "Snap a photo of a receipt or upload a PDF. HomeLog automatically files it under the right project, contractor, and category. Never lose a receipt again.",
  },
  {
    icon: Link,
    title: "Contractor Service Links",
    description:
      "Send your contractor a link to log their own work, upload photos, and attach invoices — directly into your home's timeline. No app download required.",
  },
  {
    icon: ClipboardList,
    title: "Complete Home Inventory",
    description:
      "Track every component, system, and appliance with install dates, warranties, and documentation. Know what you have and when it needs attention.",
  },
  {
    icon: ArrowRightLeft,
    title: "Transferable Home History",
    description:
      "Sell your home with a complete digital history attached. Increase buyer confidence, strengthen your negotiating position, and stand out in the market.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-section-warm">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-widest text-sage">
            The Full Platform
          </p>
          <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
            Everything you need to protect your home investment.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="font-body leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
