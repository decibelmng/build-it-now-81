import { PlusCircle, Layers, Shield } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PlusCircle,
    title: "Add your home",
    description:
      "Enter your address and basic details. We'll pull public records to give you a head start.",
  },
  {
    number: "02",
    icon: Layers,
    title: "Build your digital twin",
    description:
      "Log your home's components, track maintenance, upload documents, and classify improvements — all in one place.",
  },
  {
    number: "03",
    icon: Shield,
    title: "Stay protected",
    description:
      "Your home's history grows with every entry. When you need it — for insurance, taxes, or selling — everything is organized and ready.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-widest text-sage">
            Simple & Fast
          </p>
          <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
            Get started in minutes.
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-0.5 w-full translate-x-1/2 bg-border lg:block" />
              )}

              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
                <step.icon className="h-10 w-10 text-accent" />
                <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent font-body text-sm font-bold text-accent-foreground">
                  {step.number}
                </span>
              </div>

              <h3 className="mb-3 font-display text-2xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mx-auto max-w-xs font-body leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
