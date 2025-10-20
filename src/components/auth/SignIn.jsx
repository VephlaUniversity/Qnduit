import React, { useState, useEffect } from "react";
import { AuthHeader } from "./AuthHeader";
import { ArrowLeft, LogIn } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { resumePlanSelection } from "../utils/ResumePlanSelection";

export const SignIn = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated } = useAuth();

  const message = location.state?.message;

  // If user is already authenticated, redirect them
  useEffect(() => {
    if (isAuthenticated) {
      // Check if there's a pending plan selection to resume
      const hasPendingSelection = resumePlanSelection(navigate);

      // If no pending selection, redirect based on user type
      if (!hasPendingSelection) {
        const storedUser = localStorage.getItem("user");
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (user?.userType === "talent") {
          navigate("/talent-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    }
  }, [isAuthenticated, navigate]);

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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Call the signIn method from AuthContext
      const userData = await signIn(formData.email, formData.password);

      // check if there's a pending plan selection after successful sign-in
      const hasPendingSelection = resumePlanSelection(navigate);

      // If no pending selection, redirect based on user type
      if (!hasPendingSelection) {
        if (userData.userType === "talent") {
          navigate("/talent-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
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
      <AuthHeader />
      <div className="container mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <LogIn className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-white text-center mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-center mb-4">
            Sign in to continue to your account
          </p>

          {/* Show message if redirected from plan selection */}
          {message && (
            <div className="mb-6 p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg text-center">
              <p className="text-blue-400 text-sm">{message}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Email address
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => {
                  handleInputChange("email", e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                disabled={isLoading}
                className={`w-full bg-transparent border ${
                  errors.email ? "border-red-500" : "border-gray-700"
                } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none disabled:opacity-50`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => {
                  handleInputChange("password", e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className={`w-full bg-transparent border ${
                  errors.password ? "border-red-500" : "border-gray-700"
                } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none disabled:opacity-50`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Show submit error if any */}
            {errors.submit && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-blue-500 hover:text-blue-400"
              >
                Forgot password?
              </a>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>

            <p className="text-center text-gray-400 text-sm">
              Don't have an account?{" "}
              <a
                href="/talent-signup"
                className="text-blue-500 hover:text-blue-400"
              >
                Sign up as Talent
              </a>{" "}
              or{" "}
              <a
                href="/employer-signup"
                className="text-blue-500 hover:text-blue-400"
              >
                Employer
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
