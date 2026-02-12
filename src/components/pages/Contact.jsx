import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { CTA } from "../home/CTA";
import { useToast } from "../hooks/useToast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contactingAs: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.contactingAs) {
      newErrors.contactingAs = "Please select an option";
    }

    if (!formData.subject) {
      newErrors.subject = "Please select a subject";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      contactingAs: true,
      subject: true,
      message: true,
    });

    if (validateForm()) {
      setIsLoading(true);

      try {
        const response = await fetch("", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          toast({
            title: "Message sent successfully!",
            description: "We'll get back to you within 24-48 hours.",
            variant: "success",
          });

          // Reset form
          setFormData({
            fullName: "",
            email: "",
            contactingAs: "",
            subject: "",
            message: "",
          });
          setTouched({});
        } else {
          throw new Error("Failed to send message");
        }
      } catch (error) {
        toast({
          title: "Failed to send message",
          description: "Please try again or contact us directly.",
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <section className="relative min-h-[40vh] flex items-center bg-black">
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto p-8 lg:p-12 text-center">
          <div className="text-center mb-12">
            <h1 className="text-white text-4xl lg:text-6xl xl:text-7xl mb-6 leading-tight">
              Start the conversation that <br /> moves you{" "}
              <span className="text-[#F5C518]">ahead</span>
            </h1>
            <p className="text-white text-sm">
              Whether you're hiring or job hunting, we're here <br /> to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="bg-black p-8">
        <div className="max-w-2xl mx-auto px-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl"
          >
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-3 text-base">
                Full name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  onBlur={() => handleBlur("fullName")}
                  placeholder="Enter your full name"
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400 transition-all ${
                    errors.fullName && touched.fullName
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
              </div>
              {errors.fullName && touched.fullName && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.fullName}</span>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-3 text-base">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="Enter your email address"
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400 transition-all ${
                    errors.email && touched.email
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
              </div>
              {errors.email && touched.email && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* You're contacting us as */}
            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-3 text-base">
                You're contacting us as
              </label>
              <div className="relative">
                <select
                  value={formData.contactingAs}
                  onChange={(e) => handleChange("contactingAs", e.target.value)}
                  onBlur={() => handleBlur("contactingAs")}
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 appearance-none transition-all cursor-pointer ${
                    errors.contactingAs && touched.contactingAs
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
                  } ${
                    !formData.contactingAs ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option value="job-seeker">Job Seeker</option>
                  <option value="employer">Employer</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="partner">Partner</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              {errors.contactingAs && touched.contactingAs && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.contactingAs}</span>
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-3 text-base">
                Subject
              </label>
              <div className="relative">
                <select
                  value={formData.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  onBlur={() => handleBlur("subject")}
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 appearance-none transition-all cursor-pointer ${
                    errors.subject && touched.subject
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
                  } ${!formData.subject ? "text-gray-400" : "text-gray-700"}`}
                >
                  <option value="" disabled>
                    How can we help?
                  </option>
                  <option value="general-inquiry">General Inquiry</option>
                  <option value="hiring-support">Hiring Support</option>
                  <option value="job-application">Job Application</option>
                  <option value="technical-support">Technical Support</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              {errors.subject && touched.subject && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.subject}</span>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-3 text-base">
                Message
              </label>
              <div className="relative">
                <textarea
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  onBlur={() => handleBlur("message")}
                  placeholder="Tell us a bit more"
                  rows="6"
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400 transition-all resize-none ${
                    errors.message && touched.message
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
              </div>
              {errors.message && touched.message && (
                <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.message}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-4 rounded-xl transition-colors duration-200 font-medium text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Sending...
                </span>
              ) : (
                "Send"
              )}
            </button>

            {/* Response Time Notice */}
            <p className="text-center text-gray-500 text-sm mt-4">
              We usually respond within 24-48 hours
            </p>
          </form>
        </div>
      </section>

      <CTA />
    </>
  );
};

export default Contact;
