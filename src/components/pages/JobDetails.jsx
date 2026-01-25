import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin,
  Share2,
  Heart,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  ChevronLeft,
  ChevronRight,
  Play,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { CTA } from "../home/CTA";
import { AnimatedPage } from "../AnimatedPage";

const jobDetailsData = {
  1: {
    company: "Rockstar Games New York",
    title: "Senior UI/UX Designer",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    salaryPeriod: "year",
    type: ["Full-time", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 32,
    description: `Are you a User Experience Designer with a track record of delivering intuitive digital experiences that drive results? Are you a strategic storyteller and systems thinker who can concept and craft smart, world-class campaigns across a variety of mediums? Deloitte's Green Dot Agency is looking to add a Lead User Experience Designer to our experience design team. We want a passionate creative who's inspired by new trends and emerging technologies, and is able to integrate them into memorable user experiences. A problem solver who is entrepreneurial, collaborative, hungry, and humble; can deliver beautifully designed, leading-edge experiences under tight deadlines; and who has demonstrated proven expertise.`,
    requirements: [
      "Support the Creative Directors and Associate Creative Directors of experience design to concept and oversee the production of bold, innovative, award-winning campaigns and digital experiences.",
      "Make strategic and tactical UX decisions related to design and usability as well as features and functions.",
      "Creates low- and high-fidelity wireframes that represent a user's journey.",
      "Effectively pitch wireframes to and solutions to stakeholders. You'll be the greatest advocate for our work, but you'll also listen and internalize feedback so that we can come back with creative that exceeds expectations.",
      "A portfolio which highlights strong understanding of UX design including but not limited to: user flows, IA, and translating customer research, analytics, and insights into wireframes and high-fidelity designs",
      "Possess problem-solving skills, an investigative mentality, and a proactive nature-committed to delivering solutions.",
      "Superior presentation skills.",
    ],
    qualifications: [
      "Bachelor's degree preferred, or equivalent experience.",
      "At least 5-8 years of experience with UX and UI design.",
      "2 years of experience with design thinking or similar framework that focuses on defining users' needs early.",
      "Strong portfolio showing expert concept, layout, and typographic skills, as well as creativity and ability to adhere to brand standards.",
      "Expertise in Figma, Adobe Creative Cloud suite, Microsoft suite.",
      "Ability to collaborate well with cross-disciplinary agency team and stakeholders at all levels.",
      "Forever learning: Relentless desire to learn and leverage the latest web technologies.",
      "Detail-oriented: You must be highly organized, be able to multi-task, and meet tight deadlines.",
      "Independence: The ability to make things happen with limited direction. Excellent proactive attitude, take-charge personality, and 'can-do' demeanor.",
      "Proficiency with Front-End UI technologies a bonus but not necessary (such as HTML, CSS, JavaScript).",
    ],
    website: "avitex.vn",
    email: "hi.avitex@gmail.com",
    industry: "Internet Publishing",
    companySize: "51-200 Employees",
    headquarters: "3 S Valley, Las Vegas, USA",
    founded: "2017",
  },
};

const relatedJobs = [
  {
    id: 2,
    company: "Avitex Agency",
    title: "HR Administration",
    location: "Las Vegas, NV 89107, USA",
    salary: "$83,000 - $110,000",
    type: ["Part-time", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
  {
    id: 3,
    company: "Avitex Agency",
    title: "Senior Developer",
    location: "Las Vegas, NV 89107, USA",
    salary: "$85,000 - $110,000",
    type: ["Part-time", "Remote"],
    rating: 4,
    verified: true,
    postedDate: "2 days ago",
    daysLeft: 22,
  },
];

const reviews = [
  {
    id: 1,
    name: "Ariel Houessou",
    date: "August 13, 2023",
    rating: 5,
    verified: true,
    comment: "Great 401K benefits- not based on a match but is 8% contribution",
  },
  {
    id: 2,
    name: "Antony Bessan",
    date: "August 13, 2023",
    rating: 5,
    verified: true,
    comment: "Great 401K benefits- not based on a match but is 8% contribution",
  },
  {
    id: 3,
    name: "Jean Paul Sessou",
    date: "August 13, 2023",
    rating: 5,
    verified: true,
    comment: "Great 401K benefits- not based on a match but is 8% contribution",
  },
];

export const JobDetails = ({ jobId: propJobId, onBack }) => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("about");
  const [currentPortfolioIndex, setCurrentPortfolioIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const jobId = propJobId || id || "1";
  const job = jobDetailsData[jobId] || jobDetailsData["1"];

  // Filter similar jobs dynamically based on job type and location
  const similarJobs = relatedJobs.filter((relJob) => {
    const hasMatchingType = relJob.type.some((type) => job.type.includes(type));
    const isSameLocation = relJob.location === job.location;
    return (hasMatchingType || isSameLocation) && relJob.id !== parseInt(jobId);
  });

  const portfolioItems = [
    { type: "video" },
    { type: "image" },
    { type: "image" },
  ];

  const handleApply = () => {
    toast.success("Application submitted successfully!");
  };

  const nextPortfolio = () => {
    setCurrentPortfolioIndex((prev) =>
      prev === portfolioItems.length - 1 ? 0 : prev + 1
    );
  };

  const prevPortfolio = () => {
    setCurrentPortfolioIndex((prev) =>
      prev === 0 ? portfolioItems.length - 1 : prev - 1
    );
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#0F1419] text-white">
        {/* Header Banner */}
        <div className="bg-[#262C36] px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between">
              <div className="flex gap-6">
                <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0" />
                <div>
                  <div className="text-[#3B82F6] text-sm mb-2">
                    {job.company}
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-3">
                    {job.title}{" "}
                    {job.verified && (
                      <span className="bg-[#3B82F6] inline-block p-1 rounded-full ml-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="14"
                          viewBox="0 0 15 14"
                          fill="none"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M8.40992 0.73096C8.55202 0.77565 8.67617 0.864507 8.76429 0.984609C8.85242 1.10471 8.89993 1.2498 8.89992 1.39876V4.89876H11.6999C11.828 4.8987 11.9536 4.93377 12.0631 5.00014C12.1726 5.06651 12.2618 5.16164 12.321 5.27518C12.3801 5.38872 12.4071 5.51632 12.3988 5.6441C12.3905 5.77187 12.3473 5.89492 12.2739 5.99986L7.37392 12.9999C7.28864 13.122 7.1666 13.2138 7.02556 13.2618C6.88452 13.3099 6.73183 13.3116 6.58971 13.2669C6.44759 13.2222 6.32345 13.1332 6.23537 13.0131C6.14728 12.8929 6.09983 12.7478 6.09992 12.5988V9.09876H3.29992C3.17188 9.09882 3.04627 9.06375 2.93677 8.99738C2.82727 8.93101 2.73808 8.83588 2.67889 8.72234C2.6197 8.6088 2.59279 8.4812 2.60108 8.35342C2.60937 8.22565 2.65255 8.1026 2.72592 7.99766L7.62592 0.99766C7.71133 0.875711 7.83339 0.784169 7.97438 0.736334C8.11537 0.688498 8.26794 0.686861 8.40992 0.73166V0.73096Z"
                            fill="white"
                          />
                        </svg>
                      </span>
                    )}
                  </h1>
                  <div className="flex items-center gap-6 text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    <span>⏰ {job.postedDate}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {job.type.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-[#f1f1f1] text-black rounded-full text-sm"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end ">
                <div className="flex items-center gap-3">
                  <button className="w-12 h-12 flex items-center justify-center rounded-full border border-[#2A3142] hover:bg-[#2A3142] transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-[#2A3142] hover:bg-[#2A3142] transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isFavorite ? "fill-red-500 text-red-500" : "text-white"
                      }`}
                    />
                  </button>

                  <button
                    onClick={handleApply}
                    className="px-8 py-2 bg-[#3B82F6] hover:bg-[#3077e8] text-white font-semibold rounded-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="21"
                        height="20"
                        viewBox="0 0 21 20"
                        fill="none"
                      >
                        <path
                          d="M18.8307 1.66797L9.66406 10.8346"
                          stroke="white"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M18.8307 1.66797L12.9974 18.3346L9.66406 10.8346L2.16406 7.5013L18.8307 1.66797Z"
                          stroke="white"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                    Apply Now
                  </button>
                </div>

                <div className="flex flex-col mt-6 pt-6">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">
                      {job.daysLeft} days left to apply
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < job.rating ? "text-yellow-400" : "text-gray-600"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="text-[#3B82F6] text-lg">
                    {job.salary}/
                    <span className="text-sm text-gray-600">
                      {job.salaryPeriod}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#1A1F2E]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("about")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === "about"
                    ? "border-[#3B82F6] text-white"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab("jobs")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === "jobs"
                    ? "border-[#3B82F6] text-white"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                Jobs (2)
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === "reviews"
                    ? "border-[#3B82F6] text-white"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                Reviews
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-8">
            {/* Left Content */}
            <div className="flex-1">
              {activeTab === "about" && (
                <div className="space-y-8">
                  <section className="rounded-xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Full Job Description
                    </h2>
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {job.description}
                    </div>

                    <div className="mt-8">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Key Responsibilities:
                      </h3>
                      <ul className="space-y-3">
                        {job.requirements.map((req, idx) => (
                          <li
                            key={idx}
                            className="flex gap-3 text-muted-foreground"
                          >
                            <span className="text-[#3B82F6]">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Qualifications:
                      </h3>
                      <ul className="space-y-3">
                        {job.qualifications.map((qual, idx) => (
                          <li
                            key={idx}
                            className="flex gap-3 text-muted-foreground"
                          >
                            <span className="text-[#3B82F6]">•</span>
                            <span>{qual}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 pt-8 border-t border-[#2A3142]">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Social Profiles:
                      </h3>
                      <div className="flex gap-3">
                        {[Facebook, Linkedin, Twitter, Instagram, Youtube].map(
                          (Icon, idx) => (
                            <button
                              key={idx}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors"
                            >
                              <Icon className="w-5 h-5 text-gray-800" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Portfolio Section */}
                  <section className="bg-[#1A1F2E] rounded-xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Portfolio
                    </h2>
                    <div className="relative">
                      <div className="aspect-video bg-muted rounded-xl mb-4 flex items-center justify-center">
                        {portfolioItems[currentPortfolioIndex].type ===
                        "video" ? (
                          <button className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </button>
                        ) : (
                          <div className="text-muted-foreground">
                            Portfolio Image
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={prevPortfolio}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-800" />
                        </button>
                        {portfolioItems.slice(0, 3).map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentPortfolioIndex(idx)}
                            className={`flex-1 aspect-video rounded-lg bg-muted ${
                              currentPortfolioIndex === idx
                                ? "ring-2 ring-[#3B82F6]"
                                : ""
                            }`}
                          />
                        ))}
                        <button
                          onClick={nextPortfolio}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-800" />
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "jobs" && (
                <div className="space-y-8">
                  {/* Similar Jobs */}
                  <section className="bg-[#1A1F2E] rounded-xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Similar Jobs
                    </h2>
                    {similarJobs.length > 0 ? (
                      <div className="space-y-6">
                        {similarJobs.map((relatedJob) => (
                          <div
                            key={relatedJob.id}
                            className="bg-[#0F1419] rounded-xl p-6 hover:bg-[#141921] transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex gap-4 flex-1">
                                <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="text-[#3B82F6] text-sm mb-1">
                                    {relatedJob.company}
                                  </div>
                                  <Link to={`/job/${relatedJob.id}`}>
                                    <h3 className="text-white text-lg font-semibold mb-2 hover:text-[#3B82F6] transition-colors">
                                      {relatedJob.title}{" "}
                                      {relatedJob.verified && (
                                        <span className="text-[#3B82F6]">
                                          ✓
                                        </span>
                                      )}
                                    </h3>
                                  </Link>
                                  <div className="flex items-center gap-4 text-muted-foreground text-sm mb-3">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      {relatedJob.location}
                                    </span>
                                    <span>⏰ {relatedJob.postedDate}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    {relatedJob.type.map((type, idx) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1 bg-[#2A3142] text-white rounded-md text-sm"
                                      >
                                        {type}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <button className="p-2 rounded-lg hover:bg-[#2A3142] transition-colors">
                                <Heart className="w-5 h-5 text-muted-foreground" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#2A3142]">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={
                                      i < relatedJob.rating
                                        ? "text-yellow-400"
                                        : "text-gray-600"
                                    }
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-muted-foreground text-sm">
                                {relatedJob.daysLeft} days left to apply
                              </span>
                            </div>

                            <div className="mt-4">
                              <span className="text-[#3B82F6] font-semibold flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {relatedJob.salary}/year
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        No similar jobs found at the moment.
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-8">
                  {/* Reviews Section */}
                  <section className="bg-[#1A1F2E] rounded-xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white">
                        Customer Reviews
                      </h2>

                      <button className="px-6 py-3 border border-[#3B82F6]  text-[#3B82F6] hover:bg-[#3077e8] hover:text-white rounded-sm font-semibold transition-colors">
                        Write A Review
                      </button>
                    </div>

                    <div className="flex items-start gap-12 mb-8">
                      <div className="text-center">
                        <div className="text-6xl font-bold text-white mb-2">
                          4.8
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-yellow-400 text-xl">
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          (1,968 Ratings)
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        {[
                          { stars: 5, percentage: 60 },
                          { stars: 4, percentage: 20 },
                          { stars: 3, percentage: 10 },
                          { stars: 2, percentage: 7 },
                          { stars: 1, percentage: 3 },
                        ].map(({ stars, percentage }) => (
                          <div key={stars} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-4">
                              {stars}
                            </span>
                            <span className="text-yellow-400">★</span>
                            <div className="flex-1 h-2 bg-[#2A3142] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[[#3B82F6] ] rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Review List */}
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="pt-6 border-t border-[#2A3142]"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white">
                                  {review.name}
                                </h4>
                                {review.verified && (
                                  <span className="text-green-400">✓</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {review.date}
                              </div>
                              <div className="flex items-center gap-1 mb-3">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className="text-yellow-400">
                                    ★
                                  </span>
                                ))}
                              </div>
                              <p className="text-muted-foreground">
                                {review.comment}
                              </p>
                            </div>
                            <button className="text-muted-foreground hover:text-white text-sm border border-[#2A3142] px-4 py-2 rounded-lg">
                              Was this helpful? 👍
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 text-center">
                      <button className="text-[#f1f1f1] hover:underline">
                        See more reviews (19)
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="w-85 flex-shrink-0 space-y-6">
              <div className="bg-[#191D23] rounded-xl p-6 space-y-4">
                <div className="flex justify-between">
                  <h3 className=" text-[#64666C] text-sm">Website</h3>
                  <a
                    href={job.website}
                    className="text-[#3B82F6] hover:underline"
                  >
                    {job.website}
                  </a>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Email
                  </h3>
                  <div className="text-white text-sm">{job.email}</div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Industry
                  </h3>
                  <div className="text-white text-sm">{job.industry}</div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Company size
                  </h3>
                  <div className="text-white text-sm">{job.companySize}</div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Headquarters
                  </h3>
                  <div className="text-white text-sm">{job.headquarters}</div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Founded
                  </h3>
                  <div className="text-white text-sm">{job.founded}</div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-[1rem] ">
                    Socials:
                  </h3>
                  <div className="flex gap-1">
                    {[Facebook, Linkedin, Twitter, Instagram, Youtube].map(
                      (Icon, idx) => (
                        <button
                          key={idx}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#262C36] hover:bg-[#202630] transition-colors"
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#191D23] rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Contact Us</h3>
                <form className="space-y-4">
                  <input
                    type="text"
                    placeholder="Subject"
                    className="w-full bg-[#262C36] border border-[#2A3142] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#3B82F6]"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    className="w-full bg-[#262C36] border border-[#2A3142] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#3B82F6]"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full bg-[#262C36] border border-[#2A3142] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#3B82F6]"
                  />
                  <textarea
                    placeholder="Message"
                    rows={4}
                    className="w-full bg-[#262C36] border border-[#2A3142] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#3B82F6] resize-none"
                  />
                  <button className="w-full bg-[#3B82F6] hover:bg-[#3077e8] text-white font-semibold rounded-sm py-2 transition-colors cursor-pointer">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CTA />
    </AnimatedPage>
  );
};
