import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Briefcase, Users, Mail } from "lucide-react";

const quickLinks = [
  { to: "/jobs", label: "Find jobs", icon: Briefcase },
  { to: "/feature-talents", label: "Browse talent", icon: Users },
  { to: "/contact", label: "Contact Us", icon: Mail },
];

// Shown for any address that does not exist. `title` and `message` can be
// overridden by pages that want a more specific explanation (for example a
// talent profile that is not public).
export const NotFound = ({
  title = "Page not found",
  message = "The page you're looking for doesn't exist, has moved, or the address was typed incorrectly.",
}) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | QNDUIT`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.10)] to-[#0E0E10]">
      <motion.div
        className="w-full max-w-xl text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <p
          aria-hidden="true"
          className="text-8xl sm:text-9xl font-bold leading-none bg-gradient-to-b from-[#3B82F6] to-[#F5C518] bg-clip-text text-transparent select-none"
        >
          404
        </p>

        <h1 className="mt-6 text-3xl sm:text-4xl text-white">{title}</h1>
        <p className="mt-3 text-gray-400 text-base sm:text-lg">{message}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3B82F6] hover:bg-[#3077e8] px-8 py-3 text-white font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </motion.div>
    </main>
  );
};
