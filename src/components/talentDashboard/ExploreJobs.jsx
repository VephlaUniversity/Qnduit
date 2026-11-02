
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, MapPin, BriefcaseBusiness, SlidersHorizontal, Heart, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

import { API_BASE_URL } from "../utils/api";
import { jobKey, talentJobPath, formatSalary, formatPosted } from "../utils/jobDisplay";
import { ExternalJobApplyAction } from "../jobs/JobApplyAction";
import JobImage from "../jobs/JobImage";

const PAGE_SIZE = 12;

const getToken = () => localStorage.getItem("token");

const getJobId = (job) => job?._id || job?.id || job?.jobId;

const getCompanyName = (job) =>
  job?.companyName ||
  job?.employer?.companyName ||
  job?.company ||
  job?.postedBy?.companyName ||
  "Company name";

const getLocation = (job) =>
  job?.location ||
  job?.jobLocation ||
  job?.address ||
  "Location not specified";

const getWorkType = (job) => {
  const value = job?.workType || job?.workMode || job?.employmentType;
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
  if (details.skills > 0 && details.location) return "Skills & location match";
  if (details.skills > 0) return "Skills match";
  if (details.location) return "Location match";
  return "Recommended";
};

function ExploreJobCard({ job, saved, onToggleSave, onOpen }) {
  const skills = getSkills(job);

  return (
    <article className="h-full rounded-2xl border border-white/10 bg-[#171E25] p-5 transition hover:border-cyan-400/40">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
          <JobImage job={job} />
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(job)}
            className="block text-left text-base font-semibold text-white hover:text-cyan-300"
          >
            {job?.title || job?.jobTitle || "Untitled position"}
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
        <div className="mt-4 inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
          {getMatchLabel(job)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} /> {getLocation(job)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BriefcaseBusiness size={14} /> {getWorkType(job)}
        </span>
      </div>

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-gray-300"
            >
              {typeof skill === "string" ? skill : skill?.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
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
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5"
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

  const [keyword, setKeyword] = useState("");
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

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [savedJobKeys, setSavedJobKeys] = useState([]);
  const [savingJobKey, setSavingJobKey] = useState(null);
  const [page, setPage] = useState(1);

  const token = getToken();

  const fetchRecommendations = useCallback(async () => {
    if (!token) {
      setRecommendationsError("Please sign in to view personalized recommendations.");
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
        recommended: Array.isArray(sections.recommended) ? sections.recommended : [],
        skillsMatch: Array.isArray(sections.skillsMatch) ? sections.skillsMatch : [],
        nearby: Array.isArray(sections.nearby) ? sections.nearby : [],
        recentlyAdded: Array.isArray(sections.recentlyAdded) ? sections.recentlyAdded : [],
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

      const data = response.data?.savedJobs ||
        response.data?.jobs ||
        response.data?.data ||
        [];

      setSavedJobKeys(
        Array.isArray(data)
          ? data.map((item) => {
              const job = item.job || item;
              return jobKey({
                ...job,
                source: item.source || job.source,
              });
            })
          : []
      );
    } catch (error) {
      console.error("Saved jobs error:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchRecommendations();
    fetchSavedJobs();
  }, [fetchRecommendations, fetchSavedJobs]);

  const runSearch = async (event) => {
    event?.preventDefault();

    const trimmedKeyword = keyword.trim();
    const trimmedLocation = location.trim();

    if (!trimmedKeyword && !trimmedLocation && !workType) {
      toast.error("Enter a keyword or select a search filter.");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError("");
      setHasSearched(true);
      setPage(1);

      const response = await axios.get(`${API_BASE_URL}/api/jobs/search`, {
        params: {
          q: trimmedKeyword || undefined,
          jobTitle: trimmedKeyword || undefined,
          location: trimmedLocation || undefined,
          workType: workType || undefined,
        },
      });

      const jobs = response.data?.jobs ||
        response.data?.results ||
        response.data?.data ||
        [];

      setSearchResults(Array.isArray(jobs) ? jobs : []);
    } catch (error) {
      console.error("Explore job search error:", error);
      setSearchResults([]);
      setSearchError(
        error.response?.data?.message ||
        "We couldn't complete your search. Please try again."
      );
    } finally {
      setSearchLoading(false);
    }
  };

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
        setSavedJobKeys((current) => current.filter((item) => item !== key));
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
    setSearchResults([]);
    setSearchError("");
    setHasSearched(false);
    setPage(1);
  };

  const filteredSearchResults = useMemo(() => {
    if (!jobType) return searchResults;

    return searchResults.filter((job) => {
      const value = String(
        job.jobType || job.employmentType || job.type || ""
      ).toLowerCase();

      return value.includes(jobType.toLowerCase());
    });
  }, [searchResults, jobType]);

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
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setLocation("");
              setWorkType("");
              setJobType("");
              setHasSearched(false);
              document.getElementById("explore-all-jobs")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className="shrink-0 text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            View all <ChevronRight className="ml-1 inline" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {jobs.slice(0, 4).map((job) => {
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
            Discover opportunities selected around your skills, experience and preferred location.
          </p>
        </header>

        <form
          onSubmit={runSearch}
          className="mb-5 rounded-2xl border border-white/10 bg-[#171E25] p-3 md:p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#0F1419] px-4">
              <Search className="shrink-0 text-gray-400" size={20} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Job title, skill, company or keyword"
                className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#0F1419] px-4">
              <MapPin className="shrink-0 text-gray-400" size={19} />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location"
                className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
            </div>

            <select
              value={workType}
              onChange={(event) => setWorkType(event.target.value)}
              className="h-12 rounded-xl bg-[#0F1419] px-4 text-sm text-gray-300 outline-none lg:w-44"
            >
              <option value="">Work type</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>

            <button
              type="submit"
              disabled={searchLoading}
              className="h-12 rounded-xl bg-cyan-500 px-7 text-sm font-semibold text-[#071116] transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {searchLoading ? "Searching..." : "Search jobs"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Quick filters:</span>
              <select
                value={jobType}
                onChange={(event) => setJobType(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#0F1419] px-3 py-2 text-xs text-gray-300 outline-none"
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
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
              >
                <SlidersHorizontal size={14} />
                Filters
              </button>
            </div>

            {(keyword || location || workType || jobType) && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
              >
                <X size={14} /> Clear filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <label className="text-xs text-gray-400">
                Work arrangement
                <select
                  value={workType}
                  onChange={(event) => setWorkType(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0F1419] px-3 text-sm text-white outline-none"
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
                  className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0F1419] px-3 text-sm text-white outline-none"
                >
                  <option value="">Any job type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </label>
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
                    : `${filteredSearchResults.length} job${filteredSearchResults.length === 1 ? "" : "s"} found`}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSearch}
                className="text-sm text-cyan-300 hover:text-cyan-200"
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
              <div className="rounded-2xl border border-white/10 bg-[#171E25] px-5 py-14 text-center">
                <Search className="mx-auto mb-3 text-gray-500" size={30} />
                <h3 className="font-semibold text-white">No jobs found</h3>
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
                      onClick={() => setPage((current) => current - 1)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((current) => current + 1)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 disabled:opacity-40"
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
              <div className="mb-8 rounded-xl border border-white/10 bg-[#171E25] p-5 text-sm text-gray-400">
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

            <section id="explore-all-jobs" className="scroll-mt-6 border-t border-white/10 pt-8">
              <div className="mb-5">
                <h2 className="text-2xl font-semibold text-white">
                  Explore all jobs
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Search for opportunities using the search bar above.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#171E25] px-5 py-10 text-center">
                <Search className="mx-auto mb-3 text-gray-500" size={28} />
                <p className="text-sm text-gray-400">
                  Enter a keyword or select a filter to browse matching jobs.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
