const stats = [
  {
    number: "26",
    label: "Average capital improvements per home over 10 years",
    subtext: "Are you tracking all of yours?",
  },
  {
    number: "$47,000",
    label: "Average total improvement spend per homeowner",
    subtext: "That's $7,050 in potential tax savings at 15%",
  },
  {
    number: "73%",
    label: "of homeowners can't find all their improvement receipts",
    subtext: "HomeLog makes sure you never lose one",
  },
];

const SocialProofSection = () => {
  return (
    <section className="bg-primary py-20 md:py-24">
      <div className="container mx-auto px-6">
        <h2 className="mx-auto mb-14 max-w-3xl text-center font-display text-3xl font-bold text-primary-foreground md:text-4xl">
          Built for homeowners who see their home as an investment.
        </h2>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-8 text-center"
            >
              <p className="font-display text-4xl font-bold text-accent md:text-5xl">
                {stat.number}
              </p>
              <p className="mt-3 font-body text-sm font-medium text-primary-foreground/80">
                {stat.label}
              </p>
              <p className="mt-2 font-body text-xs text-primary-foreground/50">
                {stat.subtext}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center font-body text-xs text-primary-foreground/30">
          Based on national homeowner spending averages from industry data (NAHB, Census Bureau).
        </p>
      </div>
    </section>
  );
};

export default SocialProofSection;
