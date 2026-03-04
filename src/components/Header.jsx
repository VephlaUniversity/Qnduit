import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./hooks/useAuth";
import { LayoutDashboardIcon } from "lucide-react";

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07 } },
};

const fadeDown = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
};

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = React.useState(false);

  const isActive = (path) => location.pathname === path;

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { to: "/talents", label: "For Talent" },
    { to: "/employers", label: "For Employers" },
    { to: "/pricing", label: "Pricing" },
    { to: "/about-us", label: "About Us" },
    { to: "/blog", label: "Blog" },
  ];

  const handleDashboardClick = () => {
    setIsMenuOpen(false);
    const user = JSON.parse(localStorage.getItem("user") || "null");
    navigate(user?.userType === "talent" ? "/talent-dashboard" : "/dashboard");
  };

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${
        scrolled ? "bg-[#0a0e1a]" : "bg-[rgba(6,67,167,0.20)]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
        <motion.div
          className="flex justify-between items-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Logo */}
          <motion.div
            variants={fadeDown}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center cursor-pointer flex-shrink-0"
          >
            <Link to="/" className="flex items-center">
              <img src="/images/header-logo.png" alt="" className="w-5" />
              <span className="text-lg md:text-xl pl-2 text-white">QNDUIT</span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.nav
            className="hidden md:flex items-center space-x-5 lg:space-x-8"
            variants={staggerContainer}
          >
            {navLinks.map(({ to, label }) => (
              <motion.div
                key={to}
                variants={fadeDown}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={to}
                  className={`text-sm lg:text-base whitespace-nowrap transition-colors ${
                    isActive(to)
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.nav>

          {/* Desktop Right Side */}
          <motion.div
            className="hidden md:flex items-center space-x-3"
            variants={fadeDown}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatePresence mode="wait">
              {isAuthenticated ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    onClick={handleDashboardClick}
                    className="bg-white text-slate-900 px-4 lg:px-6 py-2 rounded-[10px] hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1 text-sm lg:text-base whitespace-nowrap"
                  >
                    <LayoutDashboardIcon className="w-4 h-4" />
                    Dashboard
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="auth-buttons"
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link to="/signin">
                    <button className="text-gray-300 hover:text-white hover:bg-[#192426] transition-colors bg-[#192436] px-4 lg:px-6 py-2 rounded-full cursor-pointer text-sm lg:text-base whitespace-nowrap">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/talent-signup">
                    <button className="bg-white text-slate-900 px-4 lg:px-6 py-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-sm lg:text-base whitespace-nowrap">
                      Join as Talent
                    </button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Mobile Menu Toggle */}
          <motion.button
            variants={fadeDown}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white focus:outline-none p-1"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMenuOpen ? (
                <motion.svg
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </motion.svg>
              ) : (
                <motion.svg
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="absolute left-0 right-0 top-full md:hidden bg-[#0a1628] backdrop-blur-sm shadow-lg z-50"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.nav
              className="flex flex-col space-y-4 px-4 py-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {navLinks.map(({ to, label }) => (
                <motion.div
                  key={to}
                  variants={fadeDown}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`transition-colors text-sm ${
                      isActive(to)
                        ? "text-blue-400 font-semibold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                variants={fadeDown}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col space-y-3 pt-4 border-t border-gray-700"
              >
                <AnimatePresence mode="wait">
                  {isAuthenticated ? (
                    <motion.div
                      key="mobile-dashboard"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={handleDashboardClick}
                        className="bg-white text-slate-900 px-6 py-2 rounded-[10px] hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1 text-sm"
                      >
                        <LayoutDashboardIcon className="w-4 h-4" />
                        Dashboard
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mobile-auth"
                      className="flex flex-col space-y-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link to="/signin" onClick={() => setIsMenuOpen(false)}>
                        <button className="w-full text-gray-300 hover:bg-[#192426] transition-colors text-center bg-[#192436] px-6 py-2 rounded-full cursor-pointer text-sm">
                          Sign In
                        </button>
                      </Link>
                      <Link
                        to="/talent-signup"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <button className="w-full bg-white text-slate-900 px-6 py-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-sm">
                          Join as Talent
                        </button>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
