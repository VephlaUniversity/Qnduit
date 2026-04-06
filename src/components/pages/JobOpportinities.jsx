import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import * as Slider from "@radix-ui/react-slider";
import {
  Search,
  Grid,
  List,
  Heart,
  MapPin,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { FilterDropdown } from "./JobFilterDropdown";
import { CTA } from "../home/CTA";
import { AnimatedPage } from "../AnimatedPage";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

export const JobOpportunities = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const jobTitle = searchParams.get("jobTitle") || "";
  const location = searchParams.get("location") || "";
  const workType = searchParams.get("workType") || "";
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sidebar filter state
  const [searchKeyword, setSearchKeyword] = useState(jobTitle);
  const [locationFilter, setLocationFilter] = useState(location);
  const [workTypeFilter, setWorkTypeFilter] = useState(workType);
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [salaryRange, setSalaryRange] = useState([0, 240000]);
  const [radius, setRadius] = useState(25);
  const [postedAnytime, setPostedAnytime] = useState("anytime");
  const [seniorityLevel, setSeniorityLevel] = useState("all");
  const [company, setCompany] = useState("");

  // FilterDropdown state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dropdownFilters, setDropdownFilters] = useState({
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

  // UI state
  const [viewMode, setViewMode] = useState("grid");
  const [favorites, setFavorites] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("default");

  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE_URL}/api/jobs/search?jobTitle=${jobTitle}&location=${location}&workType=${workType}`,
        );
        setJobs(res.data.jobs);
      } catch (err) {
        console.error("Job search failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [jobTitle, location, workType]);

  // Sync URL params into filter inputs when URL changes
  useEffect(() => {
    setSearchKeyword(jobTitle);
    setLocationFilter(location);
    setWorkTypeFilter(workType);
  }, [jobTitle, location, workType]);

  // Apply all active filters (sidebar + dropdown) to fetched jobs
  const filteredJobs = (Array.isArray(jobs) ? jobs : []).filter((job) => {
    // Keyword
    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      const match =
        job.jobTitle?.toLowerCase().includes(q) ||
        job.employer?.companyName?.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Location
    if (locationFilter) {
      if (!job.location?.toLowerCase().includes(locationFilter.toLowerCase()))
        return false;
    }

    // Work type (sidebar)
    if (workTypeFilter) {
      if (
        !job.jobApplyType?.some((t) =>
          t.toLowerCase().includes(workTypeFilter.toLowerCase()),
        )
      )
        return false;
    }

    // Job type (sidebar)
    if (jobTypeFilter) {
      if (
        !job.jobApplyType?.some((t) =>
          t.toLowerCase().includes(jobTypeFilter.toLowerCase()),
        )
      )
        return false;
    }

    // Company (sidebar)
    if (company) {
      if (
        !job.employer?.companyName
          ?.toLowerCase()
          .includes(company.toLowerCase())
      )
        return false;
    }

    // Salary range (sidebar slider)
    if (job.salary?.min !== undefined) {
      if (job.salary.min < salaryRange[0] || job.salary.max > salaryRange[1])
        return false;
    }

    // Dropdown filters

    // Work location from dropdown
    if (dropdownFilters.workLocation !== "Remote") {
      if (
        !job.jobApplyType?.some((t) =>
          t.toLowerCase().includes(dropdownFilters.workLocation.toLowerCase()),
        )
      )
        return false;
    }

    // Job types from dropdown
    const selectedJobTypes = Object.entries(dropdownFilters.jobTypes)
      .filter(([key, val]) => val && key !== "All Job Types")
      .map(([key]) => key.toLowerCase());
    if (selectedJobTypes.length > 0) {
      if (
        !selectedJobTypes.some((type) =>
          job.jobApplyType?.some((t) => t.toLowerCase().includes(type)),
        )
      )
        return false;
    }

    // Salary from dropdown
    if (dropdownFilters.salary !== "All Salaries") {
      const minSalary = parseInt(dropdownFilters.salary.replace(/[^0-9]/g, ""));
      if (!isNaN(minSalary) && job.salary?.min < minSalary) return false;
    }

    // Seniority from dropdown
    if (
      dropdownFilters.seniority !== "All Seniority Levels" &&
      job.seniorityLevel
    ) {
      if (
        !job.seniorityLevel
          .toLowerCase()
          .includes(dropdownFilters.seniority.toLowerCase())
      )
        return false;
    }

    return true;
  });

  // Sort
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortBy === "salary")
      return Number(b.salary?.min || 0) - Number(a.salary?.min || 0);
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const paginatedJobs = sortedJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 5);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFavorite = (jobId) => {
    setFavorites((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId],
    );
  };

  const handleFindJobs = () => {
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  const resetFilters = () => {
    setSearchKeyword(jobTitle);
    setLocationFilter(location);
    setWorkTypeFilter(workType);
    setJobTypeFilter("");
    setSalaryRange([0, 240000]);
    setRadius(25);
    setPostedAnytime("anytime");
    setSeniorityLevel("all");
    setCompany("");
    setDropdownFilters({
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
    setCurrentPage(1);
  };

  // Count active dropdown filters
  const activeDropdownCount = (() => {
    let count = 0;
    if (dropdownFilters.workLocation !== "Remote") count++;
    if (dropdownFilters.salary !== "All Salaries") count++;
    if (dropdownFilters.postedAnytime !== "Posted Anytime") count++;
    if (dropdownFilters.seniority !== "All Seniority Levels") count++;
    const activeTypes = Object.entries(dropdownFilters.jobTypes).filter(
      ([k, v]) => v && k !== "All Job Types",
    );
    if (activeTypes.length > 0) count++;
    return count;
  })();

  // Job Card
  const JobCard = ({ job }) => (
    <div
      className="bg-[#191D23] rounded-xl p-6 cursor-pointer hover:bg-[#1E232B] transition-colors"
      onClick={() =>
        navigate(`/talent-dashboard/job-results/details/${job._id}`)
      }
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
            {job.employer?.companyName?.charAt(0) || "J"}
          </div>
          <div className="flex-1">
            <div className="text-[#3B82F6] text-sm mb-1">
              {job.employer?.companyName}
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">
              {job.jobTitle}
              {job.verified && (
                <span className="bg-[#3B82F6] inline-block p-1 rounded-full ml-2 align-middle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 15 14"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.40992 0.73096C8.55202 0.77565 8.67617 0.864507 8.76429 0.984609C8.85242 1.10471 8.89993 1.2498 8.89992 1.39876V4.89876H11.6999C11.828 4.8987 11.9536 4.93377 12.0631 5.00014C12.1726 5.06651 12.2618 5.16164 12.321 5.27518C12.3801 5.38872 12.4071 5.51632 12.3988 5.6441C12.3905 5.77187 12.3473 5.89492 12.2739 5.99986L7.37392 12.9999C7.28864 13.122 7.1666 13.2138 7.02556 13.2618C6.88452 13.3099 6.73183 13.3116 6.58971 13.2669C6.44759 13.2222 6.32345 13.1332 6.23537 13.0131C6.14728 12.8929 6.09983 12.7478 6.09992 12.5988V9.09876H3.29992C3.17188 9.09882 3.04627 9.06375 2.93677 8.99738C2.82727 8.93101 2.73808 8.83588 2.67889 8.72234C2.6197 8.6088 2.59279 8.4812 2.60108 8.35342C2.60937 8.22565 2.65255 8.1026 2.72592 7.99766L7.62592 0.99766C7.71133 0.875711 7.83339 0.784169 7.97438 0.736334C8.11537 0.688498 8.26794 0.686861 8.40992 0.73166V0.73096Z"
                      fill="white"
                    />
                  </svg>
                </span>
              )}
            </h3>
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="text-gray-500 text-xs">
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(job._id);
          }}
          className="p-2 rounded-lg hover:bg-[#2A3142] transition-colors"
        >
          <Heart
            className={`w-5 h-5 ${
              favorites.includes(job._id)
                ? "fill-red-500 text-red-500"
                : "text-gray-400"
            }`}
          />
        </button>
      </div>

      <div className="flex justify-between flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {Array.isArray(job.jobApplyType) &&
            job.jobApplyType.map((type, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#f1f1f1] text-black rounded-full text-sm"
              >
                {type}
              </span>
            ))}
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={i < job.rating ? "text-yellow-400" : "text-gray-600"}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-[#f1f1f1] flex items-center gap-1 text-sm">
          <DollarSign className="w-4 h-4" />
          {typeof job.salary === "object" && job.salary?.min && job.salary?.max
            ? `$${job.salary.min} - $${job.salary.max}`
            : job.salary || "Salary not specified"}
          {job.salaryPeriod && (
            <span className="text-gray-500">/{job.salaryPeriod}</span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{job.daysLeft} days left</span>
      </div>
    </div>
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#0F1419] text-white">
        {/* Breadcrumb */}
        <div className="border-b border-[#1A1F2E] bg-[#141921] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
            <Link
              to="/"
              className="text-gray-400 hover:text-blue-400 transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <span className="text-[#3B82F6]">Find Jobs</span>
            {jobTitle && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <span className="text-gray-300">"{jobTitle}"</span>
              </>
            )}
          </div>
        </div>

        {/* Top Search Bar */}
        <div className="px-6 py-6 border-b border-[#1A1F2E]">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              <div className="bg-white rounded-lg p-2 flex items-center gap-2 md:gap-4">
                {/* Job title input */}
                <div className="flex-1 flex items-center gap-3">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Job title, keywords or company"
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 outline-none text-gray-900 text-sm min-w-0"
                  />
                </div>

                <div className="hidden sm:block h-8 w-px bg-gray-300" />

                {/* Location input */}
                <div className="hidden sm:flex flex-1 items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={locationFilter}
                    onChange={(e) => {
                      setLocationFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 outline-none text-gray-900 text-sm min-w-0"
                  />
                </div>

                <div className="hidden sm:block h-8 w-px bg-gray-300" />

                {/* Filter More button */}
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors relative ${
                    isFilterOpen
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter More</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                  {/* Active filters badge */}
                  {activeDropdownCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {activeDropdownCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleFindJobs}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-[#3077e8] text-white font-medium rounded-md transition-colors text-sm whitespace-nowrap"
                >
                  Find Jobs
                </button>
              </div>

              {/* FilterDropdown — receives and updates dropdownFilters state */}
              <FilterDropdown
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={dropdownFilters}
                onFiltersChange={(updated) => {
                  setDropdownFilters(updated);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#3B82F6] hover:bg-[#3077e8] text-white p-4 rounded-full shadow-lg"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black/50 z-30"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div
              className={`${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } lg:translate-x-0 fixed lg:sticky lg:top-6 top-0 left-0 h-full lg:h-auto w-80 flex-shrink-0 bg-[#0F1419] lg:bg-transparent z-40 transition-transform duration-300 overflow-y-auto`}
            >
              <div className="bg-[#191D23] rounded-xl p-6 space-y-6 lg:sticky lg:top-6">
                {/* Search keyword */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Search Jobs</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Job title, keywords or company"
                      value={searchKeyword}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Location</h3>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="City, country..."
                      value={locationFilter}
                      onChange={(e) => {
                        setLocationFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                    />
                  </div>
                </div>

                {/* Work type */}
                <div>
                  <h3 className="text-white font-semibold mb-3">
                    On-Site / Remote
                  </h3>
                  <select
                    value={workTypeFilter}
                    onChange={(e) => {
                      setWorkTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6] appearance-none"
                  >
                    <option value="">All Work Types</option>
                    <option value="on-site">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Job type */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Job Type</h3>
                  <select
                    value={jobTypeFilter}
                    onChange={(e) => {
                      setJobTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6] appearance-none"
                  >
                    <option value="">All Job Types</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                </div>

                {/* Salary slider */}
                <div>
                  <h3 className="text-gray-400 text-sm font-normal mb-3">
                    Salary:{" "}
                    <span className="text-[#3B82F6] font-semibold">
                      ${salaryRange[0].toLocaleString()} – $
                      {salaryRange[1].toLocaleString()}
                    </span>
                  </h3>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={salaryRange}
                    onValueChange={(v) => {
                      setSalaryRange(v);
                      setCurrentPage(1);
                    }}
                    max={240000}
                    min={0}
                    step={1000}
                    minStepsBetweenThumbs={1}
                  >
                    <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-[#3B82F6] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg focus:outline-none"
                      aria-label="Min salary"
                    />
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg focus:outline-none"
                      aria-label="Max salary"
                    />
                  </Slider.Root>
                </div>

                {/* Radius slider */}
                <div>
                  <h3 className="text-gray-400 text-sm font-normal mb-3">
                    Radius:{" "}
                    <span className="text-[#3B82F6] font-semibold">
                      {radius} Miles
                    </span>
                  </h3>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[radius]}
                    onValueChange={(v) => setRadius(v[0])}
                    max={100}
                    min={0}
                    step={1}
                  >
                    <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-[#3B82F6] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-4 h-4 bg-[#3B82F6] rounded-full shadow-lg focus:outline-none"
                      aria-label="Radius"
                    />
                  </Slider.Root>
                </div>

                {/* Posted */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Posted</h3>
                  <div className="relative">
                    <select
                      value={postedAnytime}
                      onChange={(e) => {
                        setPostedAnytime(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-gray-400 text-sm outline-none focus:border-[#3B82F6] appearance-none"
                    >
                      <option value="anytime">Posted Anytime</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Seniority */}
                <div>
                  <h3 className="text-white font-semibold mb-3">
                    Seniority Level
                  </h3>
                  <div className="relative">
                    <select
                      value={seniorityLevel}
                      onChange={(e) => {
                        setSeniorityLevel(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-gray-400 text-sm outline-none focus:border-[#3B82F6] appearance-none"
                    >
                      <option value="all">All Seniority Levels</option>
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="lead">Lead</option>
                      <option value="executive">Executive</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Company */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Company</h3>
                  <div className="relative">
                    <select
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-gray-400 text-sm outline-none focus:border-[#3B82F6] appearance-none"
                    >
                      <option value="">All Companies</option>
                      <option value="google">Google</option>
                      <option value="microsoft">Microsoft</option>
                      <option value="amazon">Amazon</option>
                      <option value="rockstar">Rockstar Games</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full bg-[#3B82F6] hover:bg-[#3077e8] text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Job listings */}
            <div className="flex-1 min-w-0">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded ${viewMode === "list" ? "bg-[#3B82F6]" : "bg-[#1A1F2E]"}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded ${viewMode === "grid" ? "bg-[#3B82F6]" : "bg-[#1A1F2E]"}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <span className="text-gray-400 text-sm">
                    {loading
                      ? "Loading..."
                      : `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""} found`}
                  </span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-[#f1f1f1] border border-[#2A3142] rounded-sm px-4 py-2 text-black text-sm"
                  >
                    <option value="6">6 Per Page</option>
                    <option value="12">12 Per Page</option>
                    <option value="24">24 Per Page</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-[#f1f1f1] border border-[#2A3142] rounded-sm px-4 py-2 text-black text-sm"
                  >
                    <option value="default">Sort (Default)</option>
                    <option value="newest">Newest First</option>
                    <option value="salary">Highest Salary</option>
                  </select>
                </div>
              </div>

              {/* Loading */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Loading jobs...</p>
                  </div>
                </div>
              ) : paginatedJobs.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    No Jobs Found
                  </h2>
                  <p className="text-gray-400 mb-6">
                    No jobs match your current filters. Try adjusting your
                    search.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="bg-[#3B82F6] hover:bg-[#3077e8] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
                      : "space-y-4 mb-8"
                  }
                >
                  {paginatedJobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className={`w-10 h-10 flex items-center justify-center rounded border ${
                      currentPage === 1
                        ? "bg-[#1A1F2E] border-[#2A3142] text-gray-600 cursor-not-allowed"
                        : "bg-[#1A1F2E] border-[#2A3142] hover:bg-[#2A3142] text-white"
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 flex items-center justify-center rounded border ${
                        currentPage === page
                          ? "bg-[#3B82F6] border-[#3077e8] text-white"
                          : "bg-[#1A1F2E] border-[#2A3142] hover:bg-[#2A3142] text-white"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={`w-10 h-10 flex items-center justify-center rounded border ${
                      currentPage === totalPages
                        ? "bg-[#1A1F2E] border-[#2A3142] text-gray-600 cursor-not-allowed"
                        : "bg-[#1A1F2E] border-[#2A3142] hover:bg-[#2A3142] text-white"
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <CTA />
    </AnimatedPage>
  );
};
