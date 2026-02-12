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
        { headers: { Authorization: `Bearer ${token}` } },
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
                          `otp-${index + 1}`,
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
                      d="M135.323 79.505L135.43 79.7333C135.918 80.7806 136.204 81.9549 136.262 83.2357C136.406 86.2089 135.306 89.3536 132.982 92.6769L130.933 95.6101L129.698 97.3791C127.436 100.591 124.097 103.244 119.686 105.284C115.263 107.331 111.07 108.191 107.136 107.851L38.4171 101.825L20.9876 100.308C17.0533 99.9682 14.4681 98.5256 13.2651 95.9808C12.0621 93.436 12.5981 90.5542 14.8536 87.3284L18.1369 82.6262C20.4675 79.3163 23.6572 76.3414 27.6917 73.7409C31.7397 71.134 36.0129 69.2558 40.5053 68.0927C50.0547 65.7158 59.1725 64.0958 67.8846 63.2535C74.889 62.57 81.6213 62.3894 88.1009 62.7189C89.6833 62.782 91.2513 62.8845 92.8049 63.0264C93.2811 63.0659 93.7634 63.1188 94.2458 63.1718C101.59 63.8828 108.358 65.2872 114.546 67.3386C121.14 69.527 127.085 72.4599 132.38 76.1372C133.419 76.8947 134.251 77.7657 134.88 78.7307C135.046 78.9804 135.184 79.2428 135.323 79.505Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M145.219 18.8922L145.251 18.9593C147.617 24.0347 146.533 29.7713 142.042 36.197C141.849 36.4833 141.649 36.7562 141.43 37.022C136.942 43.103 130.45 48.1086 122.011 52.0271C113.479 55.9894 105.392 57.717 97.7509 57.21C97.4663 57.1956 97.1817 57.1812 96.9042 57.1471C89.0159 56.461 83.8588 53.5696 81.4528 48.4799C79.053 43.4037 80.1054 37.633 84.6297 31.1752C89.1406 24.7236 95.8197 19.4514 104.661 15.345C113.502 11.2387 121.866 9.54517 129.754 10.2313C137.663 10.9245 142.8 13.8088 145.219 18.8922Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M145.251 18.956L157.742 45.7424C160.148 50.8321 159.076 56.5955 154.565 63.0472C150.116 69.4209 143.53 74.6493 134.869 78.7207C134.24 77.7557 133.408 76.8847 132.368 76.1273C127.074 72.4499 121.129 69.5171 114.535 67.3287C108.347 65.2773 101.579 63.8728 94.2347 63.1618C93.7523 63.1089 93.2699 63.0559 92.7938 63.0164C91.2401 62.8746 89.6721 62.7721 88.0898 62.709L81.4531 48.4766C83.8592 53.5662 89.0162 56.4577 96.9045 57.1438C97.1819 57.1779 97.4665 57.1923 97.7511 57.2067C105.392 57.7137 113.479 55.986 122.012 52.0237C130.45 48.1052 136.943 43.0997 141.43 37.0186C141.65 36.7529 141.849 36.4799 142.043 36.1936C146.533 29.7679 147.618 24.0313 145.251 18.956Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M135.426 79.7291L148.011 106.717C148.467 107.73 148.728 108.851 148.78 110.085C148.925 113.058 147.825 116.203 145.5 119.526L142.217 124.228C139.955 127.441 136.615 130.093 132.205 132.134C127.781 134.18 123.589 135.04 119.654 134.7L33.5063 127.157C29.572 126.818 26.9868 125.375 25.7837 122.83L13.2617 95.9766C14.4647 98.5214 17.0499 99.964 20.9842 100.303L38.4138 101.82L107.132 107.847C111.067 108.186 115.259 107.327 119.683 105.28C124.093 103.24 127.433 100.587 129.695 97.3749L130.93 95.6058L132.978 92.6727C135.303 89.3493 136.403 86.2046 136.258 83.2314C136.201 81.9507 135.915 80.7763 135.426 79.7291Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
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
                <div className="flex justify-end relative left-8 bottom-[-33px]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="212"
                    height="198"
                    viewBox="0 0 212 198"
                    fill="none"
                  >
                    <path
                      d="M68.5666 102.162C67.4684 103.722 67.2053 105.078 67.7467 106.243C68.2952 107.424 69.5291 108.079 71.4251 108.237L78.038 108.82L72.3962 96.6723L68.5666 102.162Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M167.083 93.3254L181.33 124L168.029 122.833L159.431 104.321L125.864 101.363L120.223 89.216L167.083 93.3254Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M99.1692 99.0264L104.02 109.471C102.058 110.371 100.17 110.751 98.3187 110.609C98.2811 110.608 98.2434 110.607 98.2057 110.606L91.4201 110.011L85.7783 97.864L99.1692 99.0264Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M106.831 88.0415L112.516 100.281L108.741 105.689C108.671 105.778 108.608 105.882 108.531 105.956C107.451 107.395 105.979 108.551 104.085 109.438L104.024 109.466L99.1724 99.0215L106.831 88.0415Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M106.83 88.0494L99.171 99.0294L85.7802 97.867L93.4466 86.8647L106.83 88.0494Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M159.434 104.313L147.751 121.042L144.102 126.28C142.619 128.412 140.622 130.281 138.121 131.862C137.085 132.515 135.975 133.129 134.768 133.694C130.682 135.588 126.815 136.39 123.165 136.101L123.052 136.098L82.9931 132.576L36.1105 128.458L15.9269 126.686C12.2408 126.357 9.84203 124.997 8.72262 122.627C7.59609 120.241 8.09187 117.545 10.2026 114.521L25.5281 92.5387L38.8286 93.706L59.11 95.4889L72.3953 96.6634L68.5658 102.153C67.4676 103.713 67.2045 105.069 67.7459 106.234C68.2944 107.415 69.5284 108.07 71.4244 108.228L78.037 108.811L91.3373 109.978L91.4198 109.996L98.2054 110.591C98.2054 110.591 98.2809 110.593 98.3186 110.594C100.17 110.735 102.058 110.356 104.02 109.455L104.081 109.427C105.975 108.54 107.447 107.384 108.527 105.945C108.604 105.871 108.667 105.767 108.738 105.678L112.512 100.27L112.567 100.188L125.868 101.356L159.434 104.313Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M180.534 53.7073L172.522 52.9955L153.752 51.3451L161.411 40.365C163.514 37.364 164.01 34.6671 162.906 32.2898L162.891 32.2591C161.765 29.8736 159.373 28.5285 155.687 28.2003L128.89 25.8453C125.211 25.5324 121.322 26.3265 117.19 28.2422C113.065 30.1733 109.952 32.6394 107.841 35.6629L100.182 46.6427L73.4082 44.2958C69.7221 43.9675 65.817 44.7688 61.6924 46.6999C57.5759 48.6084 54.4469 51.0817 52.3514 54.098L33.1968 81.5702L66.7789 84.5204L80.0637 85.6951L83.8859 80.1898C84.9841 78.63 86.5263 77.3851 88.5498 76.4564C89.7567 75.8914 90.9278 75.5298 92.0938 75.3574C92.8809 75.2503 93.6508 75.226 94.4256 75.2927L114.609 77.0653L121.2 77.6397C123.103 77.813 124.321 78.4749 124.878 79.6334C125.419 80.7991 125.156 82.1546 124.065 83.7297L120.236 89.2198L167.096 93.3291L174.574 82.6016L186.258 65.8721C188.361 62.871 188.849 60.1589 187.752 57.7969L187.738 57.7662C186.611 55.3807 184.213 54.0203 180.534 53.7073ZM140.354 50.1674L126.881 48.9877L113.58 47.8204L121.239 36.8404L148.013 39.1874L140.354 50.1674Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M121.227 36.8351L126.868 48.9823L113.568 47.815L121.227 36.8351Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M148.008 39.1771L140.349 50.1572L126.876 48.9773L121.234 36.8301L148.008 39.1771Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M187.749 57.7901L201.982 88.4343C203.101 90.8045 202.613 93.5167 200.502 96.5402L181.341 123.997L167.094 93.322L174.572 82.5947L186.255 65.8651C188.358 62.8641 188.846 60.1521 187.749 57.7901Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M162.887 32.2804L172.504 52.9861L153.734 51.3356L161.393 40.3556C163.496 37.3546 163.991 34.6577 162.887 32.2804Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M124.869 79.6344C125.411 80.8 125.148 82.1555 124.057 83.7307L120.227 89.2208L125.869 101.368L112.568 100.201L112.513 100.282L106.829 88.0431L93.4458 86.8584L85.7793 97.8607L91.4211 110.008L91.3384 109.991L80.0549 85.6961L83.8771 80.1908C84.9753 78.631 86.5174 77.3861 88.541 76.4574C89.7479 75.8924 90.919 75.5308 92.085 75.3584C92.8721 75.2513 93.6419 75.227 94.4168 75.2936L114.6 77.0663L121.191 77.6406C123.094 77.814 124.313 78.4759 124.869 79.6344Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M80.0642 85.6983L91.3477 109.993L78.0476 108.825L72.4058 96.6781L59.1206 95.5037L38.839 93.7208L33.1973 81.5735L66.7794 84.5237L80.0642 85.6983Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M159.436 104.315L173.683 134.99L158.35 156.957C156.255 159.973 153.126 162.446 149.016 164.37C144.885 166.286 140.979 167.087 137.301 166.774L30.1753 157.362C26.4892 157.034 24.0904 155.674 22.971 153.304L8.72412 122.629C9.84353 124.999 12.2424 126.359 15.9284 126.687L36.1121 128.46L82.9946 132.578L123.054 136.099L123.167 136.102C126.816 136.392 130.684 135.589 134.769 133.695C135.976 133.13 137.086 132.517 138.122 131.864C140.624 130.282 142.62 128.414 144.103 126.282L147.752 121.044L159.436 104.315Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
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
