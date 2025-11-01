import React, { useState } from "react";
import { AuthHeader } from "./AuthHeader";
import { EmployerPlans } from "../EmployerPlans";
import {
  User,
  Eye,
  EyeOff,
  Mail,
  Building2,
  Briefcase,
  DollarSign,
  ArrowLeft,
  Building,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

export const EmployerSignup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    verificationCode: "",
    accountType: "",
    companyName: "",
    aboutCompany: "",
    companyWebsite: "",
    companyIndustry: "",
    location: "",
    displayName: "",
    aboutYou: "",
    selectedPlan: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleVerifyEmail = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/employers/verify`, {
        email: formData.email,
        verificationCode: formData.verificationCode,
      });

      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        alert("Email verified successfully!");
        setCurrentStep(3);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };


    // const handlePlanSelection = async (planType) => {
    //   try {
    //     const token = localStorage.getItem("token");

    //     const res = await axios.post(
    //       `${API_BASE_URL}/api/employers/plan/${userId}`,
    //       { selectedPlan: planType },
    //       { headers: { Authorization: `Bearer ${token}` } }
    //     );

    //     if (res.data.success) {
    //       navigate("/payment", {
    //         state: {
    //           plan: planType,
    //           planName: res.data.talent.selectedPlan,
    //           price:
    //             planType === "bronze"
    //               ? 6.99
    //               : planType === "silver"
    //               ? 8.99
    //               : 12.99,
    //           userType: "employer",
    //         },
    //       });
    //     }
    //   } catch (err) {
    //     console.error("Plan selection error:", err);
    //   }
    // };


    const handleAccountTypeContinue = async () => {
    const token = localStorage.getItem("token");
    const employerId = localStorage.getItem("employerId");

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/employers/update/${employerId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert("Profile updated successfully!");

        
        if (currentStep === 3) {
          setCurrentStep(4);
        } else if (currentStep === 4) {
          setCurrentStep(5);
        }
      }
    } catch (err) {
      console.error("Profile update error:", err);
    }
  };




  const handleSubmit = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/employers/signup`, {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
      });

      if (res.data.success) {
        localStorage.setItem("employerId", res.data.employerId); 
        alert("Verification code sent to your email");
        setCurrentStep(2);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Signup error:", err);
    }
  };



  const validateStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }

      if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
      }

      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = "Password must contain letters and numbers";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const handlePlanSelection = (planType) => {
    const planDetails = {
      bronze: { name: "Bronze", price: 6.99 },
      silver: { name: "Silver", price: 8.99 },
      platinum: { name: "Platinum", price: 12.99 },
    };

    const plan = planDetails[planType];

    navigate("/payment", {
      state: {
        plan: planType,
        planName: plan.name,
        price: plan.price,
        userType: "employer",
        userInfo: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          accountType: formData.accountType,
        },
      },
    });
  };

  return (
    <div className="min-h-screen  bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10] relative">
      <AuthHeader />

      {currentStep > 1 && (
        <button
          onClick={prevStep}
          className="absolute top-30 left-6 text-white hover:text-blue-400 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Previous Page</span>
        </button>
      )}

      <div className="container mx-auto min-h-[calc(100vh-80px)] py-8 px-4">
        {currentStep === 1 && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              The fastest way to hire
              <br />
              trusted creatives.
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Enter your details to get started
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Enter Work Email
                </label>
                <input
                  type="email"
                  placeholder="Daniel@Qnduit.com"
                  value={formData.email}
                  onChange={(e) => {
                    handleInputChange("email", e.target.value);
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  className={`w-full bg-transparent border ${
                    errors.email ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => {
                      handleInputChange("firstName", e.target.value);
                      if (errors.firstName)
                        setErrors({ ...errors, firstName: "" });
                    }}
                    className={`w-full bg-transparent border ${
                      errors.firstName ? "border-red-500" : "border-gray-700"
                    } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => {
                      handleInputChange("lastName", e.target.value);
                      if (errors.lastName)
                        setErrors({ ...errors, lastName: "" });
                    }}
                    className={`w-full bg-transparent border ${
                      errors.lastName ? "border-red-500" : "border-gray-700"
                    } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
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
                    className={`w-full bg-transparent border ${
                      errors.password ? "border-red-500" : "border-gray-700"
                    } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 pr-10 focus:outline-none`}
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
                {errors.password ? (
                  <p className="text-red-500 text-xs mt-2">{errors.password}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                    Password should be at least 8 alphanumeric characters
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors"
              >
                Create account as Employer
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Verify your email address
            </h1>
            <p className="text-gray-400 text-center mb-4">
              Enter the verification code we sent to
            </p>
            <p className="text-white text-center mb-10 font-medium">
              {formData.email}
            </p>

            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={formData.verificationCode[index] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 1 && /^\d*$/.test(value)) {
                      const newCode = formData.verificationCode.split("");
                      newCode[index] = value;
                      handleInputChange("verificationCode", newCode.join(""));
                      if (errors.verificationCode)
                        setErrors({ ...errors, verificationCode: "" });

                      if (value && index < 3) {
                        const nextInput = document.getElementById(
                          `otp-${index + 1}`
                        );
                        if (nextInput) nextInput.focus();
                      }
                    }
                  }}
                  className={`w-16 h-16 text-2xl text-center bg-transparent border ${
                    errors.verificationCode
                      ? "border-red-500"
                      : "border-gray-700"
                  } text-white rounded-lg focus:border-blue-600 focus:outline-none`}
                />
              ))}
            </div>
            {errors.verificationCode && (
              <p className="text-red-500 text-xs text-center mb-4">
                {errors.verificationCode}
              </p>
            )}

            <button
              onClick={handleVerifyEmail}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium transition-colors"
            >
              Verify email address
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Who's Hiring Today?
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Are you a company or an individual?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div
                onClick={() =>
                  handleInputChange("accountType", "institutional")
                }
                className={`p-8 cursor-pointer transition-all rounded-lg border ${
                  formData.accountType === "institutional"
                    ? "bg-blue-600/5 border-blue-600"
                    : "bg-transparent border-gray-700 hover:border-gray-600"
                }`}
              >
                <h3 className="text-xl text-white mb-2">Institutional</h3>
                <p className="text-gray-400 text-sm mb-6">
                  For Organizations, and corporate guys
                </p>
                <div className="flex justify-end relative left-8 bottom-[-33px]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="152"
                    height="110"
                    viewBox="0 0 152 110"
                    fill="none"
                  >
                    <path
                      d="M55.6296 82.5555C54.7387 83.816 54.5252 84.9114 54.9644 85.8533C55.4094 86.8077 56.4106 87.3367 57.9488 87.4644L63.314 87.9351L58.7367 78.1191L55.6296 82.5555Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M135.558 75.4145L147.116 100.202L136.325 99.2591L129.35 84.2996L102.116 81.9098L97.5391 72.0938L135.558 75.4145Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div
                onClick={() => handleInputChange("accountType", "individual")}
                className={`p-8 cursor-pointer transition-all rounded-lg border ${
                  formData.accountType === "individual"
                    ? "bg-blue-600/5 border-blue-600"
                    : "bg-transparent border-gray-700 hover:border-gray-600"
                }`}
              >
                <h3 className="text-xl text-white mb-2">Individual</h3>
                <p className="text-gray-400 text-sm mb-6">
                  For Hiring as a personal individual for gigs
                </p>
              </div>
            </div>

            <button
              onClick={handleAccountTypeContinue}
              disabled={!formData.accountType}
              className="w-full max-w-md mx-auto block bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium disabled:opacity-50 transition-colors"
            >
              Continue as {formData.accountType || "..."}
            </button>
          </div>
        )}

        {currentStep === 4 && formData.accountType === "institutional" && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Update company details
            </h1>
            <p className="text-gray-400 text-center mb-10">
              This helps us match your request with the right creatives
              instantly.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Qnduit"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  className="w-full bg-transparent border border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  About Company
                </label>
                <textarea
                  placeholder="Add a short bio about company"
                  value={formData.aboutCompany}
                  onChange={(e) =>
                    handleInputChange("aboutCompany", e.target.value)
                  }
                  className="w-full bg-transparent border border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-600 rounded-lg transition-colors min-h-[100px] px-4 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Company Website URL *
                </label>
                <input
                  type="url"
                  placeholder="www.example.com"
                  value={formData.companyWebsite}
                  onChange={(e) =>
                    handleInputChange("companyWebsite", e.target.value)
                  }
                  className="w-full bg-transparent border border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Company Industry
                  </label>
                  <select
                    value={formData.companyIndustry}
                    onChange={(e) =>
                      handleInputChange("companyIndustry", e.target.value)
                    }
                    className="w-full bg-transparent border border-gray-700 text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600"
                  >
                    <option value="" className="bg-[#1a2942]">
                      Select
                    </option>
                    <option value="financial" className="bg-[#1a2942]">
                      Financial Services
                    </option>
                    <option value="technology" className="bg-[#1a2942]">
                      Technology
                    </option>
                    <option value="healthcare" className="bg-[#1a2942]">
                      Healthcare
                    </option>
                    <option value="education" className="bg-[#1a2942]">
                      Education
                    </option>
                    <option value="retail" className="bg-[#1a2942]">
                      Retail
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    className="w-full bg-transparent border border-gray-700 text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600"
                  >
                    <option value="" className="bg-[#1a2942]">
                      Select
                    </option>
                    <option value="us" className="bg-[#1a2942]">
                      United States
                    </option>
                    <option value="uk" className="bg-[#1a2942]">
                      United Kingdom
                    </option>
                    <option value="canada" className="bg-[#1a2942]">
                      Canada
                    </option>
                    <option value="australia" className="bg-[#1a2942]">
                      Australia
                    </option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAccountTypeContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors"
              >
                Create account as Employer
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && formData.accountType === "individual" && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Update Individual details
            </h1>
            <p className="text-gray-400 text-center mb-10">
              One-off projects or personal brand, we'll help you find the right
              one.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Daniel Qui jobs"
                  value={formData.displayName}
                  onChange={(e) =>
                    handleInputChange("displayName", e.target.value)
                  }
                  className="w-full bg-transparent border border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  About You
                </label>
                <textarea
                  placeholder="Add a short bio"
                  value={formData.aboutYou}
                  onChange={(e) =>
                    handleInputChange("aboutYou", e.target.value)
                  }
                  className="w-full bg-transparent border border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-600 rounded-lg transition-colors min-h-[100px] px-4 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="w-full bg-transparent border border-gray-700 text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600"
                >
                  <option value="" className="bg-[#1a2942]">
                    United States
                  </option>
                  <option value="us" className="bg-[#1a2942]">
                    United States
                  </option>
                  <option value="uk" className="bg-[#1a2942]">
                    United Kingdom
                  </option>
                  <option value="canada" className="bg-[#1a2942]">
                    Canada
                  </option>
                  <option value="australia" className="bg-[#1a2942]">
                    Australia
                  </option>
                </select>
              </div>

              <button
                onClick={handleAccountTypeContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors"
              >
                Continue as a Individual
              </button>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="w-full max-w-5xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Secure your access to
              <br />
              thousands of talents
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Start building your team today. Safe payments, cancel anytime.
            </p>

            <EmployerPlans
              selectedPlan={formData.selectedPlan}
              onSelectPlan={(plan) => handleInputChange("selectedPlan", plan)}
              onPlanAction={handlePlanSelection}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployerSignup;
