import { HeroSection } from "../home/HeroSection";
import { JobListings } from "../home/JobListings";
import { PricingSection } from "../home/Pricing";
import { WhyDifferent } from "../home/WhyDifferent";
import { FeaturedTalents } from "../home/FeaturedTalents";
import { Testimonials } from "../home/Testimonials";
import { FAQSection } from "../home/FAQ";
import { CTA } from "../home/CTA";
import { LogoSection } from "../home/LogoSection";
import { AnimatedPage } from "../AnimatedPage";
import { SourceTalent } from "../home/SourceTalent";

export const QnduitLanding = () => {
  return (
    <AnimatedPage>
      <HeroSection />
      <LogoSection />
      <WhyDifferent />
      <FeaturedTalents />
      <SourceTalent />
      <JobListings />
      <Testimonials />
      <PricingSection />
      <FAQSection />
      <CTA />
    </AnimatedPage>
  );
};
