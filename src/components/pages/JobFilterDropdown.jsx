import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// FilterDropdown
export const FilterDropdown = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}) => {
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Generic change handlers
  const handleRadioChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleCheckboxChange = (value) => {
    const updated = {
      ...filters,
      jobTypes: {
        ...filters.jobTypes,
        [value]: !filters.jobTypes[value],
      },
    };
    // If a specific type is checked, uncheck "All Job Types"
    if (value !== "All Job Types" && updated.jobTypes[value]) {
      updated.jobTypes["All Job Types"] = false;
    }
    // If "All Job Types" is checked, uncheck all others
    if (value === "All Job Types" && updated.jobTypes["All Job Types"]) {
      Object.keys(updated.jobTypes).forEach((k) => {
        if (k !== "All Job Types") updated.jobTypes[k] = false;
      });
    }
    onFiltersChange(updated);
  };

  const handleReset = () => {
    onFiltersChange({
      workLocation: "Remote",
      jobTypes: {
        "All Job Types": true,
        "Full-time": false,
        "Part-time": false,
        Contract: false,
        Internship: false,
        Temporary: false,
      },
      salary: "All Salaries",
      postedAnytime: "Posted Anytime",
      seniority: "All Seniority Levels",
    });
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-900 font-semibold text-base">More Filters</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {/* On-site / Remote */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4 text-sm">
            On-site / Remote
          </h3>
          <div className="space-y-3">
            {[
              { label: "On-site" },
              { label: "Remote" },
              { label: "Hybrid" },
            ].map(({ label }) => (
              <label
                key={label}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="workLocation"
                  checked={filters.workLocation === label}
                  onChange={() => handleRadioChange("workLocation", label)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm group-hover:text-gray-900">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Job Types */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4 text-sm">
            Job Types
          </h3>
          <div className="space-y-3">
            {[
              { label: "All Job Types" },
              { label: "Full-time" },
              { label: "Part-time" },
              { label: "Contract" },
              { label: "Internship" },
              { label: "Temporary" },
            ].map(({ label }) => (
              <label
                key={label}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={!!filters.jobTypes[label]}
                  onChange={() => handleCheckboxChange(label)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm group-hover:text-gray-900">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Salary */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4 text-sm">
            Salary Range
          </h3>
          <div className="space-y-3">
            {[
              { label: "All Salaries" },
              { label: "$50,000+" },
              { label: "$70,000+" },
              { label: "$90,000+" },
              { label: "$110,000+" },
              { label: "$130,000+" },
            ].map(({ label }) => (
              <label
                key={label}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="salary"
                  checked={filters.salary === label}
                  onChange={() => handleRadioChange("salary", label)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm group-hover:text-gray-900">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Posted */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4 text-sm">
            Date Posted
          </h3>
          <div className="space-y-3">
            {[
              { label: "Posted Anytime" },
              { label: "Last 1 days" },
              { label: "Last 3 days" },
              { label: "Last 7 days" },
              { label: "Last 14 days" },
            ].map(({ label }) => (
              <label
                key={label}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="postedAnytime"
                  checked={filters.postedAnytime === label}
                  onChange={() => handleRadioChange("postedAnytime", label)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm group-hover:text-gray-900">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Seniority */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4 text-sm">
            Seniority Level
          </h3>
          <div className="space-y-3">
            {[
              { label: "All Seniority Levels" },
              { label: "Entry Level" },
              { label: "Mid Senior Level" },
              { label: "Executive" },
            ].map(({ label }) => (
              <label
                key={label}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="seniority"
                  checked={filters.seniority === label}
                  onChange={() => handleRadioChange("seniority", label)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm group-hover:text-gray-900">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {(() => {
            const active = [];
            if (filters.workLocation !== "Remote")
              active.push(filters.workLocation);
            if (filters.salary !== "All Salaries") active.push(filters.salary);
            if (filters.postedAnytime !== "Posted Anytime")
              active.push(filters.postedAnytime);
            if (filters.seniority !== "All Seniority Levels")
              active.push(filters.seniority);
            const types = Object.entries(filters.jobTypes)
              .filter(([k, v]) => v && k !== "All Job Types")
              .map(([k]) => k);
            active.push(...types);
            return active.length > 0
              ? `${active.length} filter${active.length > 1 ? "s" : ""} active: ${active.join(", ")}`
              : "No filters active";
          })()}
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-[#3B82F6] hover:bg-[#3077e8] text-white font-medium rounded-lg transition-colors text-sm"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};
