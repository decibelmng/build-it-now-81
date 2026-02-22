import { ClipboardList, Home, PiggyBank } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Claim Your Home",
    description:
      "Sign up, verify your identity, and claim your property by entering your address and uploading a deed or utility bill.",
  },
  {
    number: "02",
    icon: Home,
    title: "Build Your Profile",
    description:
      "Add your home's details — specs, systems, finishes, documents. HomeLog organizes it all into a beautiful, searchable profile.",
  },
  {
    number: "03",
    icon: PiggyBank,
    title: "Plan & Save",
    description:
      "Get personalized maintenance recommendations and savings goals based on your home's age, systems, and lifecycle costs.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-widest text-sage">
            Simple & Secure
          </p>
          <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
            How HomeLog Works
          </h2>
          <p className="font-body text-lg text-muted-foreground">
            Get set up in minutes. Benefit for the life of your home.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line */}
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
