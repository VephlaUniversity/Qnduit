import { apiFetch } from "../utils/apiFetch";
import { useState, useEffect, useRef } from "react";

import * as Slider from "@radix-ui/react-slider";
import {
  Search,
  Grid,
  List,
  Heart,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { profileImageUrl } from "../profiles/profileApi";
import { API_BASE_URL } from "../utils/api";
import { Link, useSearchParams } from "react-router-dom";

function CandidateAvatar({ url, name }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-16 h-16 bg-gray-600 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
      {url && !failed ? (
        <img
          src={url}
          alt={`${name} profile`}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        (name || "T").charAt(0).toUpperCase()
      )}
    </div>
  );
}

const useCandidates = (
  keyword,
  page,
  limit,
  location,
  minAge,
  maxAge,
  sort,
  experience,
  qualification,
) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const query = new URLSearchParams({
          query: keyword.trim(),
          userType: "talent",
          page: String(page),
          limit: String(limit),
          location: location === "all" ? "" : location,
          minAge: String(minAge),
          maxAge: String(maxAge),
          sort,
          experience,
          qualification,
        });

        const response = await apiFetch(
          `${API_BASE_URL}/api/gen/search?${query.toString()}`,
          {
            method: "GET",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load talents (${response.status})`);
        }

        const result = await response.json();

        const talents = Array.isArray(result.results)
          ? result.results.filter((item) => item.userType === "talent")
          : [];

        const formattedTalents = talents.map((talent) => ({
          ...talent,
          id: String(talent._id || talent.id),
          name:
            talent.fullName ||
            talent.name ||
            [talent.firstName, talent.lastName].filter(Boolean).join(" ") ||
            talent.email ||
            "Talent",
          title: talent.jobTitle || talent.title || "Talent",
          location: talent.location || "Location not specified",
          skills: Array.isArray(talent.skills)
            ? talent.skills
                .map((skill) =>
                  typeof skill === "string"
                    ? skill
                    : skill.name || skill.title || "",
                )
                .filter(Boolean)
            : Array.isArray(talent.categories)
              ? talent.categories
              : [],
          avatarUrl: profileImageUrl(
            typeof talent.avatar === "string"
              ? talent.avatar
              : talent.avatar?.url,
          ),
          salary:
            talent.offeredSalary != null &&
            String(talent.offeredSalary).trim() !== ""
              ? `$${String(talent.offeredSalary).trim()}${typeof talent.salaryType === "string" && talent.salaryType.trim() ? `/${talent.salaryType.trim()}` : ""}`
              : "Not specified",
          age: talent.age ?? "",
          availability: talent.availability || "Availability not specified",
          hasVerificationBadge: talent.hasVerificationBadge === true,
        }));

        if (controller.signal.aborted) return;
        setLocations(Array.isArray(result.locations) ? result.locations : []);
        setTotal(result.total || 0);
        setData(formattedTalents);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch talents:", err);
          setError(err.message || "Unable to load talent profiles.");
          setData([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    keyword,
    page,
    limit,
    location,
    minAge,
    maxAge,
    sort,
    experience,
    qualification,
  ]);

  return { data, loading, error, total, locations };
};

const searchDefaults = {
  jobTitle: "",
  location: "all",
  minAge: 18,
  maxAge: 65,
  experience: "Any experience",
  qualification: "Any qualification",
  workType: "all",
  sort: "default",
  limit: 6,
  page: 1,
};
const searchChoices = {
  experience: [
    "Any experience",
    "< 1 year",
    "1–3 years",
    "3–5 years",
    "5+ years",
  ],
  qualification: [
    "Any qualification",
    "Certificate",
    "Bachelor Degree",
    "Master Degree",
    "PhD",
  ],
  workType: ["all", "full-time", "part-time", "contract"],
  sort: ["default", "newest", "salary"],
};
function readSearch(params) {
  const state = { ...searchDefaults };
  for (const key of ["jobTitle", "location"]) {
    if (params.has(key)) state[key] = params.get(key) || searchDefaults[key];
  }
  state.location = state.location.trim().toLowerCase() || "all";
  for (const [key, choices] of Object.entries(searchChoices)) {
    if (choices.includes(params.get(key))) state[key] = params.get(key);
  }
  for (const key of ["minAge", "maxAge", "limit", "page"]) {
    const raw = params.get(key);
    const value = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (
      Number.isSafeInteger(value) &&
      (key === "limit"
        ? [6, 12, 24].includes(value)
        : key === "page"
          ? value >= 1
          : value >= 18 && value <= 65)
    )
      state[key] = value;
  }
  if (state.minAge >= state.maxAge) {
    state.minAge = 18;
    state.maxAge = 65;
  }
  return state;
}
function writeSearch(params, state) {
  const next = new URLSearchParams(params);
  for (const key of Object.keys(searchDefaults)) {
    next.delete(key);
    if (state[key] !== searchDefaults[key]) next.set(key, String(state[key]));
  }
  return next;
}

const TalentsResultsPage = () => {
  const [params, setParams] = useSearchParams();
  const search = readSearch(params);
  const canonical = writeSearch(params, search).toString();
  const queryString = params.toString();
  // Canonicalize invalid/default URL values without a second state synchronization effect.
  useEffect(() => {
    if (canonical !== queryString) setParams(canonical, { replace: true });
  }, [canonical, queryString, setParams]);
  const updateSearch = (
    changes,
    { pagination = false, replace = false } = {},
  ) => {
    setParams(
      writeSearch(params, {
        ...search,
        ...changes,
        ...(!pagination ? { page: 1 } : {}),
      }),
      { replace },
    );
  };
  const keywordSearch = search.jobTitle;
  const locationFilter = search.location;
  const workTypeFilter = search.workType;
  const ageRange = [search.minAge, search.maxAge];
  const currentPage = search.page;
  const itemsPerPage = search.limit;
  const sortBy = search.sort;
  const [viewMode, setViewMode] = useState("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toast } = useToast();
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedReady, setSavedReady] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const pendingSaves = useRef(new Set());
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await apiFetch(
          `${API_BASE_URL}/api/employers/saved-candidates`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        setSavedIds(
          new Set(
            data.savedCandidates.map((candidate) => String(candidate._id)),
          ),
        );
        setSavedReady(true);
      } catch {
        if (!controller.signal.aborted)
          toast({
            title: "Unable to load saved candidates",
            description: "Refresh to try again.",
            variant: "destructive",
          });
      }
    };
    load();
    return () => controller.abort();
  }, [toast]);
  const toggleSaved = async (candidate) => {
    if (!savedReady || pendingSaves.current.has(candidate.id)) return;
    pendingSaves.current.add(candidate.id);
    setSavingIds(new Set(pendingSaves.current));
    const unsave = savedIds.has(candidate.id);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/api/employers/saved-candidates/${encodeURIComponent(candidate.id)}`,
        {
          method: unsave ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!response.ok) throw new Error();
      setSavedIds((previous) => {
        const next = new Set(previous);
        if (unsave) next.delete(candidate.id);
        else next.add(candidate.id);
        return next;
      });
      toast({
        title: "Success",
        description: unsave
          ? "Candidate removed from saved candidates."
          : "Candidate saved.",
      });
    } catch {
      toast({
        title: "Unable to update saved candidates",
        description: "Please try again. Your selection has not changed.",
        variant: "destructive",
      });
    } finally {
      pendingSaves.current.delete(candidate.id);
      setSavingIds(new Set(pendingSaves.current));
    }
  };

  const {
    data: allCandidates,
    loading,
    error,
    total,
    locations,
  } = useCandidates(
    keywordSearch,
    currentPage,
    itemsPerPage,
    locationFilter,
    ageRange[0],
    ageRange[1],
    sortBy,
    search.experience,
    search.qualification,
  );

  // Matching and pagination belong to the server; do not filter away API matches.
  const filteredCandidates = allCandidates;
  const paginatedCandidates = allCandidates;
  const totalPages = Math.ceil(total / itemsPerPage);

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
    updateSearch({ page }, { pagination: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFilters = () => {
    setParams(writeSearch(params, searchDefaults));
    setSidebarOpen(false);
  };

  const CandidateCard = ({ candidate }) => (
    <div className="bg-[#191D23] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4">
          <CandidateAvatar
            key={`${candidate.id}:${candidate.avatarUrl}`}
            url={candidate.avatarUrl}
            name={candidate.name}
          />
          <div>
            <h3 className="text-blue-400 text-sm">{candidate.title}</h3>
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              {candidate.name}
              {candidate.hasVerificationBadge === true && (
                <span
                  className="text-blue-400 text-xs"
                  role="img"
                  aria-label="Admin verification badge"
                >
                  ⚡
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  candidate.availability === "Available now"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {candidate.availability}
              </span>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {candidate.location}
              </span>
            </div>
          </div>
        </div>
        <button
          className="p-2 hover:bg-gray-700 rounded-full"
          aria-label={`${savedIds.has(candidate.id) ? "Unsave" : "Save"} ${candidate.name}`}
          aria-pressed={savedIds.has(candidate.id)}
          disabled={!savedReady || savingIds.has(candidate.id)}
          onClick={() => toggleSaved(candidate)}
        >
          <Heart
            className={`w-5 h-5 ${savedIds.has(candidate.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`}
          />
        </button>
      </div>

      <div className="flex gap-2 mb-1 justify-between">
        <div className="flex flex-wrap gap-2 mb-4">
          {candidate.skills.map((skill, i) => (
            <span
              key={i}
              className="bg-[#F1F1F1] text-black px-3 py-2 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
        <span className="text-gray-400 flex items-center gap-1 whitespace-nowrap text-sm">
          {candidate.salary}
        </span>
      </div>
      <hr className="border-gray-700 mb-3" />
      <Link
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-blue-500 px-6 text-blue-400 focus-visible:outline focus-visible:outline-2"
        to={`/dashboard/users/talent/${encodeURIComponent(candidate.id)}?${params.toString()}`}
      >
        View Profile
      </Link>
    </div>
  );

  return (
    <>
      <div className="min-h-screen text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile filter button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Mobile overlay */}
            <AnimatePresence>
              {sidebarOpen && (
                <Motion.div
                  className="lg:hidden fixed inset-0 bg-black/50 z-30"
                  onClick={() => setSidebarOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>

            {/* Filter Sidebar */}
            <Motion.div
              className={`${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } lg:translate-x-0 fixed lg:sticky lg:top-6 top-0 left-0 h-full lg:h-auto w-80 flex-shrink-0 bg-[#0F1419] lg:bg-transparent z-40 transition-transform duration-300 overflow-y-auto`}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-[#191D23] rounded-2xl p-6 space-y-6 lg:sticky lg:top-6">
                {/* Keyword */}
                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Search By Keywords
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Keyword"
                      value={keywordSearch}
                      onChange={(e) => {
                        updateSearch(
                          { jobTitle: e.target.value },
                          { replace: true },
                        );
                      }}
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Location</h3>
                  <div className="relative">
                    <select
                      value={locationFilter}
                      onChange={(e) => {
                        updateSearch({ location: e.target.value });
                        setSidebarOpen(false);
                      }}
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-600"
                    >
                      <option value="all">All Locations</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc.toLowerCase()}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Work Type */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Work Type</h3>
                  <div className="relative">
                    <select
                      value={workTypeFilter}
                      onChange={(e) => {
                        updateSearch({ workType: e.target.value });
                      }}
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-600"
                    >
                      <option value="all">All Types</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Age Range */}
                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Age: {ageRange[0]} – {ageRange[1]} Years
                  </h3>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={ageRange}
                    onValueChange={(v) => {
                      updateSearch({ minAge: v[0], maxAge: v[1] });
                    }}
                    max={65}
                    min={18}
                    step={1}
                    minStepsBetweenThumbs={1}
                  >
                    <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-blue-600 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-lg focus:outline-none"
                      aria-label="Min age"
                    />
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-lg focus:outline-none"
                      aria-label="Max age"
                    />
                  </Slider.Root>
                </div>

                {/* Experience */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Experience</h3>
                  <div className="relative">
                    <select
                      value={search.experience}
                      onChange={(e) =>
                        updateSearch({ experience: e.target.value })
                      }
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-600"
                    >
                      <option>Any experience</option>
                      <option>&lt; 1 year</option>
                      <option>1–3 years</option>
                      <option>3–5 years</option>
                      <option>5+ years</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Qualification */}
                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Qualification
                  </h3>
                  <div className="relative">
                    <select
                      value={search.qualification}
                      onChange={(e) =>
                        updateSearch({ qualification: e.target.value })
                      }
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-600"
                    >
                      <option>Any qualification</option>
                      <option>Certificate</option>
                      <option>Bachelor Degree</option>
                      <option>Master Degree</option>
                      <option>PhD</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </Motion.div>

            {/* Main Content */}
            <Motion.div
              className="flex-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded ${viewMode === "list" ? "bg-blue-600" : "bg-[#1A1F2E]"}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded ${viewMode === "grid" ? "bg-blue-600" : "bg-[#1A1F2E]"}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <span className="text-gray-400 text-sm">
                    {total} candidate
                    {total !== 1 ? "s" : ""} found
                  </span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      updateSearch({ limit: Number(e.target.value) });
                    }}
                    className="bg-[#f1f1f1] border border-gray-700 rounded-sm px-4 py-2 text-sm text-black"
                  >
                    <option value="6">6 Per Page</option>
                    <option value="12">12 Per Page</option>
                    <option value="24">24 Per Page</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      updateSearch({ sort: e.target.value });
                    }}
                    className="bg-[#f1f1f1] border border-gray-700 rounded-sm px-4 py-2 text-sm text-black"
                  >
                    <option value="default">Sort (Default)</option>
                    <option value="newest">Newest First</option>
                    <option value="salary">Highest Salary</option>
                  </select>
                </div>
              </div>

              {/* No Results */}
              {loading ? (
                <div className="min-h-screen flex items-center justify-center text-white">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">
                      Loading candidates...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="min-h-screen flex items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-red-400 mb-4">
                      Failed to load candidates: {error}
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <Motion.div
                  className="p-12 text-center"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    No Results Found
                  </h2>
                  <p className="text-gray-400 mb-6">
                    No candidates match{" "}
                    {keywordSearch ? (
                      <span className="text-white font-medium">
                        "{keywordSearch}"
                      </span>
                    ) : (
                      "your current filters"
                    )}
                    . Try adjusting your search.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                </Motion.div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <Motion.div
                      key={`${viewMode}-${currentPage}`}
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"
                          : "space-y-4 mb-6"
                      }
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                    >
                      {paginatedCandidates.map((candidate, index) => (
                        <Motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.06 }}
                        >
                          <CandidateCard candidate={candidate} />
                        </Motion.div>
                      ))}
                    </Motion.div>
                  </AnimatePresence>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className={`w-10 h-10 flex items-center justify-center rounded border ${
                          currentPage === 1
                            ? "bg-[#1A1F2E] border-gray-700 text-gray-600 cursor-not-allowed"
                            : "bg-[#1A1F2E] border-gray-700 hover:bg-gray-700 text-white"
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
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-[#1A1F2E] border-gray-700 hover:bg-gray-700 text-white"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className={`w-10 h-10 flex items-center justify-center rounded border ${
                          currentPage === totalPages
                            ? "bg-[#1A1F2E] border-gray-700 text-gray-600 cursor-not-allowed"
                            : "bg-[#1A1F2E] border-gray-700 hover:bg-gray-700 text-white"
                        }`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </Motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TalentsResultsPage;
