import heroHome from "@/assets/hero-home.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroHome}
          alt="Beautiful modern home at golden hour"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-6 py-24">
        <div className="max-w-2xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-2 text-sm text-amber-light opacity-0 animate-fade-up"
          >
            <Shield className="h-4 w-4" />
            <span className="font-body">The Digital Passport for Your Home</span>
          </div>

          <h1
            className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight text-primary-foreground opacity-0 animate-fade-up md:text-6xl lg:text-7xl"
            style={{ animationDelay: "0.15s" }}
          >
            Know Your Home.{" "}
            <span className="text-gradient-amber">Protect Your Investment.</span>
          </h1>

          <p
            className="mb-10 max-w-lg font-body text-lg leading-relaxed text-primary-foreground/80 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            HomeLog is the centralized, secure platform that captures every vital
            detail about your property — from maintenance history to financial
            planning. Your home's story, all in one place.
          </p>

          <div
            className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-up"
            style={{ animationDelay: "0.45s" }}
          >
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold text-base px-8 py-6 rounded-full shadow-premium">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-body font-medium text-base px-8 py-6 rounded-full"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
