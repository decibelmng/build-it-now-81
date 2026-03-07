import { Receipt, TrendingDown, Clock } from "lucide-react";

const problems = [
  {
    icon: Receipt,
    title: "Lost receipts, forgotten projects",
    description:
      "That bathroom remodel from 2019? The new roof in 2021? If you can't prove it with documentation, the IRS doesn't count it toward your cost basis.",
  },
  {
    icon: TrendingDown,
    title: "The cost of not tracking",
    description:
      "When you sell, capital gains tax applies to sale price minus your cost basis. Every undocumented improvement is money you hand back in taxes.",
  },
  {
    icon: Clock,
    title: "It gets harder every year",
    description:
      "The longer you wait, the more documentation you lose. Contractors close, receipts fade, memories blur. Start now.",
  },
];

const ProblemSection = () => {
  return (
    <section className="bg-primary py-20 md:py-24">
      <div className="container mx-auto px-6">
        <h2 className="mx-auto mb-14 max-w-3xl text-center font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
          You're probably losing thousands in tax savings right now.
        </h2>

        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          {problems.map((item) => (
            <div key={item.title} className="text-center md:text-left">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 md:mx-0">
                <item.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="mb-2 font-display text-xl font-semibold text-primary-foreground">
                {item.title}
              </h3>
              <p className="font-body leading-relaxed text-primary-foreground/70">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
