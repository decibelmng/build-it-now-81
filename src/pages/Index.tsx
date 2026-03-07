import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SavingsCalculator from "@/components/landing/SavingsCalculator";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import HomeCostsSection from "@/components/landing/HomeCostsSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SavingsCalculator />
      <FeaturesSection />
      <ComparisonSection />
      <HowItWorksSection />
      <HomeCostsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
