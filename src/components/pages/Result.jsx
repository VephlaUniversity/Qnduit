import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Slider from "@radix-ui/react-slider";
import {
  Search,
  Grid,
  List,
  Heart,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { CTA } from "../home/CTA";
import { AnimatedPage } from "../AnimatedPage";

const candidatesData = [
  {
    id: 1,
    name: "Cody Fisher",
    title: "Cloud Security Officer",
    location: "Tokyo, Japan",
    skills: ["Blender", "Sketch", "Adobe XD", "Figma"],
    availability: "Available now",
    salary: "$300/day",
    avatar: null,
    verified: false,
    about: "",
    education: [
      {
        school: "FPT University",
        year: "2019 - 2021",
        degree: "Graphic Design",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.",
      },
    ],
    experience: [
      {
        company: "FPT University",
        year: "2019 - 2021",
        position: "Graphic Design",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet odio mattis.",
      },
    ],
    phone: "123 456 7890",
    email: "cody.fisher@gmail.com",
    offeredSalary: "$2500/Month",
    experienceTime: "5 Years",
    language: "English, Japanese",
    age: "26 Years Old",
    qualification: "Master Degree",
  },
  {
    id: 2,
    name: "Annette Black",
    title: "Brand Strategist",
    location: "Tokyo, Japan",
    skills: ["Blender", "Sketch", "Adobe XD", "Figma"],
    availability: "Available now",
    salary: "$400/hour",
    verified: true,
    avatar: null,
    about:
      "Experienced brand strategist with a passion for creating compelling brand narratives and digital experiences.",
    education: [
      {
        school: "Design Institute",
        year: "2017 - 2019",
        degree: "Brand Management",
        description: "Specialized in brand strategy and digital marketing.",
      },
    ],
    experience: [
      {
        company: "Creative Agency",
        year: "2019 - Present",
        position: "Senior Brand Strategist",
        description: "Leading brand strategy for major clients.",
      },
    ],
    phone: "123 456 7891",
    email: "annette.black@gmail.com",
    offeredSalary: "$3500/Month",
    experienceTime: "6 Years",
    language: "English, Japanese",
    age: "28 Years Old",
    qualification: "Master Degree",
  },
  {
    id: 3,
    name: "Robert Fox",
    title: "eCommerce Marketing Specialist",
    location: "Tokyo, Japan",
    skills: ["SEO", "Analytics", "Content Strategy", "Email Marketing"],
    availability: "Available now",
    salary: "$600/month",
    avatar: null,
    verified: false,
    about:
      "Digital marketing specialist focused on driving eCommerce growth through data-driven strategies.",
    education: [
      {
        school: "Business School",
        year: "2016 - 2018",
        degree: "Digital Marketing",
        description: "Focus on eCommerce and digital channels.",
      },
    ],
    experience: [
      {
        company: "Online Retail Co",
        year: "2018 - Present",
        position: "Marketing Manager",
        description: "Managing all digital marketing efforts.",
      },
    ],
    phone: "123 456 7892",
    email: "robert.fox@gmail.com",
    offeredSalary: "$3000/Month",
    experienceTime: "5 Years",
    language: "English, Japanese",
    age: "27 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 4,
    name: "Darrell Steward",
    title: "Graphic Designer",
    location: "Tokyo, Japan",
    skills: ["Illustrator", "Photoshop", "InDesign", "After Effects"],
    availability: "Available now",
    salary: "$300/month",
    avatar: null,
    verified: false,
    about:
      "Creative graphic designer with expertise in visual communication and brand identity design.",
    education: [
      {
        school: "Art Institute",
        year: "2018 - 2020",
        degree: "Visual Design",
        description: "Specialized in graphic design and visual arts.",
      },
    ],
    experience: [
      {
        company: "Design Studio",
        year: "2020 - Present",
        position: "Graphic Designer",
        description: "Creating visual designs for various clients.",
      },
    ],
    phone: "123 456 7893",
    email: "darrell.steward@gmail.com",
    offeredSalary: "$2200/Month",
    experienceTime: "4 Years",
    language: "English, Japanese",
    age: "25 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 5,
    name: "Darlene Robertson",
    title: "Vice President of Marketing",
    location: "New York, USA",
    skills: ["Strategy", "Leadership", "Analytics", "Growth Marketing"],
    availability: "Available now",
    salary: "$300/day",
    verified: true,
    avatar: null,
    about:
      "Senior marketing executive with proven track record in scaling businesses and building high-performing teams.",
    education: [
      {
        school: "Harvard Business School",
        year: "2010 - 2012",
        degree: "MBA - Marketing",
        description: "Executive business education focused on marketing.",
      },
    ],
    experience: [
      {
        company: "Tech Corporation",
        year: "2015 - Present",
        position: "VP of Marketing",
        description: "Leading global marketing initiatives.",
      },
    ],
    phone: "123 456 7894",
    email: "darlene.robertson@gmail.com",
    offeredSalary: "$8000/Month",
    experienceTime: "12 Years",
    language: "English, Spanish",
    age: "35 Years Old",
    qualification: "MBA",
  },
  {
    id: 6,
    name: "Jerome Bell",
    title: "UX Designer",
    location: "San Francisco, USA",
    skills: [
      "User Research",
      "Wireframing",
      "Prototyping",
      "Usability Testing",
    ],
    availability: "Available now",
    salary: "$350/day",
    verified: true,
    avatar: null,
    about:
      "User-centered designer passionate about creating intuitive and accessible digital experiences.",
    education: [
      {
        school: "Stanford University",
        year: "2015 - 2017",
        degree: "Human-Computer Interaction",
        description: "Advanced studies in UX design and research.",
      },
    ],
    experience: [
      {
        company: "Tech Startup",
        year: "2017 - Present",
        position: "Lead UX Designer",
        description: "Designing user experiences for mobile and web.",
      },
    ],
    phone: "123 456 7895",
    email: "jerome.bell@gmail.com",
    offeredSalary: "$4500/Month",
    experienceTime: "7 Years",
    language: "English",
    age: "30 Years Old",
    qualification: "Master Degree",
  },
];

export const ResultsPage = ({ searchParams, onViewProfile }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("grid");
  const [ageRange, setAgeRange] = useState([18, 32]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("default");
  const [keywordSearch, setKeywordSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Smart filter with partial matching
  const filteredCandidates = candidatesData.filter((candidate) => {
    // Keyword search - matches name, title, or skills (partial match)
    if (keywordSearch) {
      const keyword = keywordSearch.toLowerCase();
      const matchesKeyword =
        candidate.name.toLowerCase().includes(keyword) ||
        candidate.title.toLowerCase().includes(keyword) ||
        candidate.skills.some((skill) => skill.toLowerCase().includes(keyword));
      if (!matchesKeyword) return false;
    }

    // Location filter
    if (locationFilter !== "all") {
      if (
        !candidate.location.toLowerCase().includes(locationFilter.toLowerCase())
      ) {
        return false;
      }
    }

    // Search params from URL (partial match for better results)
    if (searchParams) {
      if (searchParams.jobTitle) {
        const titleMatch =
          candidate.title
            .toLowerCase()
            .includes(searchParams.jobTitle.toLowerCase()) ||
          candidate.skills.some((skill) =>
            skill.toLowerCase().includes(searchParams.jobTitle.toLowerCase())
          );
        if (!titleMatch) return false;
      }

      if (searchParams.location) {
        const locationMatch = candidate.location
          .toLowerCase()
          .includes(searchParams.location.toLowerCase());
        if (!locationMatch) return false;
      }
    }

    return true;
  });

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
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
  const totalPages = Math.ceil(sortedCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = sortedCandidates.slice(startIndex, endIndex);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    return pages;
  };

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

  const CandidateCard = ({ candidate }) => (
    <div className="bg-[#191D23] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex-shrink-0"></div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-blue-400 text-sm">{candidate.title}</h3>
            </div>
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
          {candidate.skills.map((skill, index) => (
            <span
              key={index}
              className="bg-[#F1F1F1] text-black px-3 py-2 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
        <span className="text-gray-400 flex items-center gap-1">
          {candidate.salary}
        </span>
      </div>
      <hr className="text-gray-400 mb-3" />
      <div className="w-full">
        <button
          onClick={() => onViewProfile(candidate)}
          className="bg-transparent border border-[#3b82f6] hover:bg-[#3B82F6] text-white px-6 py-3 rounded-sm text-sm transition-colors w-full md:w-auto text-center cursor-pointer"
        >
          View Profile
        </button>
      </div>
    </div>
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-sm text-gray-400 mb-6">
            <Link
              to="/"
              className="hover:underline hover:text-[#3B82F6] cursor-pointer"
            >
              <button className="cursor-pointer">Home</button>
            </Link>
            <span className="mx-2">›</span>
            <span className="text-[#3B82F6]">Find Talents</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile Menu Button */}
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
              <div className="bg-[#191D23] rounded-2xl p-6 space-y-6 lg:sticky lg:top-6">
                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Search By Keywords
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                      <option value="all">All Location</option>
                      <option value="tokyo">Tokyo, Japan</option>
                      <option value="new york">New York, USA</option>
                      <option value="london">London, UK</option>
                      <option value="singapore">Singapore</option>
                      <option value="san francisco">San Francisco, USA</option>
                      <option value="berlin">Berlin, Germany</option>
                      <option value="barcelona">Barcelona, Spain</option>
                      <option value="toronto">Toronto, Canada</option>
                      <option value="sydney">Sydney, Australia</option>
                      <option value="seoul">Seoul, South Korea</option>
                      <option value="amsterdam">Amsterdam, Netherlands</option>
                      <option value="mexico city">Mexico City, Mexico</option>
                      <option value="dublin">Dublin, Ireland</option>
                      <option value="paris">Paris, France</option>
                      <option value="zurich">Zurich, Switzerland</option>
                      <option value="mumbai">Mumbai, India</option>
                      <option value="seattle">Seattle, USA</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4">Work Type</h3>
                  <div className="relative">
                    <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                      <option value="fulltime">Full-time</option>
                      <option value="parttime">Part-time</option>
                      <option value="contract">Contract</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Age: {ageRange[0]} - {ageRange[1]} Years Old
                  </h3>
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={ageRange}
                    onValueChange={setAgeRange}
                    max={65}
                    min={18}
                    step={1}
                    minStepsBetweenThumbs={1}
                  >
                    <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-[#3B82F6] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#191D23]"
                      aria-label="Minimum age"
                    />
                    <Slider.Thumb
                      className="block w-4 h-4 bg-white border-2 border-[#3B82F6] rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#191D23]"
                      aria-label="Maximum age"
                    />
                  </Slider.Root>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Salary Estimate
                  </h3>
                  <div className="relative">
                    <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4">Experience</h3>
                  <div className="relative">
                    <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                      <option>&lt; 1 year experience</option>
                      <option>1-3 years</option>
                      <option>3-5 years</option>
                      <option>5+ years</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-4">
                    Qualification
                  </h3>
                  <div className="relative">
                    <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                      <option>Certificate</option>
                      <option>Bachelor</option>
                      <option>Master</option>
                      <option>PhD</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setKeywordSearch("");
                    setLocationFilter("all");
                    setCurrentPage(1);
                    setSidebarOpen(false);
                  }}
                  className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>

                <div className="pt-6 border-t border-gray-700 space-y-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="Marketing"
                      className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Email Frequency
                    </label>
                    <div className="relative">
                      <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                        <option>Weekly</option>
                        <option>Daily</option>
                        <option>Monthly</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <button className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors">
                    Save Job Alert
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
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
                    {filteredCandidates.length} candidate
                    {filteredCandidates.length !== 1 ? "s" : ""} found
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(e.target.value)}
                    className="w-full sm:w-auto bg-[#f1f1f1] border border-gray-700 rounded-sm px-4 py-2 text-sm text-black"
                  >
                    <option value="6">6 Per Page</option>
                    <option value="12">12 Per Page</option>
                    <option value="24">24 Per Page</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full sm:w-auto bg-[#f1f1f1] border border-gray-700 rounded-sm px-4 py-2 text-sm text-black"
                  >
                    <option value="default">Sort by (Default)</option>
                    <option value="newest">Newest First</option>
                    <option value="salary">Highest Salary</option>
                  </select>
                </div>
              </div>

              {/* No Results Message */}
              {filteredCandidates.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                      No Results Found
                    </h2>
                    <p className="text-gray-400 mb-6">
                      We couldn't find any candidates matching your search
                      criteria. Try adjusting your filters or search terms.
                    </p>
                    <button
                      onClick={() => navigate("/")}
                      className="bg-[#3B82F6] hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Go Back Home
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Candidates Grid/List */}
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6"
                        : "space-y-4 mb-6"
                    }
                  >
                    {paginatedCandidates.map((candidate) => (
                      <CandidateCard key={candidate.id} candidate={candidate} />
                    ))}
                  </div>

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
                            Math.min(totalPages, currentPage + 1)
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
            </div>
          </div>
        </div>
      </div>
      <CTA />
    </AnimatedPage>
  );
};
