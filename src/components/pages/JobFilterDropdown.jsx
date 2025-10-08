import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

export const FilterDropdown = ({ isOpen, onClose }) => {
  const dropdownRef = useRef(null);
  const [filters, setFilters] = useState({
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

  const handleCheckboxChange = (category, value) => {
    if (category === "jobTypes") {
      setFilters((prev) => ({
        ...prev,
        jobTypes: {
          ...prev.jobTypes,
          [value]: !prev.jobTypes[value],
        },
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [category]: value,
      }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 p-8"
    >
      <div className="grid grid-cols-5 gap-8">
        {/* On-site/Remote */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4">On-site/Remote</h3>
          <div className="space-y-3">
            {["On-site", "Remote", "Hybrid"].map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="workLocation"
                  checked={filters.workLocation === option}
                  onChange={() => handleCheckboxChange("workLocation", option)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm">
                  {option} (
                  {option === "Remote"
                    ? "5,675"
                    : option === "On-site"
                    ? "1,675"
                    : "6,675"}
                  )
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* All Job Types */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4">All Job Types</h3>
          <div className="space-y-3">
            {[
              { label: "All Job Types", count: "1,675" },
              { label: "Full-time", count: "623" },
              { label: "Part-time", count: "45" },
              { label: "Contract", count: "65" },
              { label: "Internship", count: "9" },
              { label: "Temporary", count: "4" },
            ].map((option) => (
              <label
                key={option.label}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.jobTypes[option.label]}
                  onChange={() =>
                    handleCheckboxChange("jobTypes", option.label)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm">
                  {option.label} ({option.count})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* All Salary */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4">All Salary</h3>
          <div className="space-y-3">
            {[
              { label: "All Salaries", count: "6,277" },
              { label: "$50,000+", count: "2,277" },
              { label: "$70,000+", count: "1,627" },
              { label: "$90,000+", count: "7,627" },
              { label: "$110,000+", count: "227" },
              { label: "$130,000+", count: "527" },
            ].map((option) => (
              <label
                key={option.label}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="salary"
                  checked={filters.salary === option.label}
                  onChange={() => handleCheckboxChange("salary", option.label)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm">
                  {option.label} ({option.count})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Posted Anytime */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4">Posted Anytime</h3>
          <div className="space-y-3">
            {[
              { label: "Posted Anytime", count: "" },
              { label: "Last 1 days", count: "227" },
              { label: "Last 3 days", count: "227" },
              { label: "Last 7 days", count: "227" },
              { label: "Last 14 days", count: "227" },
            ].map((option) => (
              <label
                key={option.label}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="postedAnytime"
                  checked={filters.postedAnytime === option.label}
                  onChange={() =>
                    handleCheckboxChange("postedAnytime", option.label)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm">
                  {option.label} {option.count && `(${option.count})`}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* All Seniority Levels */}
        <div>
          <h3 className="text-gray-900 font-semibold mb-4">
            All Seniority Levels
          </h3>
          <div className="space-y-3">
            {[
              { label: "All Seniority Levels", count: "" },
              { label: "Entry Level", count: "24" },
              { label: "Mid Senior Level", count: "34" },
              { label: "Executive", count: "12" },
            ].map((option) => (
              <label
                key={option.label}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="seniority"
                  checked={filters.seniority === option.label}
                  onChange={() =>
                    handleCheckboxChange("seniority", option.label)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 text-sm">
                  {option.label} {option.count && `(${option.count})`}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
