import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

const allJobs = [
  {
    id: 1,
    company: "DaVinci Resolve",
    title: "Creative Product Designer",
    location: "Spain",
    type: "Hybrid / Remote",
    salary: "$65,000/annual",
    description:
      "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences.",
    logo: "/images/Asana.png",
    category: "Design",
    posted: "2 days ago",
  },
  {
    id: 2,
    company: "Evernote",
    title: "Frontend Engineer",
    location: "USA",
    type: "Remote",
    salary: "$90,000/annual",
    description:
      "Join our engineering team to build beautiful, performant web experiences using React and modern tooling.",
    logo: "/images/Evernote.png",
    category: "Engineering",
    posted: "1 day ago",
  },
  {
    id: 3,
    company: "3D Tool",
    title: "3D Motion Designer",
    location: "Germany",
    type: "On-site",
    salary: "$75,000/annual",
    description:
      "We need a talented 3D motion designer to help bring our product visuals and marketing materials to life.",
    logo: "/images/Linear.png",
    category: "Design",
    posted: "3 days ago",
  },
  {
    id: 4,
    company: "Figma",
    title: "Product Manager",
    location: "USA",
    type: "Hybrid / Remote",
    salary: "$120,000/annual",
    description:
      "Lead cross-functional teams to define, build, and ship world-class product experiences at scale.",
    logo: "/images/Slack.png",
    category: "Product",
    posted: "5 days ago",
  },
  {
    id: 5,
    company: "Loom",
    title: "Backend Engineer",
    location: "Canada",
    type: "Remote",
    salary: "$95,000/annual",
    description:
      "Build and scale the infrastructure that powers millions of async video communications worldwide.",
    logo: "/images/Loom.png",
    category: "Engineering",
    posted: "1 day ago",
  },
  {
    id: 6,
    company: "Monday",
    title: "UX Researcher",
    location: "Israel",
    type: "Hybrid / Remote",
    salary: "$80,000/annual",
    description:
      "Drive research initiatives that inform product decisions and improve the overall user experience.",
    logo: "/images/Monday.png",
    category: "Design",
    posted: "4 days ago",
  },
  {
    id: 7,
    company: "Asana",
    title: "Data Scientist",
    location: "USA",
    type: "Remote",
    salary: "$110,000/annual",
    description:
      "Leverage data to uncover insights that drive product growth and business decisions across teams.",
    logo: "/images/Asana.png",
    category: "Data",
    posted: "2 days ago",
  },
  {
    id: 8,
    company: "Slack",
    title: "DevOps Engineer",
    location: "UK",
    type: "Remote",
    salary: "$100,000/annual",
    description:
      "Maintain and improve CI/CD pipelines, cloud infrastructure, and developer tooling for our platform.",
    logo: "/images/Slack.png",
    category: "Engineering",
    posted: "6 days ago",
  },
  {
    id: 9,
    company: "Linear",
    title: "Marketing Manager",
    location: "USA",
    type: "Hybrid",
    salary: "$85,000/annual",
    description:
      "Own the marketing strategy and execution for our growing suite of productivity tools and features.",
    logo: "/images/Linear.png",
    category: "Marketing",
    posted: "3 days ago",
  },
  {
    id: 10,
    company: "Loom",
    title: "Content Strategist",
    location: "Remote",
    type: "Remote",
    salary: "$70,000/annual",
    description:
      "Create compelling content strategies that drive awareness and engagement across all channels.",
    logo: "/images/Loom.png",
    category: "Marketing",
    posted: "7 days ago",
  },
  {
    id: 11,
    company: "Figma",
    title: "iOS Developer",
    location: "USA",
    type: "On-site",
    salary: "$115,000/annual",
    description:
      "Build beautiful native iOS experiences that delight millions of designers and teams globally.",
    logo: "/images/Slack.png",
    category: "Engineering",
    posted: "2 days ago",
  },
  {
    id: 12,
    company: "Monday",
    title: "Brand Designer",
    location: "Remote",
    type: "Remote",
    salary: "$78,000/annual",
    description:
      "Shape the visual identity of our brand across digital and physical touchpoints worldwide.",
    logo: "/images/Monday.png",
    category: "Design",
    posted: "1 day ago",
  },
];

const ITEMS_PER_PAGE = 6;
const categories = [
  "All",
  "Design",
  "Engineering",
  "Product",
  "Data",
  "Marketing",
];
const workTypes = ["All", "Remote", "Hybrid / Remote", "On-site", "Hybrid"];

export const AllJobsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const filtered = allJobs
    .filter((job) => {
      const matchSearch =
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === "All" || job.category === selectedCategory;
      const matchType = selectedType === "All" || job.type === selectedType;
      return matchSearch && matchCategory && matchType;
    })
    .sort((a, b) => {
      if (sortBy === "salary") return parseInt(b.salary) - parseInt(a.salary);
      return b.id - a.id;
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedType("All");
    setCurrentPage(1);
    setSidebarOpen(false);
  };

  // Inline sidebar JSX to avoid remount issue
  const sidebarContent = (
    <div className="bg-[#191D23] rounded-2xl p-6 space-y-6">
      {/* Search */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
          Search
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Job title, company..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
            className="w-full bg-[#0F1419] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
          Category
        </h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleFilterChange(setSelectedCategory, cat)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat
                  ? "bg-[#3B82F6] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#0F1419]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Work Type */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
          Work Type
        </h3>
        <div className="space-y-2">
          {workTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(setSelectedType, type)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedType === type
                  ? "bg-[#3B82F6] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#0F1419]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={resetFilters}
        className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        Reset Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F17] text-white">
      {/* Hero */}
      <motion.section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-12 pb-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-4">
          <motion.p
            className="text-[#F5C518] text-sm font-medium mb-3 uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Opportunities
          </motion.p>
          <motion.h1
            className="text-4xl lg:text-6xl mb-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            Find Your Next <br /> <span className="text-[#F5C518]">Role</span>
          </motion.h1>
          <motion.p
            className="text-gray-400 text-lg max-w-xl mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Browse positions across top companies worldwide.
          </motion.p>
        </div>
      </motion.section>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16">
        {/* Mobile Filter Button */}
        <motion.div
          className="lg:hidden mb-4 flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-gray-400 text-sm">{filtered.length} jobs found</p>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 bg-[#191D23] border border-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-[#262C36] transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </motion.div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                className="fixed top-0 left-0 h-full w-80 bg-[#0F1419] z-50 lg:hidden overflow-y-auto p-4"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-white font-semibold">Filters</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {sidebarContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <motion.div
            className="hidden lg:block w-72 flex-shrink-0 sticky top-24 self-start"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            {sidebarContent}
          </motion.div>

          {/* Job Listings */}
          <div className="flex-1 min-w-0">
            {/* Controls Bar */}
            <motion.div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <p className="text-gray-400 text-sm hidden lg:block">
                <span className="text-white font-semibold">
                  {filtered.length}
                </span>{" "}
                jobs found
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-[#191D23] border border-gray-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-[#3B82F6] w-full sm:w-auto"
                >
                  <option value="newest">Newest First</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </div>
            </motion.div>

            {/* Cards */}
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="no-results"
                  className="text-center py-20"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    No Jobs Found
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Try adjusting your filters or search terms.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="bg-[#3B82F6] hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Reset Filters
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={`page-${currentPage}-${selectedCategory}-${selectedType}-${search}`}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {paginated.map((job) => (
                    <motion.div
                      key={job.id}
                      variants={fadeUp}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-[#191D23] rounded-2xl p-6 hover:bg-[#1E2430] transition-colors group"
                    >
                      {/* Top Row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#0F1419] rounded-xl flex items-center justify-center flex-shrink-0">
                            <img
                              src={job.logo}
                              alt={job.company}
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-[#3B82F6] text-xs font-medium">
                              {job.company}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {job.posted}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs bg-[#0F1419] text-gray-400 px-3 py-1 rounded-full border border-gray-700">
                          {job.type}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-white text-lg font-semibold mb-1 group-hover:text-[#3B82F6] transition-colors">
                        {job.title}
                      </h3>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-gray-400 text-xs mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.category}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-5 leading-relaxed line-clamp-2">
                        {job.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <span className="text-white font-semibold text-sm flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-[#3B82F6]" />
                          {job.salary}
                        </span>
                        <Link to={`/job/${job.id}`}>
                          <button className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            Apply Now →
                          </button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                className="flex items-center justify-center gap-2 flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border ${
                    currentPage === 1
                      ? "border-gray-700 text-gray-600 cursor-not-allowed"
                      : "border-gray-700 hover:bg-[#191D23] text-white"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg border text-sm ${
                        currentPage === page
                          ? "bg-[#3B82F6] border-[#3B82F6] text-white"
                          : "border-gray-700 hover:bg-[#191D23] text-white"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border ${
                    currentPage === totalPages
                      ? "border-gray-700 text-gray-600 cursor-not-allowed"
                      : "border-gray-700 hover:bg-[#191D23] text-white"
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
