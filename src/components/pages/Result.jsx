import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";

// Enhanced mock data with all fields needed for ProfilePage
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
    about:
      "Are you a User Experience Designer with a track record of delivering intuitive digital experiences that drive results? Are you a strategic storyteller and systems thinker who can concept and craft smart, world-class campaigns across a variety of mediums?",
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
  {
    id: 7,
    name: "Sarah Johnson",
    title: "Content Writer",
    location: "London, UK",
    skills: ["Copywriting", "SEO Writing", "Content Strategy", "Editing"],
    availability: "Available now",
    salary: "$200/day",
    verified: false,
    avatar: null,
    about:
      "Professional content writer specializing in engaging copy that converts and ranks well.",
    education: [
      {
        school: "University of London",
        year: "2016 - 2019",
        degree: "English Literature",
        description: "Focus on creative and professional writing.",
      },
    ],
    experience: [
      {
        company: "Content Agency",
        year: "2019 - Present",
        position: "Senior Content Writer",
        description: "Creating content for various industries.",
      },
    ],
    phone: "123 456 7896",
    email: "sarah.johnson@gmail.com",
    offeredSalary: "$2800/Month",
    experienceTime: "5 Years",
    language: "English, French",
    age: "27 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 8,
    name: "Michael Chen",
    title: "Data Analyst",
    location: "Singapore",
    skills: ["Python", "SQL", "Tableau", "Data Visualization"],
    availability: "Available now",
    salary: "$400/day",
    verified: true,
    avatar: null,
    about:
      "Data-driven analyst with expertise in turning complex data into actionable business insights.",
    education: [
      {
        school: "National University of Singapore",
        year: "2014 - 2018",
        degree: "Data Science",
        description: "Specialized in data analytics and machine learning.",
      },
    ],
    experience: [
      {
        company: "Financial Services",
        year: "2018 - Present",
        position: "Senior Data Analyst",
        description: "Analyzing data to drive business decisions.",
      },
    ],
    phone: "123 456 7897",
    email: "michael.chen@gmail.com",
    offeredSalary: "$5000/Month",
    experienceTime: "6 Years",
    language: "English, Mandarin",
    age: "29 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 9,
    name: "Emma Wilson",
    title: "Product Manager",
    location: "Berlin, Germany",
    skills: ["Product Strategy", "Agile", "User Stories", "Roadmapping"],
    availability: "Available now",
    salary: "$450/day",
    verified: true,
    avatar: null,
    about:
      "Strategic product manager with a passion for building products that solve real user problems.",
    education: [
      {
        school: "Technical University Berlin",
        year: "2013 - 2017",
        degree: "Business Administration",
        description: "Focus on product management and innovation.",
      },
    ],
    experience: [
      {
        company: "Tech Startup",
        year: "2017 - Present",
        position: "Senior Product Manager",
        description: "Leading product development from concept to launch.",
      },
    ],
    phone: "123 456 7898",
    email: "emma.wilson@gmail.com",
    offeredSalary: "$6000/Month",
    experienceTime: "7 Years",
    language: "English, German",
    age: "31 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 10,
    name: "David Martinez",
    title: "Frontend Developer",
    location: "Barcelona, Spain",
    skills: ["React", "TypeScript", "CSS", "JavaScript"],
    availability: "Available now",
    salary: "$350/day",
    verified: false,
    avatar: null,
    about:
      "Frontend developer passionate about creating beautiful and performant web applications.",
    education: [
      {
        school: "Barcelona Tech Institute",
        year: "2016 - 2020",
        degree: "Computer Science",
        description: "Specialized in web development and user interfaces.",
      },
    ],
    experience: [
      {
        company: "Digital Agency",
        year: "2020 - Present",
        position: "Frontend Developer",
        description: "Building modern web applications with React.",
      },
    ],
    phone: "123 456 7899",
    email: "david.martinez@gmail.com",
    offeredSalary: "$4200/Month",
    experienceTime: "4 Years",
    language: "English, Spanish",
    age: "26 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 11,
    name: "Lisa Anderson",
    title: "DevOps Engineer",
    location: "Toronto, Canada",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
    availability: "Available now",
    salary: "$500/day",
    verified: true,
    avatar: null,
    about:
      "DevOps engineer specialized in cloud infrastructure and automation.",
    education: [
      {
        school: "University of Toronto",
        year: "2012 - 2016",
        degree: "Computer Engineering",
        description: "Focus on systems and cloud computing.",
      },
    ],
    experience: [
      {
        company: "Cloud Solutions Inc",
        year: "2016 - Present",
        position: "Senior DevOps Engineer",
        description: "Managing cloud infrastructure and deployment pipelines.",
      },
    ],
    phone: "123 456 7900",
    email: "lisa.anderson@gmail.com",
    offeredSalary: "$6500/Month",
    experienceTime: "8 Years",
    language: "English, French",
    age: "32 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 12,
    name: "James Taylor",
    title: "Mobile App Developer",
    location: "Sydney, Australia",
    skills: ["React Native", "iOS", "Android", "Flutter"],
    availability: "Available now",
    salary: "$380/day",
    verified: false,
    avatar: null,
    about:
      "Mobile developer creating cross-platform applications for iOS and Android.",
    education: [
      {
        school: "University of Sydney",
        year: "2015 - 2019",
        degree: "Software Engineering",
        description: "Specialized in mobile application development.",
      },
    ],
    experience: [
      {
        company: "Mobile App Studio",
        year: "2019 - Present",
        position: "Mobile Developer",
        description: "Developing mobile apps for various clients.",
      },
    ],
    phone: "123 456 7901",
    email: "james.taylor@gmail.com",
    offeredSalary: "$4800/Month",
    experienceTime: "5 Years",
    language: "English",
    age: "28 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 13,
    name: "Sophia Lee",
    title: "UI Designer",
    location: "Seoul, South Korea",
    skills: ["Figma", "Adobe XD", "Prototyping", "Design Systems"],
    availability: "Available now",
    salary: "$320/day",
    verified: true,
    avatar: null,
    about:
      "UI designer focused on creating beautiful and intuitive user interfaces.",
    education: [
      {
        school: "Seoul National University",
        year: "2017 - 2021",
        degree: "Visual Design",
        description: "Focus on digital design and user experience.",
      },
    ],
    experience: [
      {
        company: "Design Studio",
        year: "2021 - Present",
        position: "UI Designer",
        description: "Designing user interfaces for web and mobile.",
      },
    ],
    phone: "123 456 7902",
    email: "sophia.lee@gmail.com",
    offeredSalary: "$3800/Month",
    experienceTime: "3 Years",
    language: "English, Korean",
    age: "24 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 14,
    name: "Oliver Brown",
    title: "Backend Developer",
    location: "Amsterdam, Netherlands",
    skills: ["Node.js", "Python", "PostgreSQL", "API Design"],
    availability: "Available now",
    salary: "$420/day",
    verified: true,
    avatar: null,
    about:
      "Backend developer with expertise in building scalable server-side applications.",
    education: [
      {
        school: "University of Amsterdam",
        year: "2014 - 2018",
        degree: "Computer Science",
        description: "Specialized in backend systems and databases.",
      },
    ],
    experience: [
      {
        company: "Tech Company",
        year: "2018 - Present",
        position: "Senior Backend Developer",
        description: "Building and maintaining backend services.",
      },
    ],
    phone: "123 456 7903",
    email: "oliver.brown@gmail.com",
    offeredSalary: "$5500/Month",
    experienceTime: "6 Years",
    language: "English, Dutch",
    age: "29 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 15,
    name: "Isabella Garcia",
    title: "Digital Marketing Manager",
    location: "Mexico City, Mexico",
    skills: ["SEO", "SEM", "Social Media", "Analytics"],
    availability: "Available now",
    salary: "$280/day",
    verified: false,
    avatar: null,
    about:
      "Digital marketing professional specializing in growth marketing and SEO.",
    education: [
      {
        school: "Universidad Nacional",
        year: "2015 - 2019",
        degree: "Marketing",
        description: "Focus on digital marketing and analytics.",
      },
    ],
    experience: [
      {
        company: "Marketing Agency",
        year: "2019 - Present",
        position: "Digital Marketing Manager",
        description: "Managing digital campaigns for various brands.",
      },
    ],
    phone: "123 456 7904",
    email: "isabella.garcia@gmail.com",
    offeredSalary: "$3200/Month",
    experienceTime: "5 Years",
    language: "English, Spanish",
    age: "27 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 16,
    name: "William Thompson",
    title: "Full Stack Developer",
    location: "Dublin, Ireland",
    skills: ["JavaScript", "React", "Node.js", "MongoDB"],
    availability: "Available now",
    salary: "$410/day",
    verified: true,
    avatar: null,
    about:
      "Full stack developer proficient in both frontend and backend technologies.",
    education: [
      {
        school: "Trinity College Dublin",
        year: "2013 - 2017",
        degree: "Computer Science",
        description: "Comprehensive study of software development.",
      },
    ],
    experience: [
      {
        company: "Software Company",
        year: "2017 - Present",
        position: "Full Stack Developer",
        description: "Developing end-to-end web applications.",
      },
    ],
    phone: "123 456 7905",
    email: "william.thompson@gmail.com",
    offeredSalary: "$5200/Month",
    experienceTime: "7 Years",
    language: "English",
    age: "30 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 17,
    name: "Ava Robinson",
    title: "HR Manager",
    location: "Paris, France",
    skills: ["Recruitment", "Employee Relations", "HR Strategy", "Training"],
    availability: "Available now",
    salary: "$300/day",
    verified: false,
    avatar: null,
    about:
      "HR professional with extensive experience in talent acquisition and employee development.",
    education: [
      {
        school: "Sorbonne University",
        year: "2014 - 2018",
        degree: "Human Resources Management",
        description: "Focus on organizational behavior and HR strategy.",
      },
    ],
    experience: [
      {
        company: "Corporate Inc",
        year: "2018 - Present",
        position: "HR Manager",
        description: "Managing recruitment and employee development.",
      },
    ],
    phone: "123 456 7906",
    email: "ava.robinson@gmail.com",
    offeredSalary: "$3600/Month",
    experienceTime: "6 Years",
    language: "English, French",
    age: "28 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 18,
    name: "Ethan Williams",
    title: "Cybersecurity Specialist",
    location: "Zurich, Switzerland",
    skills: [
      "Network Security",
      "Penetration Testing",
      "Compliance",
      "Risk Management",
    ],
    availability: "Available now",
    salary: "$550/day",
    verified: true,
    avatar: null,
    about:
      "Cybersecurity expert focused on protecting organizations from digital threats.",
    education: [
      {
        school: "ETH Zurich",
        year: "2012 - 2016",
        degree: "Information Security",
        description: "Specialized in cybersecurity and network protection.",
      },
    ],
    experience: [
      {
        company: "Security Firm",
        year: "2016 - Present",
        position: "Senior Security Specialist",
        description:
          "Conducting security assessments and implementing protection measures.",
      },
    ],
    phone: "123 456 7907",
    email: "ethan.williams@gmail.com",
    offeredSalary: "$7000/Month",
    experienceTime: "8 Years",
    language: "English, German, French",
    age: "32 Years Old",
    qualification: "Master Degree",
  },
  {
    id: 19,
    name: "Mia Davis",
    title: "Business Analyst",
    location: "Mumbai, India",
    skills: ["Requirements Analysis", "Business Process", "SQL", "Reporting"],
    availability: "Available now",
    salary: "$250/day",
    verified: false,
    avatar: null,
    about:
      "Business analyst bridging the gap between business needs and technical solutions.",
    education: [
      {
        school: "Indian Institute of Technology",
        year: "2016 - 2020",
        degree: "Business Analytics",
        description: "Focus on data analysis and business intelligence.",
      },
    ],
    experience: [
      {
        company: "Consulting Firm",
        year: "2020 - Present",
        position: "Business Analyst",
        description:
          "Analyzing business processes and recommending improvements.",
      },
    ],
    phone: "123 456 7908",
    email: "mia.davis@gmail.com",
    offeredSalary: "$2800/Month",
    experienceTime: "4 Years",
    language: "English, Hindi",
    age: "26 Years Old",
    qualification: "Bachelor Degree",
  },
  {
    id: 20,
    name: "Noah Martinez",
    title: "AI/ML Engineer",
    location: "Seattle, USA",
    skills: ["Machine Learning", "TensorFlow", "Python", "Deep Learning"],
    availability: "Available now",
    salary: "$600/day",
    verified: true,
    avatar: null,
    about:
      "AI engineer specializing in machine learning and artificial intelligence solutions.",
    education: [
      {
        school: "MIT",
        year: "2014 - 2018",
        degree: "Artificial Intelligence",
        description: "Advanced study in AI and machine learning.",
      },
    ],
    experience: [
      {
        company: "AI Research Lab",
        year: "2018 - Present",
        position: "AI/ML Engineer",
        description: "Developing machine learning models and AI solutions.",
      },
    ],
    phone: "123 456 7909",
    email: "noah.martinez@gmail.com",
    offeredSalary: "$8000/Month",
    experienceTime: "6 Years",
    language: "English",
    age: "28 Years Old",
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

  return (
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
            <div className="bg-[#1A1F2E] rounded-2xl p-6 space-y-6 lg:sticky lg:top-6">
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
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(1);
                    setSidebarOpen(false); // Close sidebar on mobile after selecting
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
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">Work Type</h3>
                <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                  <option value="fulltime">Full-time</option>
                  <option value="parttime">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">
                  Age: {ageRange[0]} - {ageRange[1]} Years Old
                </h3>
                <div className="relative pt-2">
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={ageRange[1]}
                    onChange={(e) =>
                      setAgeRange([ageRange[0], parseInt(e.target.value)])
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">
                  Salary Estimate
                </h3>
                <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">Experience</h3>
                <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                  <option>&lt; 1 year experience</option>
                  <option>1-3 years</option>
                  <option>3-5 years</option>
                  <option>5+ years</option>
                </select>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">Qualification</h3>
                <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                  <option>Certificate</option>
                  <option>Bachelor</option>
                  <option>Master</option>
                  <option>PhD</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setKeywordSearch("");
                  setLocationFilter("all");
                  setCurrentPage(1);
                  setSidebarOpen(false); // Close sidebar on mobile after reset
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
                  <select className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white appearance-none focus:outline-none focus:border-[#3B82F6]">
                    <option>Weekly</option>
                    <option>Daily</option>
                    <option>Monthly</option>
                  </select>
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
                {/* Candidates Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {paginatedCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="bg-[#1A1F2E] rounded-2xl p-6 hover:bg-[#1F2937] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-gray-600 rounded-full flex-shrink-0"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-blue-400 text-sm">
                                {candidate.title}
                              </h3>
                            </div>
                            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                              {candidate.name}
                              {candidate.verified && (
                                <span className="text-blue-400 text-xs">
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
                        handlePageChange(Math.min(totalPages, currentPage + 1))
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
  );
};
