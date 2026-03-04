import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { motion } from "framer-motion";

const staggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.12 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export const CTA = () => (
  <section className="relative py-20 overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0 z-0">
      <img
        src="/images/cta-bg.png"
        alt=""
        className="w-full h-full object-cover"
      />
    </div>

    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-900/10 z-10" />

    {/* Blur Effects */}
    <div className="absolute inset-0 opacity-10 z-10">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
    </div>

    <motion.div
      className="relative z-20 max-w-5xl mx-auto px-6 lg:px-8 text-center"
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.h2
        variants={fadeUp}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl lg:text-6xl mb-6"
      >
        Your next opportunity starts here.
        <br />
        <span className="text-yellow-400">Hire now or get discovered</span>
      </motion.h2>

      <motion.p
        variants={fadeUp}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-xl text-gray-300 mb-12"
      >
        Qnduit connects employers with skilled professionals
        <br />
        in one place. It's simple, fast, and built for results.
      </motion.p>

      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <button className="bg-blue-500 text-white px-8 py-4 rounded-full hover:bg-blue-600 transition-colors">
          <Link to="/talent-signup">Join as Talent</Link>
        </button>
        <HashLink
          smooth
          to="/#source-talents"
          className="bg-white text-black px-8 py-4 rounded-full hover:bg-gray-100 transition-colors cursor-pointer inline-block"
        >
          Hire Talent
        </HashLink>
      </motion.div>
    </motion.div>
  </section>
);
