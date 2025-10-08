import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FilterDropdown } from "./JobFilterDropdown";

// Mock job data
const jobsData = [
  {
    id: 1,
    company: "Google",
    title: "Software Developer",
    location: "USA",
    salary: "$0 - $240,000",
    salaryPeriod: "year",
    type: ["On-site"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
    description: "Full job description goes here...",
  },
  {
    id: 2,
    company: "Rockstar Games New York",
    title: "Senior DevOps Engineer",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    salaryPeriod: "year",
    type: ["Contract", "On-site"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
  {
    id: 3,
    company: "Rockstar Games New York",
    title: "Senior UI/UX Designer",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    salaryPeriod: "year",
    type: ["Full-time", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
  {
    id: 4,
    company: "Rockstar Games New York",
    title: "Social Media Marketing",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    salaryPeriod: "year",
    type: ["Freelancer", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
  {
    id: 5,
    company: "Rockstar Games New York",
    title: "Full Stack Development",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    salaryPeriod: "year",
    type: ["Part-time", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
  {
    id: 6,
    company: "Rockstar Games New York",
    title: "Project Manager",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    salaryPeriod: "year",
    type: ["Full-time", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
];

export const JobOpportunities = ({ onViewJob }) => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState("grid");
  const [favorites, setFavorites] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [salaryRange, setSalaryRange] = useState([0, 240000]);
  const [radius, setRadius] = useState(25);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [sortBy, setSortBy] = useState("default");
  const [postedAnytime, setPostedAnytime] = useState("anytime");
  const [seniorityLevel, setSeniorityLevel] = useState("all");
  const [company, setCompany] = useState("");

  // Filter states
  const [searchKeyword, setSearchKeyword] = useState(
    searchParams.get("jobTitle") || ""
  );
  const [locationFilter, setLocationFilter] = useState(
    searchParams.get("location") || ""
  );
  const [workTypeFilter, setWorkTypeFilter] = useState(
    searchParams.get("workType") || ""
  );
  const [jobTypeFilter, setJobTypeFilter] = useState("");

  const jobTitle = searchParams.get("jobTitle") || "";
  const location = searchParams.get("location") || "";
  const workType = searchParams.get("workType") || "";

  const toggleFavorite = (jobId) => {
    setFavorites((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    );
  };

  // Filter jobs based on search criteria
  const filteredJobs = jobsData.filter((job) => {
    // Keyword search
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchesKeyword =
        job.company.toLowerCase().includes(keyword) ||
        job.title.toLowerCase().includes(keyword);
      if (!matchesKeyword) return false;
    }

    // Location filter
    if (locationFilter) {
      if (!job.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
    }

    // Work type filter
    if (workTypeFilter) {
      const matchesWorkType = job.type.some((type) =>
        type.toLowerCase().includes(workTypeFilter.toLowerCase())
      );
      if (!matchesWorkType) return false;
    }

    // Job type filter
    if (jobTypeFilter) {
      const matchesJobType = job.type.some((type) =>
        type.toLowerCase().includes(jobTypeFilter.toLowerCase())
      );
      if (!matchesJobType) return false;
    }

    // Salary range filter
    const salary = parseInt(job.salary.replace(/[^0-9]/g, ""));
    if (salary < salaryRange[0] || salary > salaryRange[1]) {
      return false;
    }

    return true;
  });

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "newest") {
      return b.id - a.id;
    } else if (sortBy === "salary") {
      const salaryA = parseInt(a.salary.replace(/[^0-9]/g, ""));
      const salaryB = parseInt(b.salary.replace(/[^0-9]/g, ""));
      return salaryB - salaryA;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleFindJobs = () => {
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  const JobCard = ({ job }) => (
    <div className="bg-[#1A1F2E] rounded-xl p-6 hover:bg-[#1F2637] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[#3B82F6] text-sm mb-1">{job.company}</div>
            <button onClick={() => onViewJob(job.id)}>
              <h3 className="text-white text-lg font-semibold mb-2 hover:text-[#3B82F6] transition-colors text-left">
                {job.title}{" "}
                {job.verified && <span className="text-[#3B82F6]">✓</span>}
              </h3>
            </button>
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                ⏰ {job.postedDate}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => toggleFavorite(job.id)}
          className="p-2 rounded-lg hover:bg-[#2A3142] transition-colors"
        >
          <Heart
            className={`w-5 h-5 ${
              favorites.includes(job.id)
                ? "fill-red-500 text-red-500"
                : "text-gray-400"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {job.type.map((type, idx) => (
          <span
            key={idx}
            className="px-3 py-1 bg-[#2A3142] text-white rounded-md text-sm"
          >
            {type}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
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
        <span className="text-gray-400 text-sm">
          {job.daysLeft} days left to apply
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-[#2A3142] flex items-center justify-between">
        <span className="text-[#3B82F6] font-semibold flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          {job.salary}/{job.salaryPeriod}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      {/* Header */}
      <div className="border-b border-[#1A1F2E] bg-[#141921] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <Link to="/" className="text-gray-400 hover:text-blue-600">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[#3B82F6]">Find Jobs</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <div className="bg-white rounded-lg p-2 flex items-center gap-4">
              <div className="flex-1 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Job title, key words or company"
                  className="flex-1 outline-none text-gray-900"
                  defaultValue={jobTitle}
                />
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <div className="flex-1 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <select className="flex-1 outline-none text-gray-900 bg-transparent">
                  <option>{location || "All Location"}</option>
                </select>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filter More
                <ChevronDown className="w-4 h-4" />
              </button>
              <button className="px-8 py-2 bg-[#3B82F6] hover:bg-[#3077e8] text-white font-medium rounded-md transition-colors">
                Find Jobs
              </button>
            </div>
            <FilterDropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Mobile Menu Button */}
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

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setSidebarOpen(false)}
            ></div>
          )}

          {/* Sidebar */}
          <div
            className={`${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0 lg:block fixed lg:sticky lg:top-6 top-0 left-0 h-full lg:h-auto w-80 flex-shrink-0 bg-[#0F1419] lg:bg-transparent z-40 transition-transform duration-300 overflow-y-auto`}
          >
            <div className="bg-[#1A1F2E] rounded-xl p-6 space-y-6 lg:sticky lg:top-6">
              <div>
                <h3 className="text-white font-semibold mb-3">
                  Search Company
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Job title, key words or company"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Location</h3>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Job Title</h3>
                <select className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6] appearance-none">
                  <option>Design & Creative</option>
                </select>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">
                  On-Site/Remote
                </h3>
                <select
                  value={workTypeFilter}
                  onChange={(e) => setWorkTypeFilter(e.target.value)}
                  className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                >
                  <option value="">All Work Types</option>
                  <option value="on-site">On-site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Job Types</h3>
                <select
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                  className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-[#3B82F6]"
                >
                  <option value="">All Job Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>

              <div>
                <h3 className="text-gray-400 text-sm font-normal mb-3">
                  Salaries:{" "}
                  <span className="text-[#3B82F6] font-semibold">
                    ${salaryRange[0].toLocaleString()} - $
                    {salaryRange[1].toLocaleString()}
                  </span>
                </h3>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5"
                  value={salaryRange}
                  onValueChange={setSalaryRange}
                  max={240000}
                  min={0}
                  step={1000}
                  minStepsBetweenThumbs={1}
                >
                  <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                    <Slider.Range className="absolute bg-[#3B82F6] rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#1A1F2E]"
                    aria-label="Minimum salary"
                  />
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#1A1F2E]"
                    aria-label="Maximum salary"
                  />
                </Slider.Root>
              </div>

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
                  onValueChange={(value) => setRadius(value[0])}
                  max={100}
                  min={0}
                  step={1}
                >
                  <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                    <Slider.Range className="absolute bg-[#3B82F6] rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-[#3B82F6] rounded-full shadow-lg hover:bg-[#3077e8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#1A1F2E]"
                    aria-label="Radius"
                  />
                </Slider.Root>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">
                  Posted Anytime
                </h3>
                <div className="relative">
                  <select
                    value={postedAnytime}
                    onChange={(e) => setPostedAnytime(e.target.value)}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-gray-400 text-sm outline-none focus:border-[#3B82F6] appearance-none cursor-pointer"
                  >
                    <option value="anytime">Posted Anytime</option>
                    <option value="today">Today</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">
                  All Seniority Levels
                </h3>
                <div className="relative">
                  <select
                    value={seniorityLevel}
                    onChange={(e) => setSeniorityLevel(e.target.value)}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-gray-400 text-sm outline-none focus:border-[#3B82F6] appearance-none cursor-pointer"
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

              <div>
                <h3 className="text-white font-semibold mb-3">Company</h3>
                <div className="relative">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-[#0F1419] border border-[#2A3142] rounded-lg px-4 py-2 text-gray-400 text-sm outline-none focus:border-[#3B82F6] appearance-none cursor-pointer"
                  >
                    <option value="">Company</option>
                    <option value="rockstar">Rockstar Games New York</option>
                    <option value="google">Google</option>
                    <option value="microsoft">Microsoft</option>
                    <option value="amazon">Amazon</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleFindJobs}
                className="w-full bg-[#3B82F6] hover:bg-[#3077e8] text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Find Jobs
              </button>
            </div>
          </div>

          {/* Job Listings */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${
                    viewMode === "list" ? "bg-[#3B82F6]" : "bg-[#1A1F2E]"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${
                    viewMode === "grid" ? "bg-[#3B82F6]" : "bg-[#1A1F2E]"
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <span className="text-gray-400 text-sm">
                  {filteredJobs.length} job
                  {filteredJobs.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  className="w-full sm:w-auto bg-[#f1f1f1] border border-[#2A3142] rounded-sm px-4 py-2 text-black text-sm"
                >
                  <option value="6">6 Per Page</option>
                  <option value="12">12 Per Page</option>
                  <option value="24">24 Per Page</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full sm:w-auto bg-[#f1f1f1] border border-[#2A3142] rounded-sm px-4 py-2 text-black text-sm"
                >
                  <option value="default">Sort by (Default)</option>
                  <option value="newest">Newest First</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </div>
            </div>

            {paginatedJobs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    No Results Found
                  </h2>
                  <p className="text-gray-400 mb-6">
                    We couldn't find any jobs matching your search criteria. Try
                    adjusting your filters.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
                    : "space-y-4"
                }
              >
                {paginatedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap mt-8">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`w-10 h-10 flex items-center justify-center rounded border ${
                    currentPage === 1
                      ? "bg-[#1A1F2E] border-[#2A3142] text-gray-600 cursor-not-allowed"
                      : "bg-[#1A1F2E] border-[#2A3142] hover:bg-[#2A3142] text-white"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded border ${
                        currentPage === pageNum
                          ? "bg-[#3B82F6] border-[#3077e8] text-white"
                          : "bg-[#1A1F2E] border-[#2A3142] hover:bg-[#2A3142] text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

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
  );
};
