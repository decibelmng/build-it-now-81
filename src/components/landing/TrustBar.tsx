import { Shield, Lock, Users } from "lucide-react";

const indicators = [
  { icon: Users, text: "500+ homeowners" },
  { icon: Shield, text: "256-bit SSL encryption" },
  { icon: Lock, text: "Row-level data isolation" },
];

const TrustBar = () => {
  return (
    <section className="border-y border-border bg-muted/50 py-5">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 px-6">
        {indicators.map((item) => (
          <div key={item.text} className="flex items-center gap-2">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-body text-xs font-medium text-muted-foreground">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustBar;
