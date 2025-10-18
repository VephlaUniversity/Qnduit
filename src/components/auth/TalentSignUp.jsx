import { useState } from "react";
import { AuthHeader } from "./AuthHeader";
import { TalentPlans } from "../TalentPlans";
import {
  User,
  Mail,
  Briefcase,
  Building2,
  DollarSign,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TalentSignup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    verificationCode: "",
    role: "",
    experience: "",
    location: "",
    skills: [],
    resume: null,
    bio: "",
    linkedin: "",
    selectedPlan: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
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
    if (!url) return true; // Optional field
    try {
      new URL(url);
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
      if (!formData.role) {
        newErrors.role = "Please select a role";
      }
      if (!formData.experience) {
        newErrors.experience = "Please select your experience level";
      }
      if (!formData.location) {
        newErrors.location = "Please select your location";
      }
    }

    if (currentStep === 4) {
      // Resume is required
      if (!formData.resume) {
        newErrors.resume = "Resume is required";
      }

      // Bio validation
      if (formData.bio.trim().length > 0 && formData.bio.trim().length < 10) {
        newErrors.bio = "Bio must be at least 10 characters if provided";
      } else if (formData.bio.trim().length > 500) {
        newErrors.bio = "Bio cannot exceed 500 characters";
      }

      // LinkedIn URL validation
      if (formData.linkedin) {
        const linkedinUrl = formData.linkedin.trim();
        if (!validateUrl(linkedinUrl)) {
          newErrors.linkedin = "Please enter a valid LinkedIn URL";
        } else if (!linkedinUrl.toLowerCase().includes("linkedin")) {
          newErrors.linkedin = "Please enter a valid LinkedIn profile URL";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlanSelection = (planType) => {
    const planDetails = {
      free: { name: "Free Account", price: 0.0 },
      public: { name: "Public Listing", price: 9.99 },
    };
    const plan = planDetails[planType];
    if (planType === "free") {
      // Navigate to dashboard for free plan
      navigate("/dashboard");
    } else {
      // Navigate to payment for public listing
      navigate("/payment", {
        state: {
          plan: planType,
          planName: plan.name,
          price: plan.price,
          userType: "talent",
          userInfo: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            experience: formData.experience,
          },
        },
      });
    }
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        setErrors({
          ...errors,
          resume: "Please upload a PDF or Word document",
        });
        return;
      }

      if (file.size > maxSize) {
        setErrors({ ...errors, resume: "File size must be less than 5MB" });
        return;
      }

      handleInputChange("resume", file);
      setErrors({ ...errors, resume: "" });
    }
  };

  return (
    <div className="min-h-screen  bg-gradient-to-b from-[rgba(6,67,167,0.20)] via-[rgba(59,130,246,0.20)] to-[#0E0E10] relative overflow-hidden">
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
              Your Career, Seen by
              <br />
              the right People
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Qnduit puts you in front of your employers
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="Daniale@qnduit.com"
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
                Create account as Talent
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
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Tell us what you do best
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Enter your field, years of experience
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className={`w-full bg-transparent border ${
                    errors.role ? "border-red-500" : "border-gray-700"
                  } text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600`}
                >
                  <option value="" className="bg-[#1a2942]">
                    Select a role
                  </option>
                  <option value="product-designer" className="bg-[#1a2942]">
                    Product Designer
                  </option>
                  <option value="ui-designer" className="bg-[#1a2942]">
                    UI Designer
                  </option>
                  <option value="ux-designer" className="bg-[#1a2942]">
                    UX Designer
                  </option>
                  <option value="developer" className="bg-[#1a2942]">
                    Developer
                  </option>
                </select>
                {errors.role && (
                  <p className="text-red-500 text-xs mt-1">{errors.role}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Experience
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) =>
                    handleInputChange("experience", e.target.value)
                  }
                  className={`w-full bg-transparent border ${
                    errors.experience ? "border-red-500" : "border-gray-700"
                  } text-white h-12 rounded-lg px-4 focus:outline-none focus:border-blue-600`}
                >
                  <option value="" className="bg-[#1a2942]">
                    Select experience level
                  </option>
                  <option value="0-1" className="bg-[#1a2942]">
                    Beginner (0-1) years
                  </option>
                  <option value="2-5" className="bg-[#1a2942]">
                    Intermediate (2-5) years
                  </option>
                  <option value="5+" className="bg-[#1a2942]">
                    Expert (5+) years
                  </option>
                </select>
                {errors.experience && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.experience}
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
                    Select location
                  </option>
                  <option value="uk" className="bg-[#1a2942]">
                    United Kingdom
                  </option>
                  <option value="us" className="bg-[#1a2942]">
                    United States
                  </option>
                  <option value="ca" className="bg-[#1a2942]">
                    Canada
                  </option>
                </select>
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Add Skills
                </label>
                <input
                  type="text"
                  placeholder="Search Skills here"
                  className="w-full bg-transparent border border-gray-700 text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "UI/UX Design",
                    "Prototyping",
                    "Wireframing",
                    "UI Design",
                  ].map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-1.5 bg-blue-600/20 border border-blue-600 text-white text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={nextStep}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors"
              >
                Proceed to Skills
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Show off your skills
            </h1>
            <p className="text-gray-400 text-center mb-10">
              The more you share, the easier it is for employers to find you
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Upload Resume
                </label>
                <div
                  className={`border-2 border-dashed ${
                    errors.resume ? "border-red-500" : "border-blue-600"
                  } rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors`}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    {formData.resume ? (
                      <div className="text-white">
                        <p className="text-sm font-medium">
                          {formData.resume.name}
                        </p>
                        <p className="text-xs text-green-500 mt-1">
                          ✓ Completed
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-white text-sm mb-1">
                          Upload Resume here
                        </p>
                        <p className="text-xs text-gray-400">
                          Drop file or click here to choose file
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.resume && (
                  <p className="text-red-500 text-xs mt-1">{errors.resume}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  About You
                </label>
                <textarea
                  placeholder="Add a short bio about yourself"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className={`w-full bg-transparent border ${
                    errors.bio ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 rounded-lg transition-colors min-h-[100px] px-4 py-3 focus:outline-none`}
                />
                {errors.bio && (
                  <p className="text-red-500 text-xs mt-1">{errors.bio}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  placeholder="Enter LinkedIn URL"
                  value={formData.linkedin}
                  onChange={(e) =>
                    handleInputChange("linkedin", e.target.value)
                  }
                  className={`w-full bg-transparent border ${
                    errors.linkedin ? "border-red-500" : "border-gray-700"
                  } text-white placeholder:text-gray-600 focus:border-blue-600 h-12 rounded-lg transition-colors px-4 focus:outline-none`}
                />
                {errors.linkedin && (
                  <p className="text-red-500 text-xs mt-1">{errors.linkedin}</p>
                )}
              </div>

              <button
                onClick={nextStep}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 h-12 font-medium mt-6 transition-colors"
              >
                Create account as Talent
              </button>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-normal text-white text-center mb-2">
              Secure your place directly
              <br />
              in front of employers
            </h1>
            <p className="text-gray-400 text-center mb-10">
              Start building your career today. Safe payments, cancel anytime.
            </p>

            <TalentPlans
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
