import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
export const Footer = () => (
  <footer className="bg-black py-16">
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
        {/* Company Info */}
        <div className="lg:col-span-1">
          <Link to="/">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/images/footer-logo.png" alt="" />
              </div>
              <span className="text-xl font-bold">QNDUIT</span>
            </div>
          </Link>
          <p className="text-gray-400 mb-6">
            Connecting talent and opportunity
            <br />
            with speed and simplicity.
          </p>
          <div className="text-yellow-400 font-medium mb-6">
            <a href="mailto:Support@qnduit.com">Support@qnduit.com</a>
          </div>
          <div className="flex space-x-4">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.222 0c1.406 0 2.54 1.137 2.607 2.475V24l-2.677-2.273-1.47-1.338-1.604-1.398.67 2.205H3.71c-1.402 0-2.54-1.065-2.54-2.476V2.48C1.17 1.142 2.31.003 3.715.003h16.5L20.222 0zm-6.118 5.683h-.03l-.202.2c2.073.6 3.076 1.537 3.076 1.537-1.336-.668-2.54-1.002-3.744-1.137-.87-.135-1.74-.064-2.475 0h-.2c-.47 0-1.47.2-2.81.735-.467.203-.735.336-.735.336s1.002-1.002 3.21-1.537l-.135-.135s-1.672-.064-3.477 1.27c0 0-1.805 3.144-1.805 7.02 0 0 1 1.74 3.743 1.806 0 0 .4-.533.805-1.002-1.54-.4-2.172-1.27-2.172-1.27s.135.097.402.23l.29.2c.026.018.044.035.08.05.14.078.29.135.438.2.336.136.738.27 1.207.364.738.155 1.607.2 2.677.07.4-.065.78-.135 1.18-.27.4-.134.84-.334 1.293-.535 0 0-.65.87-2.26 1.264.4.47.8 1.002.8 1.002 2.744-.06 3.81-1.8 3.87-1.726 0-3.87-1.815-7.02-1.815-7.02-1.635-1.214-3.165-1.26-3.435-1.26l.056-.02zm.168 4.413c.703 0 1.27.6 1.27 1.335 0 .74-.57 1.34-1.27 1.34-.7 0-1.27-.6-1.27-1.34.002-.74.573-1.338 1.27-1.335zm-4.64 0c.7 0 1.266.6 1.266 1.335 0 .74-.57 1.34-1.27 1.34-.7 0-1.27-.6-1.27-1.34 0-.74.57-1.335 1.27-1.335z" />
              </svg>
            </div>
          </div>
        </div>

        {/* For Employers */}
        <div>
          <h4 className="text-white font-semibold text-lg mb-4">
            For Employers
          </h4>
          <ul className="space-y-3 text-gray-400">
            <li>
              <Link to="/signin" className="hover:text-white transition-colors">
                Post a Job
              </Link>
            </li>
            <li>
              <Link to="/signin" className="hover:text-white transition-colors">
                Contact Talent
              </Link>
            </li>
            <li>
              <Link
                to="/pricing"
                className="hover:text-white transition-colors"
              >
                Pricing
              </Link>
            </li>
            <li>
              <HashLink
                smooth
                to="/#faq-section"
                className="hover:text-white transition-colors"
              >
                FAQ
              </HashLink>
            </li>
          </ul>
        </div>

        {/* For Talent */}
        <div>
          <h4 className="text-white font-semibold text-lg mb-4">For Talent</h4>
          <ul className="space-y-3 text-gray-400">
            <li>
              <Link
                to="/talent-signup"
                className="hover:text-white transition-colors"
              >
                Create Free Account
              </Link>
            </li>
            <li>
              <Link
                to="/pricing"
                className="hover:text-white transition-colors"
              >
                Upgrade Profile
              </Link>
            </li>
            <li>
              <HashLink
                smooth
                to="/#search-jobs"
                className="hover:text-white transition-colors"
              >
                Search Jobs
              </HashLink>
            </li>
          </ul>
        </div>

        {/* About Qnduit */}
        <div>
          <h4 className="text-white font-semibold text-lg mb-4">
            About Qnduit
          </h4>
          <ul className="space-y-3 text-gray-400">
            <li>
              <Link
                to="/about-us"
                className="hover:text-white transition-colors"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                to="/how-it-works"
                className="hover:text-white transition-colors"
              >
                How It Works
              </Link>
            </li>
            <li>
              <Link
                to="/testimonials"
                className="hover:text-white transition-colors"
              >
                Testimonials
              </Link>
            </li>
          </ul>
        </div>

        {/* Community */}
        <div>
          <h4 className="text-white font-semibold text-lg mb-4">Community</h4>
          <ul className="space-y-3 text-gray-400">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Learn Tech
              </a>
            </li>
            <li>
              <a
                href="https://www.vncx.net"
                className="hover:text-white transition-colors"
              >
                Join Community
              </a>
            </li>
            <li>
              <Link to="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
        <div className="text-gray-400 mb-4 md:mb-0">© 2025 Qnduit</div>
        <div className="flex space-x-8 text-gray-400">
          <Link
            to="/terms-of-service"
            className="hover:text-white transition-colors"
          >
            Terms & Service
          </Link>
          <Link
            to="privacy-policy"
            className="hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Large QNDUIT text */}
      <div className="mt-16 overflow-hidde hidden md:block">
        <div
          className="flex items-center justify-center"
          style={{
            clipPath: "inset(0 0 10% 0)",
          }}
        >
          {/* Logo Image */}
          <div className="relative flex-shrink-0">
            <img
              src="/images/logo.png"
              alt="logo"
              className="object-contain w-[120px]"
            />
          </div>

          {/* Text */}
          <h1
            className="font-black text-[#C3CBD9] leading-none text-[7.5rem] tracking-tight pl-[20px]"
            style={{
              position: "relative",
              top: "10px",
            }}
          >
            QNDUIT
          </h1>
        </div>
      </div>
    </div>
  </footer>
);
