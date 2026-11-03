import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Slider from "@radix-ui/react-slider";
import axios from "axios";
import {
  Search,
  MapPin,
  BriefcaseBusiness,
  SlidersHorizontal,
  Heart,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "../utils/api";
import {
  jobKey,
  talentJobPath,
  formatSalary,
  formatPosted,
  normalizeList,
  postedWithin,
} from "../utils/jobDisplay";
import { ExternalJobApplyAction } from "../jobs/JobApplyAction";
import JobImage from "../jobs/JobImage";

const PAGE_SIZE = 12;

const getToken = () => localStorage.getItem("token");

const getJobId = (job) => String(job?._id || "");

const getCompanyName = (job) =>
  job?.employer?.companyName ||
  job?.companyName ||
  job?.company ||
  job?.postedBy?.companyName ||
  "Company name";

const getLocation = (job) =>
  job?.location ||
  job?.jobLocation ||
  job?.address ||
  "Location not specified";

const getWorkType = (job) => {
  const value = job?.workType || job?.workMode;

  if (Array.isArray(value)) return value.join(", ");

  return value || "Not specified";
};

const getSkills = (job) => {
  const values = job?.skills || job?.tags || job?.requiredSkills || [];
  return Array.isArray(values) ? values.slice(0, 4) : [];
};

const getSource = (job) => job?.source || "employer";

const getMatchLabel = (job) => {
  const details = job?.matchDetails || {};

  if (details.skills > 0 && details.location) {
    return "Skills & location match";
  }

  if (details.skills > 0) return "Skills match";
  if (details.location) return "Location match";

  return "Recommended";
};

const normalizeFilterValue = (value) =>
  String(value || "").toLowerCase().replace(/[-_\s]/g, "");

function ExploreJobCard({ job, saved, onToggleSave, onOpen }) {
  const skills = getSkills(job);

  return (
    <article className="h-full cursor-pointer rounded-xl border border-[#2A3142] bg-[#191D23] p-5 transition-colors hover:bg-[#1E232B]">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
          <JobImage job={job} />
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(job)}
            className="block text-left text-base font-semibold text-white hover:text-blue-400"
          >
            {job?.jobTitle || job?.title || "Untitled position"}
          </button>

          <p className="mt-1 truncate text-sm text-gray-400">
            {getCompanyName(job)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(job)}
          aria-label={saved ? "Remove saved job" : "Save job"}
          className={`rounded-lg p-2 transition ${
            saved ? "text-pink-400" : "text-gray-400 hover:text-pink-400"
          }`}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {job?.matchDetails && (
        <div className="mt-4 inline-flex rounded-full bg-blue-600/10 px-3 py-1 text-xs font-medium text-blue-400">
          {getMatchLabel(job)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} />
          {getLocation(job)}
        </span>

        <span className="inline-flex items-center gap-1.5">
          <BriefcaseBusiness size={14} />
          {getWorkType(job)}
        </span>
      </div>

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={`${typeof skill === "string" ? skill : skill?.name}-${index}`}
              className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-gray-300"
            >
              {typeof skill === "string" ? skill : skill?.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#2A3142] pt-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">
            {job?.salary ? formatSalary(job.salary) : "Salary not specified"}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {job?.createdAt ? formatPosted(job.createdAt) : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(job)}
            className="rounded-lg border border-[#2A3142] px-3 py-2 text-xs font-medium text-gray-200 hover:bg-[#1E232B]"
          >
            View details
          </button>

          <ExternalJobApplyAction job={job} />
        </div>
      </div>
    </article>
  );
}

export default function ExploreJobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQueryHandled = useRef(false);

  const [keyword, setKeyword] = useState(
    () => searchParams.get("q") || ""
  );

  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("");
  const [jobType, setJobType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [recommendations, setRecommendations] = useState({
    recommended: [],
    skillsMatch: [],
    nearby: [],
    recentlyAdded: [],
  });

  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");

  const [allJobs, setAllJobs] = useState([]);
  const [allJobsLoading, setAllJobsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [allJobsPage, setAllJobsPage] = useState(1);

  const [searchResults, setSearchResults] = useState([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [salaryRange, setSalaryRange] = useState([0, 240000]);
  const [postedAnytime, setPostedAnytime] = useState("anytime");
  const [seniorityLevel, setSeniorityLevel] = useState("all");
  const [company, setCompany] = useState("");

  const [savedJobKeys, setSavedJobKeys] = useState([]);
  const [savingJobKey, setSavingJobKey] = useState(null);

  const token = getToken();

  const companyOptions = useMemo(() => {
    return [
      ...new Set(
        searchResults
          .map((job) => getCompanyName(job))
          .filter((name) => name && name !== "Company name")
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [searchResults]);

  const fetchRecommendations = useCallback(async () => {
    if (!token) {
      setRecommendationsError(
        "Please sign in to view personalized recommendations."
      );
      setRecommendationsLoading(false);
      return;
    }

    try {
      setRecommendationsLoading(true);
      setRecommendationsError("");

      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/recommendations`,
        {
          params: { page: 1, limit: 50 },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const sections = response.data?.sections || {};

      setRecommendations({
        recommended: Array.isArray(sections.recommended)
          ? sections.recommended
          : [],
        skillsMatch: Array.isArray(sections.skillsMatch)
          ? sections.skillsMatch
          : [],
        nearby: Array.isArray(sections.nearby)
          ? sections.nearby
          : [],
        recentlyAdded: Array.isArray(sections.recentlyAdded)
          ? sections.recentlyAdded
          : [],
      });
    } catch (error) {
      console.error("Explore recommendations error:", error);

      setRecommendationsError(
        error.response?.data?.message ||
          "We couldn't load recommendations right now."
      );
    } finally {
      setRecommendationsLoading(false);
    }
  }, [token]);

  const fetchSavedJobs = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const jobs = Array.isArray(response.data?.jobs)
        ? response.data.jobs
        : [];

      setSavedJobKeys(
        jobs.map((item) => {
          const job = item.job || item;

          return jobKey({
            ...job,
            source: item.source || job.source,
          });
        })
      );
    } catch (error) {
      console.error("Saved jobs error:", error);
    }
  }, [token]);

  const fetchAllJobs = useCallback(async () => {
    try {
      setAllJobsLoading(true);

      const response = await axios.get(`${API_BASE_URL}/api/jobs/search`);

      setAllJobs(
        Array.isArray(response.data?.jobs)
          ? response.data.jobs
          : []
      );
    } catch (error) {
      console.error("Explore all jobs error:", error);
    } finally {
      setAllJobsLoading(false);
    }
  }, []);

  const applyExploreFilters = async () => {
    try {
      setSearchLoading(true);
      setSearchError("");
      setHasSearched(true);
      setPage(1);
      setShowSearchSuggestions(false);

      const params = {};

      if (keyword.trim()) params.q = keyword.trim();
      if (location.trim()) params.location = location.trim();
      if (workType) params.workType = workType;
      if (jobType) params.jobType = jobType;
      if (company) params.company = company;
      if (postedAnytime !== "anytime") {
        params.posted = postedAnytime;
      }
      if (seniorityLevel !== "all") {
        params.seniority = seniorityLevel;
      }
      if (salaryRange[0] !== 0) {
        params.salaryMin = salaryRange[0];
      }
      if (salaryRange[1] !== 240000) {
        params.salaryMax = salaryRange[1];
      }

      setSearchParams(params, { replace: true });

      const response = await axios.get(
        `${API_BASE_URL}/api/jobs/search`,
        { params }
      );

      const jobs =
        response.data?.jobs ||
        response.data?.results ||
        response.data?.data ||
        [];

      setSearchResults(Array.isArray(jobs) ? jobs : []);
    } catch (error) {
      console.error("Explore filter request error:", error);

      setSearchResults([]);
      setSearchError(
        error.response?.data?.message ||
          "Unable to filter jobs. Please try again."
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const runSearch = (event, searchKeyword = keyword) => {
    event?.preventDefault();

    const trimmedKeyword = searchKeyword.trim();

    if (!trimmedKeyword) {
      toast.error("Enter a keyword to search for jobs.");
      return;
    }

    setShowSearchSuggestions(false);

    // Use the same results route and query parameter as DashboardLayout.
    navigate(
      `/talent-dashboard/job-results?jobTitle=${encodeURIComponent(
        trimmedKeyword
      )}`
    );
  };

  // Load the same quick-search suggestions used by the dashboard header.
  useEffect(() => {
    const trimmed = keyword.trim();

    if (trimmed.length < 2) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/jobs`, {
          params: { q: trimmed },
          signal: controller.signal,
        });

        const jobs = response.data?.jobs || [];

        setSearchSuggestions(Array.isArray(jobs) ? jobs : []);
        setShowSearchSuggestions(true);
      } catch (error) {
        if (
          error.name !== "CanceledError" &&
          error.code !== "ERR_CANCELED"
        ) {
          console.error("Explore suggestions error:", error);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword]);

  // Load the page's existing recommendation, saved-job and all-job data.
  useEffect(() => {
    fetchRecommendations();
    fetchSavedJobs();
    fetchAllJobs();
  }, [fetchRecommendations, fetchSavedJobs, fetchAllJobs]);

  // If the user arrives from a search URL, automatically show its results.
  useEffect(() => {
    if (initialQueryHandled.current) return;

    initialQueryHandled.current = true;

    const initialQuery = searchParams.get("q") || "";

    if (initialQuery.trim()) {
      setKeyword(initialQuery);
      runSearch(undefined, initialQuery);
    }

    // This is intentionally a mount-only URL initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paginatedAllJobs = useMemo(() => {
    const start = (allJobsPage - 1) * PAGE_SIZE;
    return allJobs.slice(start, start + PAGE_SIZE);
  }, [allJobs, allJobsPage]);

  const allJobsTotalPages = Math.max(
    1,
    Math.ceil(allJobs.length / PAGE_SIZE)
  );

  useEffect(() => {
    if (allJobsPage > allJobsTotalPages) {
      setAllJobsPage(allJobsTotalPages);
    }
  }, [allJobsPage, allJobsTotalPages]);

  const toggleSavedJob = async (job) => {
    if (!token) {
      toast.error("Please sign in to save jobs.");
      return;
    }

    const key = jobKey(job);
    const jobId = getJobId(job);

    if (!jobId || savingJobKey) return;

    const isSaved = savedJobKeys.includes(key);
    setSavingJobKey(key);

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (isSaved) {
        await axios.post(
          `${API_BASE_URL}/api/saved-jobs/remove-job`,
          { jobId, source: getSource(job) },
          config
        );

        setSavedJobKeys((current) =>
          current.filter((item) => item !== key)
        );

        toast.success("Job removed from saved jobs.");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/saved-jobs`,
          { jobId, source: getSource(job) },
          config
        );

        setSavedJobKeys((current) => [...current, key]);

        toast.success("Job saved successfully.");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update saved job."
      );
    } finally {
      setSavingJobKey(null);
    }
  };

  const openJob = (job) => {
    navigate(talentJobPath(job));
  };

  const clearSearch = () => {
    setKeyword("");
    setLocation("");
    setWorkType("");
    setJobType("");

    setSalaryRange([0, 240000]);
    setPostedAnytime("anytime");
    setSeniorityLevel("all");
    setCompany("");

    setSearchResults([]);
    setSearchSuggestions([]);
    setShowSearchSuggestions(false);
    setSearchError("");
    setHasSearched(false);

    setPage(1);
    setAllJobsPage(1);

    setSearchParams({}, { replace: true });
  };

  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((job) => {
      // Location filter
      if (location.trim()) {
        const wantedLocation = location
          .trim()
          .split(",")[0]
          .trim()
          .toLowerCase();

        const actualLocation = [
          job.location,
          job.jobLocation,
          job.address,
          job.city,
          job.state,
          job.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!actualLocation.includes(wantedLocation)) {
          return false;
        }
      }

      // Work arrangement filter
      if (workType) {
        const wanted = normalizeFilterValue(workType);

        const actualValues = [
          ...normalizeList(job.workType),
          ...normalizeList(job.workMode),
        ].map(normalizeFilterValue);

        if (!actualValues.some((value) => value.includes(wanted))) {
          return false;
        }
      }

      // Employment type filter
      if (jobType) {
        const wanted = normalizeFilterValue(jobType);

        const types = normalizeList(job.jobApplyType).map(
          normalizeFilterValue
        );

        if (!types.some((type) => type.includes(wanted))) {
          return false;
        }
      }

      // Company filter
      if (company) {
        const companyName = getCompanyName(job).toLowerCase();

        if (companyName !== company.toLowerCase()) {
          return false;
        }
      }

      // Salary range filter
      const salaryMin = Number(job.salary?.min ?? job.salary?.max);
      const salaryMax = Number(job.salary?.max ?? job.salary?.min);

      if (job.salary?.min != null || job.salary?.max != null) {
        if (
          salaryMax < salaryRange[0] ||
          salaryMin > salaryRange[1]
        ) {
          return false;
        }
      }

      // Posted date filter
      if (!postedWithin(job.createdAt, postedAnytime)) {
        return false;
      }

      // Seniority filter
      if (seniorityLevel !== "all") {
        const level = String(job.careerLevel || "").toLowerCase();

        const wanted = {
          entry: "entry",
          mid: "mid",
          senior: "senior",
          lead: "lead",
          executive: "exec",
        }[seniorityLevel] || seniorityLevel;

        if (!level.includes(wanted)) {
          return false;
        }
      }

      return true;
    });
  }, [
    searchResults,
    location,
    workType,
    jobType,
    company,
    salaryRange,
    postedAnytime,
    seniorityLevel,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    location,
    workType,
    jobType,
    company,
    salaryRange,
    postedAnytime,
    seniorityLevel,
  ]);

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSearchResults.slice(start, start + PAGE_SIZE);
  }, [filteredSearchResults, page]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSearchResults.length / PAGE_SIZE)
  );

  const renderSection = (title, description, jobs) => {
    if (!jobs?.length) return null;

    return (
      <section className="mb-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white md:text-2xl">
              {title}
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              clearSearch();

              document
                .getElementById("explore-all-jobs")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
            className="shrink-0 text-sm font-medium text-[#3B82F6] hover:text-blue-400"
          >
            View all <ChevronRight className="ml-1 inline" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {jobs.map((job) => {
            const key = jobKey(job);

            return (
              <ExploreJobCard
                key={key}
                job={job}
                saved={savedJobKeys.includes(key)}
                onToggleSave={toggleSavedJob}
                onOpen={openJob}
              />
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-[#0F1419] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Explore Jobs
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-400 md:text-base">
            Discover opportunities selected around your skills, experience
            and preferred location.
          </p>
        </header>

        <form
          onSubmit={runSearch}
          className="mb-6 rounded-xl border border-[#2A3142] bg-[#191D23] p-4 md:p-5"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* Keyword search and suggestions */}
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-3 rounded-lg border border-[#2A3142] bg-[#0F1419] px-4 focus-within:border-blue-600">
                <Search className="shrink-0 text-gray-400" size={20} />

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSearchSuggestions(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setShowSearchSuggestions(false);
                    }
                  }}
                  placeholder="Job title, skill, company or keyword"
                  className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
                />
              </div>

              {showSearchSuggestions &&
                searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#2A3142] bg-[#191D23] shadow-xl">
                    {searchSuggestions.map((job) => (
                      <button
                        key={jobKey(job)}
                        type="button"
                        onClick={() => {
                          setShowSearchSuggestions(false);
                          openJob(job);
                        }}
                        className="flex w-full items-center justify-between gap-3 border-b border-[#2A3142] px-4 py-3 text-left last:border-0 hover:bg-[#1E232B]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {job.jobTitle || job.title || "Untitled position"}
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-400">
                            {job.companyName || getCompanyName(job)}
                          </p>
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-gray-500"
                        />
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => runSearch()}
                      className="w-full bg-white/5 px-4 py-3 text-left text-sm font-medium text-blue-400 hover:bg-white/10"
                    >
                      View all results for "{keyword}"
                    </button>
                  </div>
                )}
            </div>

            {/* Location input */}
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#2A3142] bg-[#0F1419] px-4 focus-within:border-blue-600 lg:w-64">
              <MapPin className="shrink-0 text-gray-400" size={19} />

              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location"
                className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
            </div>

            <button
              type="submit"
              disabled={searchLoading}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={17} />
              {searchLoading ? "Searching..." : "Search jobs"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#2A3142] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">
                Quick filters:
              </span>

              <select
                value={jobType}
                onChange={(event) => setJobType(event.target.value)}
                className="rounded-lg border border-[#2A3142] bg-[#0F1419] px-3 py-2 text-xs text-gray-300 outline-none"
              >
                <option value="">Job type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>

              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2A3142] px-3 py-2 text-xs text-gray-300 hover:bg-[#1E232B]"
              >
                <SlidersHorizontal size={14} />
                Filters
              </button>
            </div>

            {(keyword ||
              location ||
              workType ||
              jobType ||
              company ||
              postedAnytime !== "anytime" ||
              seniorityLevel !== "all" ||
              salaryRange[0] !== 0 ||
              salaryRange[1] !== 240000) && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 border-t border-[#2A3142] pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-gray-400">
                Work arrangement

                <select
                  value={workType}
                  onChange={(event) => setWorkType(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[#2A3142] bg-[#0F1419] px-3 text-sm text-white"
                >
                  <option value="">Any arrangement</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Employment type

                <select
                  value={jobType}
                  onChange={(event) => setJobType(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[#2A3142] bg-[#0F1419] px-3 text-sm text-white"
                >
                  <option value="">Any job type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Internship">Internship</option>
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Company

                <select
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[#2A3142] bg-[#0F1419] px-3 text-sm text-white"
                >
                  <option value="">All companies</option>

                  {companyOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Posted

                <select
                  value={postedAnytime}
                  onChange={(event) => setPostedAnytime(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[#2A3142] bg-[#0F1419] px-3 text-sm text-white"
                >
                  <option value="anytime">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                </select>
              </label>

              <label className="text-xs text-gray-400">
                Seniority

                <select
                  value={seniorityLevel}
                  onChange={(event) => setSeniorityLevel(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[#2A3142] bg-[#0F1419] px-3 text-sm text-white"
                >
                  <option value="all">All levels</option>
                  <option value="entry">Entry level</option>
                  <option value="mid">Mid level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="executive">Executive</option>
                </select>
              </label>

              <div className="text-xs text-gray-400">
                <div className="mb-4 flex items-center justify-between">
                  <span>Salary range</span>

                  <span className="font-medium text-white">
                    ${salaryRange[0].toLocaleString()} – $
                    {salaryRange[1].toLocaleString()}
                  </span>
                </div>

                <Slider.Root
                  className="relative flex h-5 w-full touch-none select-none items-center"
                  value={salaryRange}
                  min={0}
                  max={240000}
                  step={1000}
                  minStepsBetweenThumbs={1}
                  onValueChange={setSalaryRange}
                >
                  <Slider.Track className="relative h-1.5 grow rounded-full bg-[#2A3142]">
                    <Slider.Range className="absolute h-full rounded-full bg-blue-600" />
                  </Slider.Track>

                  <Slider.Thumb
                    className="block h-4 w-4 rounded-full border-2 border-blue-500 bg-white shadow outline-none focus:ring-2 focus:ring-blue-500/40"
                    aria-label="Minimum salary"
                  />

                  <Slider.Thumb
                    className="block h-4 w-4 rounded-full border-2 border-blue-500 bg-white shadow outline-none focus:ring-2 focus:ring-blue-500/40"
                    aria-label="Maximum salary"
                  />
                </Slider.Root>

                <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                  <span>$0</span>
                  <span>$240,000+</span>
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 border-t border-[#2A3142] pt-4">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-lg border border-[#2A3142] px-4 py-2 text-sm text-gray-300"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={applyExploreFilters}
                  disabled={searchLoading}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {searchLoading ? "Applying..." : "Apply Filters"}
                </button>
              </div>
            </div>
          )}
        </form>

        {hasSearched ? (
          <section id="explore-all-jobs" className="scroll-mt-6">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Search results
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {searchLoading
                    ? "Finding matching opportunities..."
                    : `${filteredSearchResults.length} job${
                        filteredSearchResults.length === 1 ? "" : "s"
                      } found`}
                </p>
              </div>

              <button
                type="button"
                onClick={clearSearch}
                className="text-sm text-[#3B82F6] hover:text-blue-400"
              >
                Back to Explore
              </button>
            </div>

            {searchLoading ? (
              <div className="py-16 text-center text-sm text-gray-400">
                Searching available jobs...
              </div>
            ) : searchError ? (
              <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">
                {searchError}
              </div>
            ) : paginatedResults.length === 0 ? (
              <div className="rounded-2xl border border-[#2A3142] bg-[#191D23] px-5 py-14 text-center">
                <Search className="mx-auto mb-3 text-gray-500" size={30} />

                <h3 className="font-semibold text-white">
                  No jobs found
                </h3>

                <p className="mt-2 text-sm text-gray-400">
                  Try another keyword, location, or filter.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {paginatedResults.map((job) => {
                    const key = jobKey(job);

                    return (
                      <ExploreJobCard
                        key={key}
                        job={job}
                        saved={savedJobKeys.includes(key)}
                        onToggleSave={toggleSavedJob}
                        onOpen={openJob}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() =>
                        setPage((current) => current - 1)
                      }
                      className="rounded-lg border border-[#2A3142] px-4 py-2 text-sm text-gray-300 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-400">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((current) => current + 1)
                      }
                      className="rounded-lg border border-[#2A3142] px-4 py-2 text-sm text-gray-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        ) : (
          <>
            {recommendationsLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Loading opportunities selected for you...
              </div>
            ) : recommendationsError ? (
              <div className="mb-8 rounded-xl border border-[#2A3142] bg-[#191D23] p-5 text-sm text-gray-400">
                {recommendationsError}
              </div>
            ) : (
              <>
                {renderSection(
                  "Recommended for you",
                  "Opportunities selected around your skills and experience.",
                  recommendations.recommended
                )}

                {renderSection(
                  "Jobs matching your skills",
                  "Explore opportunities related to the skills in your profile.",
                  recommendations.skillsMatch
                )}

                {renderSection(
                  "Jobs near your interests",
                  "Opportunities matching your preferred location.",
                  recommendations.nearby
                )}

                {renderSection(
                  "Recently added",
                  "Explore some of the latest available opportunities.",
                  recommendations.recentlyAdded
                )}
              </>
            )}

            <section
              id="explore-all-jobs"
              className="scroll-mt-6 border-t border-[#2A3142] pt-8"
            >
              <div className="mb-5">
                <h2 className="text-2xl font-semibold text-white">
                  Explore all jobs
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  Browse all available opportunities.
                </p>
              </div>

              {allJobsLoading ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  Loading available jobs...
                </div>
              ) : allJobs.length === 0 ? (
                <div className="rounded-2xl border border-[#2A3142] bg-[#191D23] px-5 py-10 text-center">
                  <Search className="mx-auto mb-3 text-gray-500" size={28} />

                  <p className="text-sm text-gray-400">
                    No jobs are currently available.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {paginatedAllJobs.map((job) => {
                      const key = jobKey(job);

                      return (
                        <ExploreJobCard
                          key={key}
                          job={job}
                          saved={savedJobKeys.includes(key)}
                          onToggleSave={toggleSavedJob}
                          onOpen={openJob}
                        />
                      );
                    })}
                  </div>

                  {allJobsTotalPages > 1 && (
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                      <button
                        type="button"
                        disabled={allJobsPage === 1}
                        onClick={() =>
                          setAllJobsPage((current) =>
                            Math.max(1, current - 1)
                          )
                        }
                        className="rounded-lg border border-[#2A3142] px-4 py-2 text-sm text-gray-300 transition hover:bg-[#1E232B] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>

                      <span className="text-sm text-gray-400">
                        Page {allJobsPage} of {allJobsTotalPages}
                      </span>

                      <button
                        type="button"
                        disabled={allJobsPage === allJobsTotalPages}
                        onClick={() =>
                          setAllJobsPage((current) =>
                            Math.min(
                              allJobsTotalPages,
                              current + 1
                            )
                          )
                        }
                        className="rounded-lg border border-[#2A3142] px-4 py-2 text-sm text-gray-300 transition hover:bg-[#1E232B] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}