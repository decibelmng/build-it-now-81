import { Home, Package, Clock, DollarSign, FileText, Link } from "lucide-react";

const features = [
  {
    icon: Home,
    title: "Home Inventory",
    description:
      "Track every component and system in your home — roof, HVAC, water heater, appliances, flooring — with install dates, warranties, and documentation.",
  },
  {
    icon: Package,
    title: "Personal Property",
    description:
      "Catalog your furniture, electronics, and valuables separately for insurance records. Personal items stay private and never transfer with the home.",
  },
  {
    icon: Clock,
    title: "Maintenance Timeline",
    description:
      "A chronological record of every repair, service call, and improvement — searchable, organized, and always at your fingertips.",
  },
  {
    icon: DollarSign,
    title: "Investment & Tax Tracker",
    description:
      "Every improvement is classified and tallied toward your cost basis. When you sell, generate an IRS-ready report to reduce your capital gains tax.",
  },
  {
    icon: FileText,
    title: "Document Vault",
    description:
      "Receipts, warranties, manuals, inspection reports, your deed — everything uploaded, categorized, and linked to the right item or project.",
  },
  {
    icon: Link,
    title: "Contractor Service Links",
    description:
      "Share a link with any contractor to log their work, upload photos, and attach invoices directly to your home's timeline. No app needed.",
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
            Your home's complete digital history — in one place.
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
