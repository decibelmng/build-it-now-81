import { Check, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to manage your first home.",
    cta: "Get Started Free",
    ctaLink: "/auth?mode=signup",
    highlighted: false,
    features: [
      { text: "1 property", included: true },
      { text: "Maintenance logging & tracking", included: true },
      { text: "Recurring task templates", included: true },
      { text: "Utility tracking", included: true },
      { text: "Document vault", included: true },
      { text: "Home contacts", included: true },
      { text: "Property sharing & transfer", included: true },
      { text: "Export & Reports", included: false },
      { text: "Analytics & Insights", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$4.99",
    period: "/month",
    description: "For homeowners who want the complete picture.",
    cta: "Start Pro Trial",
    ctaLink: "/auth?mode=signup",
    highlighted: true,
    features: [
      { text: "Unlimited properties", included: true },
      { text: "Maintenance logging & tracking", included: true },
      { text: "Recurring task templates", included: true },
      { text: "Utility tracking", included: true },
      { text: "Document vault", included: true },
      { text: "Home contacts", included: true },
      { text: "Property sharing & transfer", included: true },
      { text: "Export & Reports", included: true },
      { text: "Analytics & Insights", included: true },
    ],
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="relative overflow-hidden bg-secondary py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2
            className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            Simple, Honest Pricing
          </h2>
          <p
            className="mt-4 font-body text-base text-muted-foreground opacity-0 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            Start free. Upgrade when you're ready for the full toolkit.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-2">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 opacity-0 animate-fade-up transition-shadow",
                tier.highlighted
                  ? "border-accent bg-card shadow-premium"
                  : "border-border bg-card shadow-card hover:shadow-card-hover"
              )}
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-4 py-1 font-body text-xs font-semibold text-accent-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-lg font-bold text-foreground">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">{tier.price}</span>
                  <span className="font-body text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-2 font-body text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-2.5">
                    {feature.included ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-accent" />
                    ) : (
                      <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={cn(
                        "font-body text-sm",
                        feature.included ? "text-foreground" : "text-muted-foreground/60"
                      )}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full rounded-full font-body font-semibold",
                  tier.highlighted
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Link to={tier.ctaLink}>
                  {tier.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <p
          className="mt-10 text-center font-body text-xs text-muted-foreground opacity-0 animate-fade-up"
          style={{ animationDelay: "0.55s" }}
        >
          Cancel anytime. No hidden fees. Secure checkout via Stripe.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
