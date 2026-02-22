import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const homeElements = [
  { name: "Roof", cost: 9500, lifespan: 27, icon: "🏠", category: "Exterior" },
  { name: "Water Heater", cost: 1800, lifespan: 15, icon: "🔥", category: "Plumbing" },
  { name: "HVAC System", cost: 7500, lifespan: 20, icon: "❄️", category: "Climate" },
  { name: "Exterior Paint", cost: 4000, lifespan: 10, icon: "🎨", category: "Exterior" },
  { name: "Garage Door", cost: 1200, lifespan: 25, icon: "🚗", category: "Exterior" },
  { name: "Dishwasher", cost: 700, lifespan: 12, icon: "🍽️", category: "Appliance" },
  { name: "Carpet / Flooring", cost: 5000, lifespan: 15, icon: "🪵", category: "Interior" },
  { name: "Siding", cost: 12000, lifespan: 30, icon: "🧱", category: "Exterior" },
];

const HomeCostsSection = () => {
  const totalAnnual = homeElements.reduce((sum, el) => sum + el.cost / el.lifespan, 0);

  return (
    <section id="costs" className="bg-secondary/30 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Badge variant="outline" className="mb-4 font-body text-xs tracking-wide">
            True Cost of Homeownership
          </Badge>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            What Your Home Really Costs
          </h2>
          <p className="mt-4 font-body text-muted-foreground">
            Every component has a lifespan. Knowing replacement costs helps you save proactively — not reactively.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {homeElements.map((el) => {
            const annualCost = el.cost / el.lifespan;
            return (
              <Card key={el.name} className="border-border/50 transition-shadow hover:shadow-card-hover">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{el.icon}</span>
                    <Badge variant="secondary" className="font-body text-[10px]">
                      {el.category}
                    </Badge>
                  </div>
                  <h3 className="font-display text-sm font-semibold">{el.name}</h3>
                  <p className="mt-1 font-display text-xl font-bold text-primary">
                    ${el.cost.toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                    <span className="font-body text-xs text-muted-foreground">
                      Avg. {el.lifespan} years
                    </span>
                    <span className="font-body text-xs font-medium text-accent-foreground">
                      ~${Math.round(annualCost)}/yr
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-md rounded-2xl bg-primary p-6 text-center text-primary-foreground">
          <p className="font-body text-sm opacity-80">Estimated annual set-aside for these items alone</p>
          <p className="mt-1 font-display text-3xl font-bold">
            ${Math.round(totalAnnual).toLocaleString()}/yr
          </p>
          <p className="mt-1 font-body text-xs opacity-60">
            That's ~${Math.round(totalAnnual / 12)}/month you should be saving
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomeCostsSection;
