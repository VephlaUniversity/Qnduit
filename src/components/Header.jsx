import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="p-6 lg:p-8 bg-[rgba(6,67,167,0.20)]">
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
          <button className="text-gray-300 hover:text-white transition-colors">
            Sign In
          </button>
          <button className="bg-white text-slate-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
            Join as Talent
          </button>
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

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
          <nav className="flex flex-col space-y-4 mt-4">
            <Link
              to="/talents"
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
              className={`transition-colors ${
                isActive("/pricing")
                  ? "text-blue-400 font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Pricing
            </Link>
            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-700">
              <button className="text-gray-300 hover:text-white transition-colors text-left">
                Sign In
              </button>
              <button className="bg-white text-slate-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                Join as Talent
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
