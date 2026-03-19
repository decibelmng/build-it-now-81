import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustBar from "@/components/landing/TrustBar";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CapitalImprovementsSection from "@/components/landing/CapitalImprovementsSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import ValuePropSection from "@/components/landing/ValuePropSection";
import SecuritySection from "@/components/landing/SecuritySection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <CapitalImprovementsSection />
      <ComparisonSection />
      <HowItWorksSection />
      <SocialProofSection />
      <ValuePropSection />
      <SecuritySection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
