import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CapitalImprovementsSection from "@/components/landing/CapitalImprovementsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ValuePropSection from "@/components/landing/ValuePropSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <CapitalImprovementsSection />
      <HowItWorksSection />
      <ValuePropSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
