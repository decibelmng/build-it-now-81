import { Search, Receipt, ArrowRightLeft } from "lucide-react";

const props = [
  {
    icon: Search,
    text: "Never hunt for a paint code, model number, or warranty again.",
  },
  {
    icon: Receipt,
    text: "Never lose a receipt that could save you thousands at tax time.",
  },
  {
    icon: ArrowRightLeft,
    text: "Sell your home with a complete, verified history that builds buyer confidence.",
  },
];

const ValuePropSection = () => {
  return (
    <section className="bg-secondary py-20 md:py-24">
      <div className="container mx-auto px-6">
        <h2 className="mx-auto mb-14 max-w-3xl text-center font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          Your home has a story.{" "}
          <span className="text-gradient-amber">HomeLog keeps it.</span>
        </h2>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {props.map((prop) => (
            <div
              key={prop.text}
              className="flex flex-col items-center text-center rounded-2xl border border-border bg-card p-8"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
                <prop.icon className="h-7 w-7 text-accent" />
              </div>
              <p className="font-body text-base leading-relaxed text-foreground font-medium">
                {prop.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValuePropSection;
