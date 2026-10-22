import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./hooks/useAuth";
import { ChevronRight, LayoutDashboardIcon, X } from "lucide-react";

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

  // Close the mobile menu when the page changes
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // While the mobile menu is open: Esc closes it and the page behind can't scroll
  React.useEffect(() => {
    if (!isMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

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
              <img src="/images/header-logo.svg" alt="" className="w-5" />
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
            onClick={() => setIsMenuOpen((open) => !open)}
            className="md:hidden relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="relative block h-4 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300 ${
                  isMenuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current transition-all duration-300 ${
                  isMenuOpen ? "w-0 opacity-0" : "w-3.5 opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300 ${
                  isMenuOpen
                    ? "top-1/2 -translate-y-1/2 -rotate-45"
                    : "bottom-0"
                }`}
              />
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile Menu: a slide-in drawer, rendered on the page body so the
          header's blur effect can't trap it */}
      {createPortal(
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                key="mobile-backdrop"
                className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.aside
                key="mobile-drawer"
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Main menu"
                className="fixed right-0 top-0 z-[58] flex h-full w-[85%] max-w-sm flex-col bg-[#0a1628] shadow-2xl md:hidden"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between px-6 py-5">
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center"
                  >
                    <img src="/images/header-logo.svg" alt="" className="w-5" />
                    <span className="pl-2 text-lg text-white">QNDUIT</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label="Close menu"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <motion.nav
                  className="flex-1 overflow-y-auto px-4 py-2"
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
                        className={`flex items-center justify-between rounded-xl px-4 py-4 text-base transition-colors ${
                          isActive(to)
                            ? "bg-white/10 font-semibold text-white"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {label}
                        <ChevronRight
                          className={`h-4 w-4 ${
                            isActive(to) ? "text-blue-400" : "text-gray-500"
                          }`}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </motion.nav>

                <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-6">
                  {isAuthenticated ? (
                    <button
                      onClick={handleDashboardClick}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-base font-medium text-slate-900 transition-colors hover:bg-gray-100"
                    >
                      <LayoutDashboardIcon className="h-4 w-4" />
                      Dashboard
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/signin"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#192436] px-6 py-3 text-base text-gray-200 transition-colors hover:bg-[#223048]"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/talent-signup"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 py-3 text-base font-medium text-slate-900 transition-colors hover:bg-gray-100"
                      >
                        Join as Talent
                      </Link>
                    </>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  );
};
