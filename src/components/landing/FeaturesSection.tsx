import { Home, FileText, TrendingUp, Shield, Users, ArrowLeftRight } from "lucide-react";

const features = [
  {
    icon: Home,
    title: "Complete Property Profile",
    description:
      "Catalog every detail — from paint colors and appliance models to roof age and HVAC specs. Never hunt for information again.",
  },
  {
    icon: FileText,
    title: "Maintenance Log",
    description:
      "Track every repair, upgrade, and service call with dates, costs, and contractor details. Build a living history of your home.",
  },
  {
    icon: TrendingUp,
    title: "Smart Savings Planner",
    description:
      "Know what's coming. Our predictive tool estimates future repair costs so you can budget proactively, not reactively.",
  },
  {
    icon: Shield,
    title: "Secure Document Vault",
    description:
      "Store deeds, warranties, insurance policies, and receipts in one encrypted, always-accessible location.",
  },
  {
    icon: Users,
    title: "Household Management",
    description:
      "Invite family members with role-based access. Primary owners control transfers; everyone stays informed.",
  },
  {
    icon: ArrowLeftRight,
    title: "Transferable History",
    description:
      "When you sell, transfer your home's complete digital record to the new owner — increasing trust and property value.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-section-warm">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-widest text-sage">
            Everything You Need
          </p>
          <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
            Your Home, Fully Managed
          </h2>
          <p className="font-body text-lg text-muted-foreground">
            HomeLog replaces scattered files, forgotten warranties, and surprise
            repair bills with one intelligent platform.
          </p>
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
