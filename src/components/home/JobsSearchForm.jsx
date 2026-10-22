import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";

const inputClass =
  "w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 text-sm";

export const JobSearchForm = () => {
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedWorkType, setSelectedWorkType] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();

    const jobTitle = selectedJobTitle.trim();
    if (!jobTitle) {
      toast({
        title: "Job title is required",
        description: "Enter a job title or keyword to find the right jobs.",
        variant: "error",
      });
      return;
    }

    // Only send what was filled in; location and work type are optional.
    const searchParams = new URLSearchParams({ jobTitle });
    if (selectedLocation.trim())
      searchParams.set("location", selectedLocation.trim());
    if (selectedWorkType) searchParams.set("workType", selectedWorkType);
    navigate(`/jobs?${searchParams.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-3xl p-6 sm:p-8 mb-8 max-w-5xl mx-4 sm:mx-6 lg:mx-auto shadow-lg shadow-blue-100/10"
    >
      <div className="mb-8 sm:mb-12">
        <span className="inline-block bg-[#182232] p-2 md:p-4 text-white text-sm sm:text-base rounded-[10px] md:rounded-2xl">
          Search by job title, skill, or location...
        </span>
      </div>
      <hr className="text-gray-700 py-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative min-w-0">
          <label
            htmlFor="job-search-title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Job Title
          </label>
          <input
            id="job-search-title"
            type="text"
            className={inputClass}
            placeholder="Title Keyword e.g Product..."
            value={selectedJobTitle}
            onChange={(e) => setSelectedJobTitle(e.target.value)}
          />
        </div>

        <div className="relative min-w-0">
          <label
            htmlFor="job-search-location"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Location
          </label>
          <input
            id="job-search-location"
            type="text"
            className={inputClass}
            placeholder="e.g. New York, USA"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          />
        </div>

        <div className="relative min-w-0">
          <label
            htmlFor="job-search-worktype"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Work Type
          </label>
          <select
            id="job-search-worktype"
            className={`${inputClass} appearance-none ${selectedWorkType ? "" : "text-gray-500"}`}
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
          >
            <option value="">Any work type</option>
            <option value="on-site">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <ChevronDown className="absolute right-3 top-10 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        <button
          type="submit"
          className="w-full md:w-auto bg-[#3B82F6] text-white px-2 py-3 rounded-xl font-semibold hover:bg-[#5F8DD7] transition-colors cursor-pointer md:mt-7 flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          Search Opportunities
        </button>
      </div>
    </form>
  );
};
