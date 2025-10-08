import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const JobSearchForm = () => {
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedWorkType, setSelectedWorkType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!selectedJobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    }

    if (!selectedLocation.trim()) {
      newErrors.location = "Location is required";
    }

    if (!selectedWorkType) {
      newErrors.workType = "Work type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsLoading(true);

      setTimeout(() => {
        setIsLoading(false);
        const searchParams = new URLSearchParams({
          jobTitle: selectedJobTitle,
          location: selectedLocation,
          workType: selectedWorkType,
        });
        navigate(`/jobs?${searchParams.toString()}`);
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12 shadow-2xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-lg">
            Searching for opportunities...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 mb-8 max-w-5xl mx-6 lg:mx-auto shadow-lg shadow-blue-100/10">
      <div className="mb-12">
        <div className="">
          <span className="bg-[#182232] p-2 md:p-4 text-white rounded-[10px] md:rounded-2xl">
            Search by job title, skill, or location...
          </span>
        </div>
      </div>
      <hr className="text-gray-700 py-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title
          </label>
          <input
            type="text"
            className={`w-full px-4 py-3 border ${
              errors.jobTitle ? "border-red-500" : "border-gray-200"
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 text-sm`}
            placeholder="Title Keyword e.g Product..."
            value={selectedJobTitle}
            onChange={(e) => {
              setSelectedJobTitle(e.target.value);
              if (errors.jobTitle) {
                setErrors({ ...errors, jobTitle: "" });
              }
            }}
          />
          {errors.jobTitle && (
            <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            className={`w-full px-4 py-3 border ${
              errors.location ? "border-red-500" : "border-gray-200"
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 text-sm`}
            placeholder="e.g. New York, USA"
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              if (errors.location) {
                setErrors({ ...errors, location: "" });
              }
            }}
          />
          {errors.location && (
            <p className="text-red-500 text-xs mt-1">{errors.location}</p>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Type
          </label>
          <select
            className={`w-full px-4 py-3 border ${
              errors.workType ? "border-red-500" : "border-gray-200"
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 appearance-none text-sm`}
            value={selectedWorkType}
            onChange={(e) => {
              setSelectedWorkType(e.target.value);
              if (errors.workType) {
                setErrors({ ...errors, workType: "" });
              }
            }}
          >
            <option value="" disabled>
              ----Select Work Type----
            </option>
            <option value="on-site">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelancer">Freelancer</option>
          </select>
          <ChevronDown className="absolute right-3 top-10 w-5 h-5 text-gray-400 pointer-events-none" />
          {errors.workType && (
            <p className="text-red-500 text-xs mt-1">{errors.workType}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full md:w-auto bg-[#3B82F6] text-white px-2 py-3 rounded-xl font-semibold hover:bg-[#5F8DD7] transition-colors cursor-pointer md:mt-7 flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          Search Opportunities
        </button>
      </div>
    </div>
  );
};
