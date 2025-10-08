import { AnimatedPage } from "../AnimatedPage";
import { CTA } from "../home/CTA";
import { FAQSection } from "../home/FAQ";
import { PricingSection } from "../home/Pricing";

export const PrincinPage = () => {
  return (
    <AnimatedPage>
      <PricingSection />
      <FAQSection />
      <CTA />
    </AnimatedPage>
  );
};
