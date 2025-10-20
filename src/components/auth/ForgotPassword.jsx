import React, { useState } from "react";
import { User, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

export const ForgotPassword = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("At least one lowercase letter");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("At least one uppercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("At least one number");
    }
    return errors;
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        newErrors.password = passwordErrors;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleSendInstructions = async () => {
    if (!validateStep1()) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Sending reset instructions to:", formData.email);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to send instructions. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Resetting password");
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to reset password. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900/20 via-blue-400/20 to-slate-900">
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        {currentStep === 1 && (
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Reset password
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Forgot your password? No worries
            </p>

            {errors.submit && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Enter Work Email
                </label>
                <input
                  type="email"
                  placeholder="daniel@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full bg-transparent border rounded-lg h-12 px-4 text-white placeholder:text-gray-600 focus:outline-none transition-colors ${
                    errors.email
                      ? "border-red-500 focus:border-red-400"
                      : "border-blue-600 focus:border-blue-500"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <button
                onClick={handleSendInstructions}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg py-3 h-12 font-medium transition-colors"
              >
                {loading ? "Sending..." : "Send Reset Instructions"}
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Reset password
            </h1>
            <p className="text-gray-400 text-center mb-4">
              Enter your new password
            </p>
            <p className="text-gray-500 text-xs text-center mb-10 px-4">
              {formData.email}
            </p>

            {errors.submit && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={`w-full bg-transparent border rounded-lg h-12 px-4 pr-10 text-white placeholder:text-gray-600 focus:outline-none transition-colors ${
                      errors.password
                        ? "border-red-500 focus:border-red-400"
                        : "border-gray-700 focus:border-blue-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && typeof errors.password === "object" ? (
                  <div className="mt-2 space-y-1">
                    {errors.password.map((err, idx) => (
                      <p
                        key={idx}
                        className="text-red-400 text-xs flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {err}
                      </p>
                    ))}
                  </div>
                ) : errors.password ? (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className={`w-full bg-transparent border rounded-lg h-12 px-4 pr-10 text-white placeholder:text-gray-600 focus:outline-none transition-colors ${
                      errors.confirmPassword
                        ? "border-red-500 focus:border-red-400"
                        : "border-gray-700 focus:border-blue-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg py-3 h-12 font-medium transition-colors"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                onClick={() => {
                  setCurrentStep(1);
                  setErrors({});
                }}
                className="w-full bg-transparent border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-lg py-3 h-12 font-medium transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h1 className="text-4xl font-normal text-white text-center mb-4">
              Password Reset
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Your password has been successfully reset.
              <br />
              You can now sign in with your new password
            </p>

            <button
              onClick={() => {
                setCurrentStep(1);
                setFormData({ email: "", password: "", confirmPassword: "" });
                setErrors({});
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium transition-colors"
            >
              Sign In now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
