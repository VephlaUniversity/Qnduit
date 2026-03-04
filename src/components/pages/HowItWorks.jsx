import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FAQSection } from "../home/FAQ";
import { CTA } from "../home/CTA";
const employerSteps = [
  {
    title: "Post Your Job",
    description:
      "Create detailed job listings that clearly describe the role, responsibilities, and requirements. Make it easy for the right candidates to find you.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    hasImage: false,
  },
  {
    title: "Discover Talent",
    description:
      "Search our database of qualified candidates using filters like skills, experience, and location. Access candidate profiles that are complete, verified, and ready to hire.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    hasImage: false,
  },
  {
    title: "",
    description: "",
    icon: null,
    hasImage: true,
  },
  {
    title: "",
    description: "",
    icon: null,
    hasImage: true,
  },
  {
    title: "Manage Applications",
    description:
      "Receive applications directly through the platform, review profiles efficiently, and communicate with candidates all in one place.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
    hasImage: false,
  },
  {
    title: "Hire with Confidence",
    description:
      "Connect with candidates who are a strong fit for your role, streamline interviews, and make offers quickly. Our platform helps reduce friction and ensures you find the right person for the job.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
    hasImage: false,
  },
];

const talentSteps = [
  {
    title: "Create Your Profile",
    description:
      "Sign up and build a profile that highlights your skills, experience, and career goals. The more complete your profile, the better opportunities we can match you with.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    hasImage: false,
  },
  {
    title: "Discover Opportunities",
    description:
      "Browse thousands of verified job listings tailored to your skills and preferences. Filter by industry, location, or role to find jobs that truly fit your goals.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    hasImage: false,
  },
  {
    title: "",
    description: "",
    icon: null,
    hasImage: true,
  },
  {
    title: "",
    description: "",
    icon: null,
    hasImage: true,
  },
  {
    title: "Apply Confidently",
    description:
      "Apply directly through the platform with your profile and resume. Track your applications and get updates on your progress in real-time.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
    hasImage: false,
  },
  {
    title: "Connect and Grow",
    description:
      "Engage with employers who are genuinely interested in your profile. Receive guidance, tips, and insights along the way to maximize your chances of landing the right role.",
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
    hasImage: false,
  },
];

const IsometricGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="212"
      height="198"
      viewBox="0 0 212 198"
      fill="none"
    >
      <path
        d="M68.5666 102.162C67.4684 103.722 67.2053 105.078 67.7467 106.243C68.2952 107.424 69.5291 108.079 71.4251 108.237L78.038 108.82L72.3962 96.6723L68.5666 102.162Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M167.083 93.3254L181.33 124L168.029 122.833L159.431 104.321L125.864 101.363L120.223 89.216L167.083 93.3254Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M99.1692 99.0264L104.02 109.471C102.058 110.371 100.17 110.751 98.3187 110.609C98.2811 110.608 98.2434 110.607 98.2057 110.606L91.4201 110.011L85.7783 97.864L99.1692 99.0264Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M106.831 88.0415L112.516 100.281L108.741 105.689C108.671 105.778 108.608 105.882 108.531 105.956C107.451 107.395 105.979 108.551 104.085 109.438L104.024 109.466L99.1724 99.0215L106.831 88.0415Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M106.83 88.0494L99.171 99.0294L85.7802 97.867L93.4466 86.8647L106.83 88.0494Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M159.434 104.313L147.751 121.042L144.102 126.28C142.619 128.412 140.622 130.281 138.121 131.862C137.085 132.515 135.975 133.129 134.768 133.694C130.682 135.588 126.815 136.39 123.165 136.101L123.052 136.098L82.9931 132.576L36.1105 128.458L15.9269 126.686C12.2408 126.357 9.84203 124.997 8.72262 122.627C7.59609 120.241 8.09187 117.545 10.2026 114.521L25.5281 92.5387L38.8286 93.706L59.11 95.4889L72.3953 96.6634L68.5658 102.153C67.4676 103.713 67.2045 105.069 67.7459 106.234C68.2944 107.415 69.5284 108.07 71.4244 108.228L78.037 108.811L91.3373 109.978L91.4198 109.996L98.2054 110.591C98.2054 110.591 98.2809 110.593 98.3186 110.594C100.17 110.735 102.058 110.356 104.02 109.455L104.081 109.427C105.975 108.54 107.447 107.384 108.527 105.945C108.604 105.871 108.667 105.767 108.738 105.678L112.512 100.27L112.567 100.188L125.868 101.356L159.434 104.313Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M180.534 53.7073L172.522 52.9955L153.752 51.3451L161.411 40.365C163.514 37.364 164.01 34.6671 162.906 32.2898L162.891 32.2591C161.765 29.8736 159.373 28.5285 155.687 28.2003L128.89 25.8453C125.211 25.5324 121.322 26.3265 117.19 28.2422C113.065 30.1733 109.952 32.6394 107.841 35.6629L100.182 46.6427L73.4082 44.2958C69.7221 43.9675 65.817 44.7688 61.6924 46.6999C57.5759 48.6084 54.4469 51.0817 52.3514 54.098L33.1968 81.5702L66.7789 84.5204L80.0637 85.6951L83.8859 80.1898C84.9841 78.63 86.5263 77.3851 88.5498 76.4564C89.7567 75.8914 90.9278 75.5298 92.0938 75.3574C92.8809 75.2503 93.6508 75.226 94.4256 75.2927L114.609 77.0653L121.2 77.6397C123.103 77.813 124.321 78.4749 124.878 79.6334C125.419 80.7991 125.156 82.1546 124.065 83.7297L120.236 89.2198L167.096 93.3291L174.574 82.6016L186.258 65.8721C188.361 62.871 188.849 60.1589 187.752 57.7969L187.738 57.7662C186.611 55.3807 184.213 54.0203 180.534 53.7073ZM140.354 50.1674L126.881 48.9877L113.58 47.8204L121.239 36.8404L148.013 39.1874L140.354 50.1674Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M121.227 36.8351L126.868 48.9823L113.568 47.815L121.227 36.8351Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M148.008 39.1771L140.349 50.1572L126.876 48.9773L121.234 36.8301L148.008 39.1771Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M187.749 57.7901L201.982 88.4343C203.101 90.8045 202.613 93.5167 200.502 96.5402L181.341 123.997L167.094 93.322L174.572 82.5947L186.255 65.8651C188.358 62.8641 188.846 60.1521 187.749 57.7901Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M162.887 32.2804L172.504 52.9861L153.734 51.3356L161.393 40.3556C163.496 37.3546 163.991 34.6577 162.887 32.2804Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M124.869 79.6344C125.411 80.8 125.148 82.1555 124.057 83.7307L120.227 89.2208L125.869 101.368L112.568 100.201L112.513 100.282L106.829 88.0431L93.4458 86.8584L85.7793 97.8607L91.4211 110.008L91.3384 109.991L80.0549 85.6961L83.8771 80.1908C84.9753 78.631 86.5174 77.3861 88.541 76.4574C89.7479 75.8924 90.919 75.5308 92.085 75.3584C92.8721 75.2513 93.6419 75.227 94.4168 75.2936L114.6 77.0663L121.191 77.6406C123.094 77.814 124.313 78.4759 124.869 79.6344Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M80.0642 85.6983L91.3477 109.993L78.0476 108.825L72.4058 96.6781L59.1206 95.5037L38.839 93.7208L33.1973 81.5735L66.7794 84.5237L80.0642 85.6983Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M159.436 104.315L173.683 134.99L158.35 156.957C156.255 159.973 153.126 162.446 149.016 164.37C144.885 166.286 140.979 167.087 137.301 166.774L30.1753 157.362C26.4892 157.034 24.0904 155.674 22.971 153.304L8.72412 122.629C9.84353 124.999 12.2424 126.359 15.9284 126.687L36.1121 128.46L82.9946 132.578L123.054 136.099L123.167 136.102C126.816 136.392 130.684 135.589 134.769 133.695C135.976 133.13 137.086 132.517 138.122 131.864C140.624 130.282 142.62 128.414 144.103 126.282L147.752 121.044L159.436 104.315Z"
        fill="#002B4D"
        stroke="#3B82F6"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
);

const StepCard = ({ step, index, isImageCard }) => {
  if (isImageCard) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
          delay: index * 0.08,
        }}
        className="rounded-2xl border border-[#2A2A2A] min-h-[220px] md:flex items-center justify-center hidden"
      >
        <IsometricGraphic />
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.08,
      }}
      className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-7 min-h-[220px] flex flex-col justify-start"
    >
      {step.icon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1 + index * 0.08,
          }}
          className="w-11 h-11 rounded-xl bg-[#3B82F6] flex items-center justify-center mb-5"
        >
          {step.icon}
        </motion.div>
      )}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.15 + index * 0.08,
        }}
        className="text-xl text-white mb-3"
      >
        {step.title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.2 + index * 0.08,
        }}
        className="text-gray-400 text-sm leading-relaxed"
      >
        {step.description}
      </motion.p>
    </motion.div>
  );
};
export const HowItWorksSection = () => {
  const [isForTalents, setIsForTalents] = useState(false);
  const currentSteps = isForTalents ? talentSteps : employerSteps;
  return (
    <section>
      {/* Header */}
      <motion.div
        className="text-center mb-16 pt-20 "
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-4xl lg:text-6xl text-white mb-4">
          How It Works: Connecting
          <br />
          Talent with <span className="text-[#F5C518]">Opportunity</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto py-12">
          We're a job marketplace built to make hiring and job searching
          simpler, faster, and more human.
        </p>
      </motion.div>
      {/* Toggle */}
      <motion.div
        className="flex items-center justify-center mb-14"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <span
          className={`text-lg mr-4 transition-colors duration-300 ${
            !isForTalents ? "text-white" : "text-gray-300"
          }`}
        >
          For Employers
        </span>
        <button
          onClick={() => setIsForTalents(!isForTalents)}
          className="relative w-20 h-10 rounded-full focus:outline-none transition-colors duration-300 cursor-pointer"
          style={{
            backgroundColor: isForTalents ? "#F5C518" : "#3B82F6",
          }}
        >
          <div
            className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${
              isForTalents ? "left-11" : "left-1"
            }`}
          />
        </button>
        <span
          className={`text-lg ml-4 transition-colors duration-300 ${
            isForTalents ? "text-white" : "text-gray-300"
          }`}
        >
          For Talents
        </span>
      </motion.div>
      {/* Cards Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isForTalents ? "talents" : "employers"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Top row: 2 text cards + 1 image card */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_0.5fr] gap-5 mb-5 px-18">
            <StepCard step={currentSteps[0]} index={0} isImageCard={false} />
            <StepCard step={currentSteps[1]} index={1} isImageCard={false} />
            <StepCard step={currentSteps[2]} index={2} isImageCard={true} />
          </div>
          {/* Bottom row: 1 image card + 2 text cards */}
          <div className="grid grid-cols-1 md:grid-cols-[0.5fr_1fr_1fr] gap-5 px-18">
            <StepCard step={currentSteps[3]} index={3} isImageCard={true} />
            <StepCard step={currentSteps[4]} index={4} isImageCard={false} />
            <StepCard step={currentSteps[5]} index={5} isImageCard={false} />
          </div>
        </motion.div>
      </AnimatePresence>

      <FAQSection />
      <CTA />
    </section>
  );
};
