import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { motion } from "framer-motion";

// Styled to match the candidate/employer SignIn page (same gradient, icon
// treatment, motion and field styling), but intentionally does not reuse
// AuthHeader or link to talent/employer sign up — this is a restricted,
// staff-only entry point, kept visually consistent but functionally separate.
export const AdminSignIn = () => {
  const { adminSignIn, isAdminAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      await adminSignIn(formData.email, formData.password);
      const from = location.state?.from?.pathname || "/admin-dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setErrors({
        submit: err.message || "Invalid email or password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10]">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          className="w-full max-w-md mx-auto"
          initial="initial"
          animate="animate"
        >
          {/* Icon */}
          <motion.div
            className="flex justify-center mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-3xl font-semibold text-white text-center mb-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            Admin Sign In
          </motion.h1>

          <motion.p
            className="text-gray-400 text-center mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
          >
            Restricted access — Qnduit staff only
          </motion.p>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            >
              <label className="text-sm text-gray-400 block mb-2">
                Email address
              </label>
              <input
                type="email"
                placeholder="admin@qnduit.com"
                value={formData.email}
                onChange={(e) => {
                  handleInputChange("email", e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className={`w-full bg-transparent border ${
                  errors.email ? "border-red-500" : "border-gray-700"
                } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none disabled:opacity-50`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
            >
              <label className="text-sm text-gray-400 block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    handleInputChange("password", e.target.value);
                    if (errors.password)
                      setErrors({ ...errors, password: "" });
                  }}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  className={`w-full bg-transparent border ${
                    errors.password ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 pr-12 focus:outline-none disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </motion.div>

            {/* Submit error */}
            {errors.submit && (
              <motion.div
                className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminSignIn;
