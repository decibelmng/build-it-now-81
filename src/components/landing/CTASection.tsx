import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 bg-section-sage">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-primary p-12 text-center shadow-premium md:p-16">
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Every day you wait is another receipt{" "}
            <span className="text-gradient-amber">you might lose.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-lg font-body text-lg text-primary-foreground/75">
            It takes 3 minutes to add your home. It could save you thousands when you sell.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold text-base px-10 py-6 rounded-full shadow-premium"
          >
            <Link to="/auth?mode=signup">
              Start Tracking for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 font-body text-sm text-primary-foreground/50">
            No credit card required. Free plan available forever.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
