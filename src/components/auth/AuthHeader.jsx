import React from "react";
import { Link, useLocation } from "react-router-dom";

export const AuthHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const isSignInPage = location.pathname === "/signin";
  const isTalentPage = location.pathname === "/talent-signup";
  const isEmployerPage = location.pathname === "/employer-signup";

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="relative p-6 lg:p-6 border-b border-gray-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img src="/images/header-logo.png" alt="Q" className="w-5" />
            <span className="text-xl pl-2 text-white">QNDUIT</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        {isSignInPage ? (
          <Link
            to="/talent-signup"
            className="bg-white text-slate-900 px-6 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            Create Account
          </Link>
        ) : (
          <nav className="hidden md:flex space-x-8 items-center">
            <Link
              to="/talent-signup"
              className={`transition-colors ${
                isTalentPage ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Talent Sign Up
            </Link>
            <Link
              to="/employer-signup"
              className={`transition-colors ${
                isEmployerPage ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Employers Sign Up
            </Link>
            <Link
              to="/signin"
              className="bg-white text-slate-900 px-6 py-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        )}

        {/* Mobile Menu Toggle - Only show on signup pages */}
        {!isSignInPage && (
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
        )}
      </div>

      {/* Mobile Menu - Only show on signup pages */}
      {!isSignInPage && isMenuOpen && (
        <div className="absolute left-0 right-0 top-full md:hidden backdrop-blur-sm shadow-lg z-50">
          <nav className="flex flex-col space-y-4 p-6">
            <Link
              to="/talent-signup"
              onClick={handleLinkClick}
              className={`transition-colors ${
                isTalentPage ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Talent Sign Up
            </Link>
            <Link
              to="/employer-signup"
              onClick={handleLinkClick}
              className={`transition-colors ${
                isEmployerPage ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Employers Sign Up
            </Link>
            <div className="pt-4 border-t border-gray-700">
              <Link to="/signin" onClick={handleLinkClick}>
                <button className="w-full bg-white text-slate-900 px-6 py-2 rounded-full hover:bg-gray-100 transition-colors">
                  Sign In
                </button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
