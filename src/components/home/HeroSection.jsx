import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};

export const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    navigate(user?.userType === "talent" ? "/talent-dashboard" : "/dashboard");
  };

  const popularTitles = [
    "UI/UX Designer",
    "Full Stack Engineer",
    "Motion Designer",
    "Ghost Writer",
  ];

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-bg.png"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[#0E0E10]/90 to-[#0E0E10]/95" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight"
          >
            Where Talents Get Seen,
            <br />
            Valued, and <span className="text-[#F5C518]">Hired Fast!</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl lg:text-2xl text-gray-300 mb-8"
          >
            Qnduit connects skilled professionals with teams
            <br className="hidden sm:block" />
            ready to hire, turning visibility into opportunity.
          </motion.p>

          {/* Buttons */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 justify-center pb-6"
          >
            <button className="bg-[#3B82F6] text-white px-8 py-3 rounded-full hover:bg-[#5F8DD7] transition-colors cursor-pointer">
              {isAuthenticated ? (
                <span onClick={handleDashboardClick}>Go to your Dashboard</span>
              ) : (
                <Link to="/talent-signup">Join as Talent</Link>
              )}
            </button>
            <HashLink
              smooth
              to="/#source-talents"
              className="bg-white text-black px-8 py-3 rounded-full hover:bg-gray-100 transition-colors cursor-pointer inline-block"
            >
              Hire Talent
            </HashLink>
          </motion.div>

          {/* Popular Titles */}
          <motion.div
            className="max-w-4xl mx-auto mb-12"
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              <motion.span
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-gray-400 text-sm md:text-base w-full sm:w-auto mb-2 sm:mb-0"
              >
                Popular Titles
              </motion.span>
              {popularTitles.map((title, index) => (
                <motion.span
                  key={index}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="px-4 py-2 md:px-6 md:py-2 text-sm md:text-base bg-[#666666] text-[#fff] rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white transition-all duration-200"
                >
                  {title}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
