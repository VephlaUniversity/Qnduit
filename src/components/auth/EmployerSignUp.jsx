import { useState } from "react";
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
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const isLongEnough = password.length >= 8;
    return hasLetters && hasNumbers && isLongEnough;
  };

  const validateUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const validateStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      // Email validation
      const emailValue = formData.email.trim();
      if (!emailValue) {
        newErrors.email = "Email is required";
      } else if (!validateEmail(emailValue)) {
        newErrors.email = "Please enter a valid email address";
      }

      // First name validation
      const firstNameValue = formData.firstName.trim();
      if (!firstNameValue) {
        newErrors.firstName = "First name is required";
      } else if (firstNameValue.length < 2) {
        newErrors.firstName = "First name must be at least 2 characters";
      } else if (!/^[a-zA-Z\s'-]+$/.test(firstNameValue)) {
        newErrors.firstName =
          "First name can only contain letters, spaces, hyphens, and apostrophes";
      }

      // Last name validation
      const lastNameValue = formData.lastName.trim();
      if (!lastNameValue) {
        newErrors.lastName = "Last name is required";
      } else if (lastNameValue.length < 2) {
        newErrors.lastName = "Last name must be at least 2 characters";
      } else if (!/^[a-zA-Z\s'-]+$/.test(lastNameValue)) {
        newErrors.lastName =
          "Last name can only contain letters, spaces, hyphens, and apostrophes";
      }

      // Password validation
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (!validatePassword(formData.password)) {
        if (formData.password.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else if (!/[a-zA-Z]/.test(formData.password)) {
          newErrors.password = "Password must contain at least one letter";
        } else if (!/\d/.test(formData.password)) {
          newErrors.password = "Password must contain at least one number";
        }
      }
    }

    if (currentStep === 2) {
      if (formData.verificationCode.length !== 4) {
        newErrors.verificationCode = "Verification code must be 4 digits";
      } else if (!/^\d{4}$/.test(formData.verificationCode)) {
        newErrors.verificationCode =
          "Verification code must contain only numbers";
      } else if (formData.verificationCode !== "1111") {
        newErrors.verificationCode = "Invalid verification code";
      }
    }

    if (currentStep === 3) {
      if (!formData.accountType) {
        newErrors.accountType = "Please select an account type";
      }
    }

    if (currentStep === 4) {
      if (formData.accountType === "institutional") {
        // Company name validation
        const companyNameValue = formData.companyName.trim();
        if (!companyNameValue) {
          newErrors.companyName = "Company name is required";
        } else if (companyNameValue.length < 2) {
          newErrors.companyName = "Company name must be at least 2 characters";
        } else if (companyNameValue.length > 100) {
          newErrors.companyName = "Company name cannot exceed 100 characters";
        }

        // About company validation
        if (
          formData.aboutCompany.trim().length > 0 &&
          formData.aboutCompany.trim().length < 10
        ) {
          newErrors.aboutCompany =
            "Company description must be at least 10 characters if provided";
        } else if (formData.aboutCompany.trim().length > 500) {
          newErrors.aboutCompany =
            "Company description cannot exceed 500 characters";
        }

        // Company website validation
        const websiteValue = formData.companyWebsite.trim();
        if (!websiteValue) {
          newErrors.companyWebsite = "Company website is required";
        } else if (!validateUrl(websiteValue)) {
          newErrors.companyWebsite = "Please enter a valid website URL";
        }

        // Company industry validation
        if (!formData.companyIndustry) {
          newErrors.companyIndustry = "Please select an industry";
        }

        // Location validation
        if (!formData.location) {
          newErrors.location = "Please select a location";
        }
      }

      if (formData.accountType === "individual") {
        // Display name validation
        const displayNameValue = formData.displayName.trim();
        if (!displayNameValue) {
          newErrors.displayName = "Display name is required";
        } else if (displayNameValue.length < 2) {
          newErrors.displayName = "Display name must be at least 2 characters";
        } else if (displayNameValue.length > 50) {
          newErrors.displayName = "Display name cannot exceed 50 characters";
        }

        // About you validation
        if (
          formData.aboutYou.trim().length > 0 &&
          formData.aboutYou.trim().length < 10
        ) {
          newErrors.aboutYou = "Bio must be at least 10 characters if provided";
        } else if (formData.aboutYou.trim().length > 500) {
          newErrors.aboutYou = "Bio cannot exceed 500 characters";
        }

        // Location validation
        if (!formData.location) {
          newErrors.location = "Please select a location";
        }
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
                  onChange={(e) => handleInputChange("email", e.target.value)}
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
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
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
                onClick={nextStep}
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
              onClick={nextStep}
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
                <div className="flex justify-end relative left-8 bottom-[-45px]">
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
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M135.558 75.4145L147.116 100.202L136.325 99.2591L129.35 84.2996L102.116 81.9098L97.5391 72.0938L135.558 75.4145Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M80.458 80.0213L84.3938 88.4616C82.8016 89.189 81.27 89.4958 79.7681 89.3813C79.7375 89.3805 79.7069 89.3797 79.6764 89.3788L74.171 88.898L69.5938 79.082L80.458 80.0213Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M86.6743 71.1447L91.2862 81.035L88.2239 85.4053C88.1669 85.4772 88.1158 85.5614 88.053 85.6209C87.1769 86.7838 85.9828 87.7178 84.446 88.4345L84.3963 88.4577L80.4605 80.0174L86.6743 71.1447Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M86.6732 71.151L80.4595 80.0238L69.5952 79.0845L75.8152 70.1937L86.6732 71.151Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M129.352 84.2933L119.873 97.8121L116.913 102.044C115.709 103.767 114.089 105.277 112.06 106.556C111.22 107.083 110.319 107.579 109.34 108.035C106.025 109.566 102.887 110.214 99.9264 109.98L99.8346 109.978L67.334 107.132L29.2972 103.805L12.9218 102.372C9.93121 102.107 7.985 101.008 7.0768 99.0925C6.16282 97.1648 6.56505 94.9855 8.27756 92.5423L20.7114 74.7788L31.5024 75.722L47.9571 77.1628L58.7357 78.1119L55.6288 82.5483C54.7379 83.8087 54.5244 84.9041 54.9636 85.8461C55.4086 86.8004 56.4098 87.3294 57.948 87.4571L63.313 87.9279L74.1038 88.8713L74.1707 88.8853L79.676 89.3661C79.676 89.3661 79.7373 89.3677 79.7679 89.3686C81.2698 89.483 82.8014 89.1762 84.3936 88.4488L84.4432 88.4257C85.98 87.7091 87.1741 86.7751 88.0502 85.6121C88.113 85.5526 88.1641 85.4684 88.2211 85.3966L91.2835 81.0262L91.3282 80.9601L102.119 81.9035L129.352 84.2933Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M146.471 43.3999L139.971 42.8246L124.742 41.491L130.956 32.6182C132.662 30.1931 133.064 28.0139 132.169 26.0928L132.157 26.068C131.243 24.1403 129.303 23.0534 126.312 22.7881L104.571 20.8851C101.587 20.6322 98.4307 21.274 95.0785 22.822C91.7322 24.3825 89.2059 26.3753 87.4934 28.8185L81.2799 37.6911L59.5576 35.7946C56.567 35.5293 53.3986 36.1768 50.0523 37.7373C46.7125 39.2795 44.1739 41.2781 42.4738 43.7156L26.9332 65.9153L54.1791 68.2993L64.9573 69.2486L68.0584 64.7998C68.9493 63.5394 70.2005 62.5335 71.8423 61.783C72.8214 61.3264 73.7716 61.0342 74.7176 60.8949C75.3562 60.8083 75.9808 60.7887 76.6095 60.8426L92.9849 62.275L98.3318 62.7391C99.8759 62.8792 100.864 63.4141 101.316 64.3502C101.755 65.2922 101.542 66.3875 100.657 67.6604L97.5498 72.0968L135.568 75.4175L141.636 66.7488L151.115 53.23C152.821 50.8049 153.217 48.6132 152.327 46.7046L152.316 46.6798C151.402 44.7521 149.456 43.6527 146.471 43.3999ZM113.872 40.5393L102.941 39.5861L92.15 38.6428L98.3637 29.77L120.086 31.6666L113.872 40.5393Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M98.3539 29.7657L102.931 39.5816L92.1401 38.6384L98.3539 29.7657Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M120.082 31.6582L113.868 40.5311L102.937 39.5776L98.3594 29.7617L120.082 31.6582Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M152.325 46.6991L163.872 71.4621C164.78 73.3774 164.384 75.569 162.672 78.0123L147.126 100.2L135.567 75.4117L141.634 66.7432L151.113 53.2244C152.819 50.7993 153.215 48.6078 152.325 46.6991Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M132.154 26.0852L139.956 42.817L124.728 41.4833L130.941 32.6106C132.647 30.1855 133.05 28.0062 132.154 26.0852Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M101.309 64.351C101.748 65.2929 101.535 66.3883 100.65 67.6611L97.5427 72.0976L102.12 81.9136L91.3292 80.9702L91.2846 81.0363L86.6726 71.1459L75.8145 70.1886L69.5946 79.0793L74.1719 88.8953L74.1048 88.8813L64.9503 69.2493L68.0513 64.8006C68.9422 63.5402 70.1935 62.5342 71.8352 61.7837C72.8144 61.3272 73.7645 61.035 74.7105 60.8956C75.3491 60.8091 75.9737 60.7894 76.6024 60.8433L92.9778 62.2758L98.3247 62.7399C99.8688 62.88 100.857 63.4148 101.309 64.351Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M64.9577 69.2512L74.1122 88.8832L63.3216 87.9397L58.7443 78.1237L47.9657 77.1747L31.5109 75.734L26.9336 65.918L54.1794 68.302L64.9577 69.2512Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M129.354 84.2945L140.912 109.082L128.473 126.834C126.773 129.271 124.234 131.27 120.9 132.824C117.548 134.372 114.38 135.02 111.395 134.767L24.4819 127.161C21.4913 126.896 19.5451 125.797 18.6369 123.882L7.07812 99.0938C7.98633 101.009 9.93255 102.108 12.9231 102.374L29.2986 103.806L67.3353 107.133L99.8361 109.979L99.9278 109.982C102.889 110.215 106.026 109.567 109.341 108.036C110.32 107.58 111.221 107.084 112.061 106.557C114.091 105.278 115.711 103.769 116.914 102.046L119.875 97.8133L129.354 84.2945Z"
                      fill="#002B4D"
                      stroke="#3B82F6"
                      stroke-width="1.8"
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
            </div>

            {errors.accountType && (
              <p className="text-red-500 text-xs text-center mb-4">
                {errors.accountType}
              </p>
            )}

            <button
              onClick={nextStep}
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
                  className={`w-full bg-transparent border ${
                    errors.companyName ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.companyName}
                  </p>
                )}
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
                  className={`w-full bg-transparent border ${
                    errors.aboutCompany ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 rounded-lg transition-colors min-h-[100px] px-4 py-2 focus:outline-none`}
                />
                {errors.aboutCompany && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.aboutCompany}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Company Website URL
                </label>
                <input
                  type="url"
                  placeholder="www.example.com"
                  value={formData.companyWebsite}
                  onChange={(e) =>
                    handleInputChange("companyWebsite", e.target.value)
                  }
                  className={`w-full bg-transparent border ${
                    errors.companyWebsite ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                />
                {errors.companyWebsite && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.companyWebsite}
                  </p>
                )}
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
                    className={`w-full bg-transparent border ${
                      errors.companyIndustry
                        ? "border-red-500"
                        : "border-gray-700"
                    } text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600`}
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
                  {errors.companyIndustry && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.companyIndustry}
                    </p>
                  )}
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
                    className={`w-full bg-transparent border ${
                      errors.location ? "border-red-500" : "border-gray-700"
                    } text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600`}
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
                  {errors.location && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={nextStep}
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
                  className={`w-full bg-transparent border ${
                    errors.displayName ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                />
                {errors.displayName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.displayName}
                  </p>
                )}
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
                  className={`w-full bg-transparent border ${
                    errors.aboutYou ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 rounded-lg transition-colors min-h-[100px] px-4 py-2 focus:outline-none`}
                />
                {errors.aboutYou && (
                  <p className="text-red-500 text-xs mt-1">{errors.aboutYou}</p>
                )}
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
                  className={`w-full bg-transparent border ${
                    errors.location ? "border-red-500" : "border-gray-700"
                  } text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600`}
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
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                )}
              </div>

              <button
                onClick={nextStep}
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
