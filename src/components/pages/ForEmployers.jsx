import React from "react";
import { AnimatedPage } from "../AnimatedPage";
import { EmployerFAQ } from "../employers/EmployerFAQ";
import { CTA } from "../home/CTA";
import { EmployerPricing } from "../employers/EmployerPricing";
import { EmployerHero } from "../employers/EmployerHero";
import { SourceTalentForm } from "../home/SourceTalentForm";
import { FeaturedTalents } from "../home/FeaturedTalents";

export const ForEmployers = () => {
  return (
    <AnimatedPage>
      <EmployerHero />
      <SourceTalentForm />
      <FeaturedTalents />
      <EmployerPricing />
      <EmployerFAQ />
      <CTA />
    </AnimatedPage>
  );
};
