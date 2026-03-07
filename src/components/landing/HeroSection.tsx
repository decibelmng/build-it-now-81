import heroHome from "@/assets/hero-home.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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
          <h1
            className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight text-primary-foreground opacity-0 animate-fade-up md:text-6xl lg:text-7xl"
          >
            Protect your home.{" "}
            <span className="text-gradient-amber">Protect your investment.</span>
          </h1>

          <p
            className="mb-10 max-w-lg font-body text-lg leading-relaxed text-primary-foreground/80 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            HomeLog is the digital twin for your home — track every detail,
            document every improvement, and keep your biggest investment
            organized from the day you buy to the day you sell.
          </p>

          <div
            className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-body font-semibold text-base px-8 py-6 rounded-full shadow-premium">
              <Link to="/auth?mode=signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/60 text-white hover:bg-white/10 hover:text-white font-body font-medium text-base px-8 py-6 rounded-full backdrop-blur-sm"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              See how it works ↓
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
