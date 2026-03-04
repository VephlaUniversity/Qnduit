import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.12 } },
};

export const TalentHero = () => {
  return (
    <section className="relative min-h-[60vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10]/95" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight"
          >
            Search Here. Apply
            <br />
            Here. <span className="text-[#F5C518]">Get Hired</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl lg:text-2xl text-gray-300 mb-8"
          >
            Search thousands of roles. Join free to apply
            <br className="hidden sm:block" />
            and get noticed by employers today
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};
