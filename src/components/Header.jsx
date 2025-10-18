import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatedPage } from "./AnimatedPage";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <AnimatedPage>
      <header className="relative p-6 lg:p-8 bg-[rgba(6,67,167,0.20)]">
        <div className="flex justify-between items-center ">
          <div className="flex items-center justify-center cursor-pointer">
            <Link to="/" className="flex items-center">
              <img src="/images/header-logo.png" alt="" className="w-5" />
              <span className="text-xl pl-2">QNDUIT</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/talents"
              className={`transition-colors ${
                isActive("/talents")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              For Talent
            </Link>
            <Link
              to="/employers"
              className={`transition-colors ${
                isActive("/employers")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              For Employers
            </Link>
            <Link
              to="/pricing"
              className={`transition-colors ${
                isActive("/pricing")
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/signin">
              <button className="text-gray-300 hover:text-white  text-gray-300 hover:bg-[#192426] transition-colors bg-[#192436] px-6 py-2 rounded-full  transition-colors cursor-pointer ">
                Sign In
              </button>
            </Link>
            <Link to="/talent-signup">
              <button className="bg-white text-slate-900 px-6 py-2 rounded-full  hover:bg-gray-100 transition-colors cursor-pointer">
                Join as Talent
              </button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg
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
              </svg>
            ) : (
              <svg
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
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu - Positioned Absolutely */}
        {isMenuOpen && (
          <div className="absolute left-0 right-0 top-full md:hidden backdrop-blur-sm shadow-lg z-50">
            <nav className="flex flex-col space-y-4 p-6">
              <Link
                to="/talents"
                onClick={handleLinkClick}
                className={`transition-colors ${
                  isActive("/talents")
                    ? "text-blue-400 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                For Talent
              </Link>
              <Link
                to="/employers"
                onClick={handleLinkClick}
                className={`transition-colors ${
                  isActive("/employers")
                    ? "text-blue-400 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                For Employers
              </Link>
              <Link
                to="/pricing"
                onClick={handleLinkClick}
                className={`transition-colors ${
                  isActive("/pricing")
                    ? "text-blue-400 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Pricing
              </Link>
              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-700">
                <Link to="/signin" onClick={handleLinkClick}>
                  <button className="w-full text-gray-300 hover:bg-[#192426] transition-colors text-center bg-[#192436] px-6 py-2 rounded-full  transition-colors cursor-pointer ">
                    Sign In
                  </button>
                </Link>
                <Link to="/talent-signup" onClick={handleLinkClick}>
                  <button className="w-full bg-white text-slate-900 px-6 py-2 rounded-full  hover:bg-gray-100 transition-colors cursor-pointer">
                    Join as Talent
                  </button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </AnimatedPage>
  );
};
