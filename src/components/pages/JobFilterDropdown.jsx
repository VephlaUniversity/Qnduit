import { useEffect, useRef } from "react";
import {
  SALARY_BANDS,
  matchingBand,
  countActiveFilters,
} from "../utils/jobFilters";

const WORK_TYPES = [
  { label: "Any", value: "" },
  { label: "On-site", value: "on-site" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
];

const JOB_TYPES = [
  { label: "All Job Types", value: "" },
  { label: "Full-time", value: "full-time" },
  { label: "Part-time", value: "part-time" },
  { label: "Contract", value: "contract" },
  { label: "Temporary", value: "temporary" },
  { label: "Freelancer", value: "freelancer" },
];

const POSTED = [
  { label: "Posted Anytime", value: "anytime" },
  { label: "Today", value: "today" },
  { label: "Past Week", value: "week" },
  { label: "Past Month", value: "month" },
];

const SENIORITY = [
  { label: "All Seniority Levels", value: "all" },
  { label: "Entry Level", value: "entry" },
  { label: "Mid Level", value: "mid" },
  { label: "Senior Level", value: "senior" },
  { label: "Lead", value: "lead" },
  { label: "Executive", value: "executive" },
];

const RadioGroup = ({ title, name, options, value, onSelect }) => (
  <div>
    <h3 className="text-gray-900 font-semibold mb-4 text-sm">{title}</h3>
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.label}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onSelect(option.value)}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="text-gray-700 text-sm group-hover:text-gray-900">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  </div>
);

// Large-screen "Filter More" panel. It holds no state of its own: it reads and
// writes the same filters as the sidebar.
export const FilterDropdown = ({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  companyOptions = [],
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // The "Filter More" button toggles the panel itself; closing here as well
      // would make its click reopen the panel straight away.
      if (e.target.closest?.("[data-filter-toggle]")) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const band = matchingBand(filters.salaryRange);
  const active = countActiveFilters(filters);

  return (
    <div
      ref={dropdownRef}
      className="hidden lg:block absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl z-50 p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-900 font-semibold text-base">More Filters</h3>
        <button
          onClick={onReset}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Reset all
        </button>
      </div>

      <div className="grid grid-cols-3 xl:grid-cols-6 gap-8">
        <RadioGroup
          title="On-site / Remote"
          name="workLocation"
          options={WORK_TYPES}
          value={filters.workType}
          onSelect={(v) => onChange({ workType: v })}
        />
        <RadioGroup
          title="Job Type"
          name="jobType"
          options={JOB_TYPES}
          value={filters.jobType}
          onSelect={(v) => onChange({ jobType: v })}
        />
        <div>
          <RadioGroup
            title="Salary Range"
            name="salary"
            options={SALARY_BANDS.map((b) => ({
              label: b.label,
              value: b.label,
            }))}
            value={band ? band.label : null}
            onSelect={(label) =>
              onChange({
                salaryRange: SALARY_BANDS.find((b) => b.label === label).range,
              })
            }
          />
          {!band && (
            <p className="mt-3 text-xs text-gray-500">
              Custom: ${filters.salaryRange[0].toLocaleString()} – $
              {filters.salaryRange[1].toLocaleString()}
            </p>
          )}
        </div>
        <RadioGroup
          title="Date Posted"
          name="postedAnytime"
          options={POSTED}
          value={filters.posted}
          onSelect={(v) => onChange({ posted: v })}
        />
        <RadioGroup
          title="Seniority Level"
          name="seniority"
          options={SENIORITY}
          value={filters.seniority}
          onSelect={(v) => onChange({ seniority: v })}
        />
        <div>
          <h3 className="text-gray-900 font-semibold mb-4 text-sm">Company</h3>
          <select
            value={filters.company}
            onChange={(e) => onChange({ company: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
          >
            <option value="">All Companies</option>
            {companyOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          {active > 0
            ? `${active} filter${active > 1 ? "s" : ""} active`
            : "No filters active"}
        </p>
      </div>
    </div>
  );
};
