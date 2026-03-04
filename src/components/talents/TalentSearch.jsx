import { motion } from "framer-motion";
import { JobSearchForm } from "../home/JobsSearchForm";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.12 } },
};

export const TalentSearch = () => {
  return (
    <section>
      <JobSearchForm />

      <motion.div
        className="text-center mt-16"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.4 }}
      >
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl lg:text-3xl text-gray-300 mb-8"
        >
          Want employers to find you instead?
          <br className="hidden md:block" />
          <span className="text-2xl lg:text-3xl text-[#F5C518]">
            &nbsp;Upgrade for just $1.99/month.
          </span>
        </motion.p>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
            <Link to="/pricing">Boost profile for $1.99 →</Link>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};
