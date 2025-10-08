import { AnimatedPage } from "../AnimatedPage";
import { CTA } from "../home/CTA";
import { JobListings } from "../home/JobListings";
import { TalentFAQ } from "../talents/TalentFAQ";
import { TalentHero } from "../talents/TalentHero";
import { TalentPricing } from "../talents/TalentPricing";
import { TalentSearch } from "../talents/TalentSearch";
import { TalentTestimonials } from "../talents/TalentTestimonials";

export const ForTalents = () => {
  return (
    <AnimatedPage>
      <TalentHero />
      <TalentSearch />
      <JobListings />
      <TalentTestimonials />
      <TalentPricing />
      <TalentFAQ />
      <CTA />
    </AnimatedPage>
  );
};
