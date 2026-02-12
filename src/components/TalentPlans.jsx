import { useState } from "react";
import { PlanCard } from "./PlanCards";

export const TalentPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Read userType and email from wherever your auth lives.
  // Falls back to URL params so the page works standalone in dev.
  const existingParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const userType = existingParams.get("userType") || "talent";
  const email = existingParams.get("email") || "";

  const planPrices = {
    free: 0.0,
    public: 1.99,
  };

  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
  };

  const handlePlanAction = (planType) => {
    const price = planPrices[planType];
    if (price === undefined) return;

    // Free plan skips payment entirely
    if (price === 0) {
      window.location.href = "/dashboard";
      return;
    }

    const params = new URLSearchParams({
      planName: planType.charAt(0).toUpperCase() + planType.slice(1),
      price: price.toString(),
      userType,
      email,
    });

    window.location.href = `/payment?${params.toString()}`;
  };

  const freeIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5.73937 16C5.84937 15.51 5.64937 14.81 5.29937 14.46L2.86937 12.03C2.10937 11.27 1.80937 10.46 2.02937 9.76C2.25937 9.06 2.96937 8.58 4.02937 8.4L7.14937 7.88C7.59937 7.8 8.14937 7.4 8.35937 6.99L10.0794 3.54C10.5794 2.55 11.2594 2 11.9994 2C12.7394 2 13.4194 2.55 13.9194 3.54L15.6394 6.99C15.7694 7.25 16.0394 7.5 16.3294 7.67L5.55937 18.44C5.41937 18.58 5.17937 18.45 5.21937 18.25L5.73937 16Z"
        fill="white"
      />
      <path
        d="M18.7008 14.4599C18.3408 14.8199 18.1408 15.5099 18.2608 15.9999L18.9508 19.0099C19.2408 20.2599 19.0608 21.1999 18.4408 21.6499C18.1908 21.8299 17.8908 21.9199 17.5408 21.9199C17.0308 21.9199 16.4308 21.7299 15.7708 21.3399L12.8408 19.5999C12.3808 19.3299 11.6208 19.3299 11.1608 19.5999L8.23078 21.3399C7.12078 21.9899 6.17078 22.0999 5.56078 21.6499C5.33078 21.4799 5.16078 21.2499 5.05078 20.9499L17.2108 8.7899C17.6708 8.3299 18.3208 8.1199 18.9508 8.2299L19.9608 8.3999C21.0208 8.5799 21.7308 9.0599 21.9608 9.7599C22.1808 10.4599 21.8808 11.2699 21.1208 12.0299L18.7008 14.4599Z"
        fill="white"
      />
    </svg>
  );

  const publicIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M21.2502 18.4701L19.6002 18.8601C19.2302 18.9501 18.9402 19.2301 18.8602 19.6001L18.5102 21.0701C18.3202 21.8701 17.3002 22.1201 16.7702 21.4901L13.7802 18.0501C13.5402 17.7701 13.6702 17.3301 14.0302 17.2401C15.8002 16.8101 17.3902 15.8201 18.5602 14.4101C18.7502 14.1801 19.0902 14.1501 19.3002 14.3601L21.5202 16.5801C22.2802 17.3401 22.0102 18.2901 21.2502 18.4701Z"
        fill="#B2CFFF"
      />
      <path
        d="M2.69919 18.4701L4.34919 18.8601C4.71919 18.9501 5.00919 19.2301 5.08919 19.6001L5.43919 21.0701C5.62919 21.8701 6.64919 22.1201 7.17919 21.4901L10.1692 18.0501C10.4092 17.7701 10.2792 17.3301 9.91919 17.2401C8.14919 16.8101 6.55919 15.8201 5.38919 14.4101C5.19919 14.1801 4.85919 14.1501 4.64919 14.3601L2.42919 16.5801C1.66919 17.3401 1.93919 18.2901 2.69919 18.4701Z"
        fill="#B2CFFF"
      />
      <path
        d="M12 2C8.13 2 5 5.13 5 9C5 10.45 5.43 11.78 6.17 12.89C7.25 14.49 8.96 15.62 10.95 15.91C11.29 15.97 11.64 16 12 16C12.36 16 12.71 15.97 13.05 15.91C15.04 15.62 16.75 14.49 17.83 12.89C18.57 11.78 19 10.45 19 9C19 5.13 15.87 2 12 2ZM15.06 8.78L14.23 9.61C14.09 9.75 14.01 10.02 14.06 10.22L14.3 11.25C14.49 12.06 14.06 12.38 13.34 11.95L12.34 11.36C12.16 11.25 11.86 11.25 11.68 11.36L10.68 11.95C9.96 12.37 9.53 12.06 9.72 11.25L9.96 10.22C10 10.03 9.93 9.75 9.79 9.61L8.94 8.78C8.45 8.29 8.61 7.8 9.29 7.69L10.36 7.51C10.54 7.48 10.75 7.32 10.83 7.16L11.42 5.98C11.74 5.34 12.26 5.34 12.58 5.98L13.17 7.16C13.25 7.32 13.46 7.48 13.65 7.51L14.72 7.69C15.39 7.8 15.55 8.29 15.06 8.78Z"
        fill="#B2CFFF"
      />
    </svg>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <PlanCard
        planType="free"
        title="Free Account"
        description="Get Started Instantly"
        price={0.0}
        icon={freeIcon}
        features={["Apply to jobs", "View jobs details", "Build your profile"]}
        ctaText="Create My Free Account →"
        isSelected={selectedPlan === "free"}
        onSelect={handleSelectPlan}
        onCTAClick={handlePlanAction}
        variant="default"
        disableWhenNotSelected={false}
      />

      <PlanCard
        planType="public"
        title="Public Listing"
        description="Your ticket to visibility"
        price={1.99}
        icon={publicIcon}
        features={[
          "Stay discoverable 24/7",
          "Stand out with a premium placement",
          "Showcase your skills to the right audience",
        ]}
        ctaText="List My Profile Here →"
        isSelected={selectedPlan === "public"}
        onSelect={handleSelectPlan}
        onCTAClick={handlePlanAction}
        variant="highlighted"
        disableWhenNotSelected={false}
      />
    </div>
  );
};
