import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "We sold our home last year and saved over $4,200 in capital gains tax because every improvement was documented with receipts. HomeLog paid for itself 100x over.",
    name: "Sarah M.",
    detail: "Homeowner, Austin TX",
  },
  {
    quote: "I used to keep receipts in a shoebox. Now my CPA gets a one-click PDF with every improvement categorized. She actually thanked me.",
    name: "David R.",
    detail: "Homeowner, Portland OR",
  },
  {
    quote: "The savings forecast told me my roof and HVAC would both need replacing within 2 years. I started saving early and avoided going into debt for it.",
    name: "Michelle K.",
    detail: "Homeowner, Denver CO",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-muted/30 py-20 md:py-24">
      <div className="container mx-auto px-6">
        <h2 className="mx-auto mb-12 max-w-2xl text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Homeowners love HomeLog
        </h2>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="border-border bg-card shadow-card">
              <CardContent className="p-6">
                <Quote className="mb-3 h-5 w-5 text-accent/60" />
                <p className="font-body text-sm leading-relaxed text-foreground/80">
                  "{t.quote}"
                </p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="font-display text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="font-body text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
