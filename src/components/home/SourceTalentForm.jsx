import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const SourceTalentForm = () => {
  const [jobTitle, setJobTitle] = useState("");
  const [workType, setWorkType] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!jobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    }

    if (!location) {
      newErrors.location = "Location is required";
    }

    if (!workType) {
      newErrors.workType = "Work type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Form is valid
      setIsLoading(true);

      // Simulate loading
      setTimeout(() => {
        setIsLoading(false);
        const searchParams = new URLSearchParams({
          jobTitle: jobTitle,
          location: location,
          workType: workType,
        });
        navigate(`/find-talents?${searchParams.toString()}`);
      }, 2000);
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-lg">Searching for talents...</p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl mx-auto"
    >
      {/* Job Title */}
      <div className="mb-6">
        <label className="block text-gray-900 font-medium mb-3 text-base">
          Job Title
        </label>
        <div className="relative">
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => {
              setJobTitle(e.target.value);
              if (errors.jobTitle) {
                setErrors({ ...errors, jobTitle: "" });
              }
            }}
            onBlur={() => handleBlur("jobTitle")}
            placeholder="Title, Keyword e.g Product..."
            className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400 transition-all ${
              errors.jobTitle && touched.jobTitle
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
            }`}
          />
        </div>
        {errors.jobTitle && touched.jobTitle && (
          <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.jobTitle}</span>
          </div>
        )}
      </div>

      {/* Work Type */}
      <div className="mb-6">
        <label className="block text-gray-900 font-medium mb-3 text-base">
          Work Type
        </label>
        <div className="relative">
          <select
            value={workType}
            onChange={(e) => {
              setWorkType(e.target.value);
              if (errors.workType) {
                setErrors({ ...errors, workType: "" });
              }
            }}
            onBlur={() => handleBlur("workType")}
            className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 appearance-none transition-all cursor-pointer ${
              errors.workType && touched.workType
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
            } ${!workType ? "text-gray-400" : "text-gray-700"}`}
          >
            <option value="" disabled>
              ---Select Work Type---
            </option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
        {errors.workType && touched.workType && (
          <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.workType}</span>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="mb-8">
        <label className="block text-gray-900 font-medium mb-3 text-base">
          Location
        </label>
        <div className="relative">
          <select
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) {
                setErrors({ ...errors, location: "" });
              }
            }}
            onBlur={() => handleBlur("location")}
            className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 appearance-none transition-all cursor-pointer ${
              errors.location && touched.location
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-200 focus:ring-blue-500 focus:border-transparent"
            } ${!location ? "text-gray-400" : "text-gray-700"}`}
          >
            <option value="" disabled>
              ----Select Location----
            </option>
            <option value="tokyo">Tokyo, Japan</option>
            <option value="new york">New York, USA</option>
            <option value="london">London, UK</option>
            <option value="singapore">Singapore</option>
            <option value="san francisco">San Francisco, USA</option>
            <option value="berlin">Berlin, Germany</option>
            <option value="barcelona">Barcelona, Spain</option>
            <option value="toronto">Toronto, Canada</option>
            <option value="sydney">Sydney, Australia</option>
            <option value="seoul">Seoul, South Korea</option>
            <option value="amsterdam">Amsterdam, Netherlands</option>
            <option value="mexico city">Mexico City, Mexico</option>
            <option value="dublin">Dublin, Ireland</option>
            <option value="paris">Paris, France</option>
            <option value="zurich">Zurich, Switzerland</option>
            <option value="mumbai">Mumbai, India</option>
            <option value="seattle">Seattle, USA</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
        {errors.location && touched.location && (
          <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.location}</span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl transition-colors duration-200 mb-4"
      >
        Source Talents
      </button>

      {/* Sign in message */}
      <p className="text-center text-gray-500 text-sm">
        You'll need to sign in to proceed from here
      </p>
    </form>
  );
};
