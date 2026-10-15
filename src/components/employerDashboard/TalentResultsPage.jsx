import { useState, useEffect } from "react";

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
import { API_BASE_URL } from "../utils/api";
import { Link, useLocation } from "react-router-dom";


const useCandidates = (keyword = "") => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const query = new URLSearchParams({
          query: keyword.trim(),
        });

        const response = await fetch(
          `${API_BASE_URL}/api/gen/search?${query.toString()}`,
          {
            method: "GET",
            headers: {
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load talents (${response.status})`);
        }

        const result = await response.json();

        const talents = Array.isArray(result.results)
          ? result.results.filter(
              (item) => item.userType === "talent",
            )
          : [];

        const formattedTalents = talents.map((talent) => ({
          ...talent,
          id: String(talent._id || talent.id),
          name:
            talent.fullName ||
            talent.name ||
            [talent.firstName, talent.lastName]
              .filter(Boolean)
              .join(" ") ||
            talent.email ||
            "Talent",
          title: talent.jobTitle || talent.title || "Talent",
          location: talent.location || "Location not specified",
          skills: Array.isArray(talent.skills)
            ? talent.skills.map((skill) =>
                typeof skill === "string"
                  ? skill
                  : skill.name || skill.title || "",
              ).filter(Boolean)
            : Array.isArray(talent.categories)
              ? talent.categories
              : [],
          salary:
            talent.expectedSalary != null
              ? String(talent.expectedSalary)
              : "Not specified",
          age: talent.age ?? "",
          availability:
            talent.availability || "Availability not specified",
          verified: Boolean(talent.isVerified),
        }));

        setData(formattedTalents);
      } catch (err) {
        if (err.name !== "AbortError") {
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
  }, [keyword]);

  return { data, loading, error };
};


const TalentsResultsPage = ({ searchParams }) => {
  const location = useLocation();

  const urlKeyword =
    searchParams?.jobTitle ??
    new URLSearchParams(location.search).get("jobTitle") ??
    "";

  const [viewMode, setViewMode] = useState("grid");
  const [ageRange, setAgeRange] = useState([18, 65]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("default");
  const [keywordSearch, setKeywordSearch] = useState(urlKeyword);
  const [locationFilter, setLocationFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setKeywordSearch(urlKeyword);
    setCurrentPage(1);
  }, [urlKeyword]);

  const {
    data: allCandidates,
    loading,
    error,
  } = useCandidates(keywordSearch);

  // Unique locations derived from data
  const locations = [...new Set(allCandidates.map((c) => c.location))].sort();

  // Filter
  const filteredCandidates = allCandidates.filter((candidate) => {
    if (keywordSearch.trim()) {
      const q = keywordSearch.toLowerCase();

      const match =
        (candidate.name || "").toLowerCase().includes(q) ||
        (candidate.title || "").toLowerCase().includes(q) ||
        (candidate.location || "").toLowerCase().includes(q) ||
        (candidate.skills || []).some((skill) =>
          skill.toLowerCase().includes(q),
        );

      if (!match) return false;
    }

    if (locationFilter !== "all") {
      if (
        !(candidate.location || "")
          .toLowerCase()
          .includes(locationFilter.toLowerCase())
      ) {
        return false;
      }
    }

    const ageNum = parseInt(candidate.age, 10);

    if (
      !Number.isNaN(ageNum) &&
      (ageNum < ageRange[0] || ageNum > ageRange[1])
    ) {
      return false;
    }

    return true;
  });

  // Sort
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (sortBy === "newest") return b.id - a.id;
    if (sortBy === "salary") {
      return (
        parseInt(b.salary.replace(/[^0-9]/g, "")) -
        parseInt(a.salary.replace(/[^0-9]/g, ""))
      );
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedCandidates.length / itemsPerPage);
  const paginatedCandidates = sortedCandidates.slice(
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

  const resetFilters = () => {
    setKeywordSearch(searchParams?.jobTitle || "");
    setLocationFilter("all");
    setWorkTypeFilter("all");
    setAgeRange([18, 65]);
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  const CandidateCard = ({ candidate }) => (
    <div className="bg-[#191D23] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
            {(candidate.name || "T").charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-blue-400 text-sm">{candidate.title}</h3>
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              {candidate.name}
              {candidate.verified && (
                <span className="text-blue-400 text-xs">⚡</span>
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
        <button className="p-2 hover:bg-gray-700 rounded-full">
          <Heart className="w-5 h-5 text-gray-400" />
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
      <Link className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-blue-500 px-6 text-blue-400 focus-visible:outline focus-visible:outline-2" to={`/dashboard/users/talent/${encodeURIComponent(candidate.id)}?jobTitle=${encodeURIComponent(keywordSearch)}`}>View Profile</Link>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading candidates...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">
            Failed to load candidates: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile filter button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#3B82F6] hover:bg-blue-600 text-white p-4 rounded-full shadow-lg"
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
                        setKeywordSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
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
                        setLocationFilter(e.target.value);
                        setCurrentPage(1);
                        setSidebarOpen(false);
                      }}
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]"
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
                        setWorkTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]"
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
                      setAgeRange(v);
                      setCurrentPage(1);
                    }}
                    max={65}
                    min={18}
                    step={1}
                    minStepsBetweenThumbs={1}
                  >
                    <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-[#3B82F6] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg focus:outline-none"
                      aria-label="Min age"
                    />
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg focus:outline-none"
                      aria-label="Max age"
                    />
                  </Slider.Root>
                </div>

                {/* Experience */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Experience</h3>
                  <div className="relative">
                    <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
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
                    <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
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
                  className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
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
                    {filteredCandidates.length} candidate
                    {filteredCandidates.length !== 1 ? "s" : ""} found
                  </span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
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
                      setSortBy(e.target.value);
                      setCurrentPage(1);
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
              {filteredCandidates.length === 0 ? (
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
                    className="bg-[#3B82F6] hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
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
                              ? "bg-[#3B82F6] border-[#3B82F6] text-white"
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
