import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 bg-section-sage">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-primary p-12 text-center shadow-premium md:p-16">
          <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Your Home Deserves a{" "}
            <span className="text-gradient-amber">Digital Passport</span>
          </h2>
          <p className="mx-auto mb-8 max-w-lg font-body text-lg text-primary-foreground/75">
            Join thousands of proactive homeowners who are taking control of
            their home's history, maintenance, and financial future.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold text-base px-10 py-6 rounded-full shadow-premium"
          >
            <Link to="/auth?mode=signup">
              Start Your HomeLog
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 font-body text-sm text-primary-foreground/50">
            Free to start · No credit card required
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
