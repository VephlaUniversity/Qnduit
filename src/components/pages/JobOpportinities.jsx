import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";
import { FilterDropdown } from "./JobFilterDropdown";
import {
  SALARY_MIN,
  SALARY_MAX,
  countActiveFilters,
} from "../utils/jobFilters";
import { CTA } from "../home/CTA";
import { SuggestInput } from "./SuggestInput";
import { rankJobs } from "../../../backend/src/config/jobSearch.js";
import { AnimatedPage } from "../AnimatedPage";
import axios from "axios";
import { toast } from "sonner";
import { friendlyError } from "../utils/userMessage";
import { API_BASE_URL } from "../utils/api";
import {
  daysLeftLabel,
  formatSalary,
  formatPosted,
  normalizeList,
  postedWithin,
  jobPath,
} from "../utils/jobDisplay";

// Employers cannot save jobs (saved jobs belong to talent accounts).
const isEmployerSignedIn = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.userType === "employer" || user?.role === "employer";
  } catch {
    return false;
  }
};

export const JobOpportunities = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const jobTitle = searchParams.get("jobTitle") || "";
  const location = searchParams.get("location") || "";
  const workType = searchParams.get("workType") || "";
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Sidebar filter state
  const [searchKeyword, setSearchKeyword] = useState(jobTitle);
  const [locationFilter, setLocationFilter] = useState(location);
  const [workTypeFilter, setWorkTypeFilter] = useState(workType);
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [salaryRange, setSalaryRange] = useState([SALARY_MIN, SALARY_MAX]);
  const [postedAnytime, setPostedAnytime] = useState("anytime");
  const [seniorityLevel, setSeniorityLevel] = useState("all");
  const [company, setCompany] = useState("");

  // Filter More panel (large screens) open state; its values are the shared filters above
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState("grid");
  const [favorites, setFavorites] = useState([]); // ids of jobs this talent has saved
  const [savingIds, setSavingIds] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("default");

  // Fetch jobs from API
  useEffect(() => {
    const controller = new AbortController();
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await axios.get(`${API_BASE_URL}/api/jobs/search`, {
          params: { q: jobTitle, location, workType },
          signal: controller.signal,
        });
        setJobs(Array.isArray(res.data.jobs) ? res.data.jobs : []);
      } catch (err) {
        if (axios.isCancel(err) || err.name === "CanceledError") return;
        console.error("Job search failed", err);
        setJobs([]);
        setLoadError("We couldn't load jobs right now. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchJobs();
    return () => controller.abort();
  }, [jobTitle, location, workType, reloadKey]);

  // Sync URL params into filter inputs when URL changes
  useEffect(() => {
    setSearchKeyword(jobTitle);
    setLocationFilter(location);
    setWorkTypeFilter(workType);
    // A new search returns a new set of jobs, so a company picked earlier may
    // no longer be in the list. Clear it so it can't hide every result.
    setCompany("");
  }, [jobTitle, location, workType]);

  // Load the jobs this talent has already saved so their hearts show as filled.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || isEmployerSignedIn()) return;
    let active = true;
    axios
      .get(`${API_BASE_URL}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (active)
          setFavorites((res.data.jobs || []).map((j) => String(j.id)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const companyOptions = [
    ...new Set(
      (Array.isArray(jobs) ? jobs : [])
        .map((job) => job.employer?.companyName)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  // Apply all active filters (sidebar + dropdown) to fetched jobs
  // The keyword and location boxes use the same word-based matching as the server
  // (spelling variants, small typos, relevance order), so results update as you type.
  const matchedJobs = rankJobs(Array.isArray(jobs) ? jobs : [], {
    q: searchKeyword,
    location: locationFilter,
  });

  const filteredJobs = matchedJobs.filter((job) => {
    // Work type (Remote / On-site / Hybrid) lives in job.workType
    if (workTypeFilter) {
      const wanted = workTypeFilter.toLowerCase().replace(/[- ]/g, "");
      if ((job.workType || "").toLowerCase().replace(/[- ]/g, "") !== wanted)
        return false;
    }

    // Job type (Full Time / Part Time / ...) lives in job.jobApplyType
    if (jobTypeFilter) {
      const wanted = jobTypeFilter.toLowerCase().replace(/[- ]/g, "");
      const types = normalizeList(job.jobApplyType).map((t) =>
        String(t).toLowerCase().replace(/[- ]/g, ""),
      );
      if (!types.some((t) => t.includes(wanted) || wanted.includes(t)))
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

    // Salary range (sidebar slider): keep jobs whose range overlaps the selection
    if (job.salary?.min != null || job.salary?.max != null) {
      const jobMin = Number(job.salary.min ?? job.salary.max);
      const jobMax = Number(job.salary.max ?? job.salary.min);
      if (jobMax < salaryRange[0] || jobMin > salaryRange[1]) return false;
    }

    // Posted window
    if (!postedWithin(job.createdAt, postedAnytime)) return false;

    // Seniority (career level)
    if (seniorityLevel !== "all") {
      const level = String(job.careerLevel || "").toLowerCase();
      const wanted =
        {
          entry: "entry",
          mid: "mid",
          senior: "senior",
          lead: "lead",
          executive: "exec",
        }[seniorityLevel] || seniorityLevel;
      if (!level.includes(wanted)) return false;
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

  const toggleFavorite = async (jobId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please sign in to save this job");
      return;
    }
    if (isEmployerSignedIn()) {
      toast.error("Only talent accounts can save jobs");
      return;
    }
    if (savingIds.includes(jobId)) return;

    const wasSaved = favorites.includes(jobId);
    const headers = { Authorization: `Bearer ${token}` };
    setSavingIds((ids) => [...ids, jobId]);
    try {
      await axios.post(
        `${API_BASE_URL}/api/saved-jobs${wasSaved ? "/remove-job" : ""}`,
        { jobId },
        { headers },
      );
      setFavorites((prev) =>
        wasSaved ? prev.filter((id) => id !== jobId) : [...prev, jobId],
      );
      toast.success(
        wasSaved ? "Job removed from favorites!" : "Job added to favorites!",
      );
    } catch (error) {
      if (/already saved/i.test(error.response?.data?.message || "")) {
        setFavorites((prev) =>
          prev.includes(jobId) ? prev : [...prev, jobId],
        );
      } else {
        toast.error(
          friendlyError(
            error,
            "We couldn't update your saved jobs. Please try again.",
          ),
        );
      }
    } finally {
      setSavingIds((ids) => ids.filter((id) => id !== jobId));
    }
  };

  // Put the search in the URL so the server runs a fresh search and the
  // result can be shared or reached with the back button.
  const applySearch = (overrides = {}) => {
    const keyword = (overrides.keyword ?? searchKeyword).trim();
    const place = overrides.location ?? locationFilter;
    const next = new URLSearchParams();
    if (keyword) next.set("jobTitle", keyword);
    if (place) next.set("location", place);
    if (workTypeFilter) next.set("workType", workTypeFilter);
    setSearchParams(next);
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  const handleFindJobs = () => applySearch();

  // A suggestion was chosen: search right away.
  const handlePickSuggestion = (kind, text) => {
    if (kind === "location") {
      setLocationFilter(text);
      // the typed words were part of a place name, so clear them from the keyword box
      applySearch({ keyword: "", location: text });
    } else {
      setSearchKeyword(text);
      applySearch({ keyword: text });
    }
  };

  const handlePickLocation = (_kind, text) => {
    setLocationFilter(text);
    applySearch({ location: text });
  };

  const resetFilters = () => {
    setSearchKeyword(jobTitle);
    setLocationFilter(location);
    setWorkTypeFilter(workType);
    setJobTypeFilter("");
    setSalaryRange([SALARY_MIN, SALARY_MAX]);
    setPostedAnytime("anytime");
    setSeniorityLevel("all");
    setCompany("");
    setCurrentPage(1);
  };

  // Active filters (badge on the Filter More button)
  const activeFilterCount = countActiveFilters({
    workType: workTypeFilter,
    jobType: jobTypeFilter,
    salaryRange,
    posted: postedAnytime,
    seniority: seniorityLevel,
    company,
  });

  // Job Card
  const JobCard = ({ job }) => (
    <div
      className="bg-[#191D23] rounded-xl p-6 cursor-pointer hover:bg-[#1E232B] transition-colors"
      onClick={(e) => {
        // The title is a real link and the heart is a button; let them do their own thing.
        if (e.target.closest("a, button")) return;
        navigate(jobPath(job));
      }}
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
              <Link
                to={jobPath(job)}
                className="hover:text-[#3B82F6] transition-colors"
              >
                {job.jobTitle}
              </Link>
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
                {formatPosted(job.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(job._id);
          }}
          disabled={savingIds.includes(job._id)}
          aria-label={
            favorites.includes(job._id) ? "Remove from saved jobs" : "Save job"
          }
          className="p-2 rounded-lg hover:bg-[#2A3142] transition-colors disabled:opacity-60"
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
          {normalizeList(job.jobApplyType).map((type) => (
            <span
              key={type}
              className="px-3 py-1 bg-[#f1f1f1] text-black rounded-full text-sm"
            >
              {type}
            </span>
          ))}

          {job.workType && (
            <span className="px-3 py-1 bg-[#f1f1f1] text-black rounded-full text-sm">
              {job.workType}
            </span>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-[#f1f1f1] flex items-center gap-1 text-sm">
          <DollarSign className="w-4 h-4" />
          {formatSalary(job.salary)}
        </span>
        <span className="text-gray-400 text-sm">
          {daysLeftLabel(job.deadlineDate)}
        </span>
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

        {/* Top Search Bar (large screens only; smaller screens search from the drawer) */}
        <div className="hidden lg:block px-6 py-6 border-b border-[#1A1F2E]">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              <div className="bg-white rounded-lg p-2 flex items-center gap-2 md:gap-4">
                {/* Job title input */}
                <SuggestInput
                  mode="keyword"
                  theme="light"
                  wrapperClassName="relative flex-1 min-w-0 flex items-center gap-3"
                  icon={
                    <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  }
                  placeholder="Job title, keywords or company"
                  value={searchKeyword}
                  onChange={(v) => {
                    setSearchKeyword(v);
                    setCurrentPage(1);
                  }}
                  onPick={handlePickSuggestion}
                  onSubmit={applySearch}
                  inputClassName="flex-1 outline-none text-gray-900 text-sm min-w-0"
                />

                <div className="hidden sm:block h-8 w-px bg-gray-300" />

                {/* Location input */}
                <SuggestInput
                  mode="location"
                  theme="light"
                  wrapperClassName="relative hidden sm:flex flex-1 items-center gap-3"
                  icon={
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  }
                  placeholder="Location"
                  value={locationFilter}
                  onChange={(v) => {
                    setLocationFilter(v);
                    setCurrentPage(1);
                  }}
                  onPick={handlePickLocation}
                  onSubmit={applySearch}
                  inputClassName="flex-1 outline-none text-gray-900 text-sm min-w-0"
                />

                <div className="hidden lg:block h-8 w-px bg-gray-300" />

                {/* Filter More button (large screens; smaller screens use the sidebar drawer) */}
                <button
                  data-filter-toggle
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`hidden lg:flex px-3 py-2 rounded-lg items-center gap-2 text-sm transition-colors relative ${
                    isFilterOpen
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter More</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                  {/* Active filters badge */}
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleFindJobs}
                  className="px-3 md:px-5 py-2 bg-[#3B82F6] hover:bg-[#3077e8] text-white font-medium rounded-md transition-colors text-sm whitespace-nowrap flex-shrink-0"
                >
                  Find Jobs
                </button>
              </div>

              <FilterDropdown
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={{
                  workType: workTypeFilter,
                  jobType: jobTypeFilter,
                  salaryRange,
                  posted: postedAnytime,
                  seniority: seniorityLevel,
                  company,
                }}
                companyOptions={companyOptions}
                onReset={resetFilters}
                onChange={(patch) => {
                  if ("workType" in patch) setWorkTypeFilter(patch.workType);
                  if ("jobType" in patch) setJobTypeFilter(patch.jobType);
                  if ("salaryRange" in patch) setSalaryRange(patch.salaryRange);
                  if ("posted" in patch) setPostedAnytime(patch.posted);
                  if ("seniority" in patch) setSeniorityLevel(patch.seniority);
                  if ("company" in patch) setCompany(patch.company);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Smaller screens: toggle, overlay and drawer are rendered on document.body
                so they sit above the sticky header (its blur creates its own layer). */}
            {typeof document !== "undefined" &&
              createPortal(
                <>
                  {sidebarOpen && (
                    <div
                      className="lg:hidden fixed inset-0 bg-black/50 z-[55]"
                      onClick={() => setSidebarOpen(false)}
                    />
                  )}

                  <div
                    aria-hidden={!sidebarOpen}
                    className={`${
                      sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } lg:hidden fixed top-0 left-0 h-full w-80 max-w-[90vw] bg-[#0F1419] z-[58] transition-transform duration-300 overflow-y-auto`}
                  >
                    <div className="bg-[#191D23] rounded-xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-white font-semibold text-lg">
                          Filters
                        </h2>
                        <button
                          onClick={() => setSidebarOpen(false)}
                          aria-label="Close filters"
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A3142]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Search */}
                      <div>
                        <h3 className="text-white font-semibold mb-3">
                          Search
                        </h3>
                        <SuggestInput
                          mode="keyword"
                          theme="dark"
                          wrapperClassName="relative"
                          icon={
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          }
                          placeholder="Job title, keywords or company"
                          value={searchKeyword}
                          onChange={(v) => {
                            setSearchKeyword(v);
                            setCurrentPage(1);
                          }}
                          onPick={handlePickSuggestion}
                          onSubmit={applySearch}
                          inputClassName="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <h3 className="text-white font-semibold mb-3">
                          Location
                        </h3>
                        <SuggestInput
                          mode="location"
                          theme="dark"
                          wrapperClassName="relative"
                          icon={
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          }
                          placeholder="City, country..."
                          value={locationFilter}
                          onChange={(v) => {
                            setLocationFilter(v);
                            setCurrentPage(1);
                          }}
                          onPick={handlePickLocation}
                          onSubmit={applySearch}
                          inputClassName="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                        />
                      </div>

                      <button
                        onClick={handleFindJobs}
                        className="w-full bg-[#3B82F6] hover:bg-[#3077e8] text-white font-semibold py-3 rounded-lg transition-colors"
                      >
                        Find Jobs
                      </button>

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
                        <h3 className="text-white font-semibold mb-3">
                          Job Type
                        </h3>
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
                          max={SALARY_MAX}
                          min={SALARY_MIN}
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

                      {/* Posted */}
                      <div>
                        <h3 className="text-white font-semibold mb-3">
                          Posted
                        </h3>
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
                        <h3 className="text-white font-semibold mb-3">
                          Company
                        </h3>
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
                            {companyOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
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
                </>,
                document.body,
              )}

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
                  <button
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open filters"
                    className="lg:hidden relative p-2 rounded bg-[#1A1F2E] hover:bg-[#232A3B]"
                  >
                    <Filter className="w-5 h-5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#3B82F6] text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {activeFilterCount}
                      </span>
                    )}
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
              ) : loadError ? (
                <div className="p-12 text-center" role="alert">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Something went wrong
                  </h2>
                  <p className="text-gray-400 mb-6">{loadError}</p>
                  <button
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="bg-[#3B82F6] hover:bg-[#3077e8] text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Try again
                  </button>
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
