import { useState, useEffect } from "react";
import JobImage from "../jobs/JobImage";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
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
import { JobContactForm } from "./JobContactForm";
import { CTA } from "../home/CTA";
import { AnimatedPage } from "../AnimatedPage";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import {
  daysLeftLabel,
  formatSalary,
  shareLink,
  formatPosted,
  normalizeList,
  jobPath,
  jobIdFromParam,
  jobKey,
} from "../utils/jobDisplay";
import { buildJobPostingLd, shortText, useDocumentSeo } from "../utils/seo";
import JobDescriptionText from "../utils/JobDescriptionText";

// Employers cannot save jobs (saved jobs belong to talent accounts).
const isEmployerSignedIn = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.userType === "employer" || user?.role === "employer";
  } catch {
    return false;
  }
};

export const JobDetails = ({ jobId: propJobId, onBack }) => {
  const { id: idParam } = useParams();
  // The address is <title>-<company>-<id>; the server only needs the id.
  const id = jobIdFromParam(idParam);
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const source = new URLSearchParams(routeLocation.search).get("source") || "employer";
  const sourceQuery = source === "employer" ? "" : `?source=${encodeURIComponent(source)}`;
  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("about");
  const [currentPortfolioIndex, setCurrentPortfolioIndex] = useState(0);
  const [brokenMedia, setBrokenMedia] = useState({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  useEffect(() => {
    let active = true;
    setJob(null);
    setLoadError("");
    setApplied(false);
    setIsFavorite(false);
    setBrokenMedia({});
    setRelatedJobs([]);
    const fetchJob = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/jobs/public/${id}${sourceQuery}`);
        if (active) setJob(res.data.job);
      } catch (error) {
        console.error("Failed to fetch job", error);
        if (active)
          setLoadError(
            error.response?.status === 404 || error.response?.status === 400
              ? "This job is no longer available."
              : "We couldn't load this job. Please try again.",
          );
      }
    };

    const fetchRelatedJobs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/jobs/related/${id}${sourceQuery}`);
        if (active) setRelatedJobs(res.data.jobs);
      } catch (error) {
        console.error("Failed to fetch related jobs", error);
      }
    };

    fetchJob();
    fetchRelatedJobs();
    return () => {
      active = false;
    };
  }, [id, source, sourceQuery]);

  // **** new route needed ****
  /*useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/saved-jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorite(res.data.isFavorite);
      } catch (err) {
        console.error(err);
      }
    };
    checkFavorite();
  }, [id]);*/

  // Is this job already saved? (uses the existing saved-jobs list endpoint)
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
          setIsFavorite(
            (res.data.jobs || []).some((saved) => jobKey(saved) === jobKey({ _id: id, source })),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, source, sourceQuery]);

  // Has this user already applied? Show "Applied"
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let active = true;
    axios
      .get(`${API_BASE_URL}/api/applications/my-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (!active) return;
        const hasApplied = (res.data?.applications || []).some(
          (application) =>
            String(application.jobId?._id || application.jobId) === String(id) &&
            (application.source || "employer") === source,
        );
        if (hasApplied) setApplied(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, source, sourceQuery]);

  // Filter similar jobs dynamically based on job type and location
  const similarJobs = relatedJobs;

  // Only media the employer actually added to this job.
  const portfolioItems = (
    Array.isArray(job?.gallery) ? job.gallery : []
  ).filter(
    (item) =>
      item &&
      typeof item.url === "string" &&
      item.url &&
      !brokenMedia[item.url],
  );
  const activePortfolioIndex = Math.min(
    currentPortfolioIndex,
    Math.max(portfolioItems.length - 1, 0),
  );
  const activePortfolioItem = portfolioItems[activePortfolioIndex];

  // Employer social links: only the networks that have a link, as real URLs.
  const socialLinks = [
    ["facebook", Facebook],
    ["linkedin", Linkedin],
    ["twitter", Twitter],
    ["instagram", Instagram],
    ["youtube", Youtube],
  ]
    .map(([name, Icon]) => {
      const raw = String(job?.employer?.socialNetworks?.[name] || "").trim();
      if (!raw) return null;
      return {
        name,
        Icon,
        href: /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
      };
    })
    .filter(Boolean);
  const websiteRaw = String(job?.employer?.companyWebsite || "").trim();
  const websiteHref = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : "";

  const handleApply = async () => {
    if (applying || applied) return;
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please sign in to apply");
      navigate("/signin");
      return;
    }

    setApplying(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/applications/apply`,
        { jobId: id, source },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setApplied(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      const message = error.response?.data?.message;
      if (error.response?.status === 401) {
        toast.error("Your session has expired. Please sign in again.");
      } else if (/already applied/i.test(message || "")) {
        setApplied(true);
        toast.info("You have already applied for this job");
      } else if (error.response?.status === 403) {
        toast.error("Only talent accounts can apply for jobs");
      } else {
        toast.error(
          friendlyError(
            error,
            "We couldn't submit your application. Please try again.",
          ),
        );
      }
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    const result = await shareLink({
      title: job?.jobTitle,
      text: job?.jobTitle
        ? `${job.jobTitle}${job.employer?.companyName ? " at " + job.employer.companyName : ""}`
        : undefined,
      url: job?._id
        ? `${window.location.origin}${jobPath(job)}`
        : window.location.href,
    });
    if (result === "copied") toast.success("Link copied to clipboard");
    else if (result === "failed")
      toast.error(
        "We couldn't share this job. Please copy the link from your browser.",
      );
  };

  const handleFavorite = async () => {
    if (savingFavorite) return;
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please sign in to save this job");
      return;
    }

    if (isEmployerSignedIn()) {
      toast.error("Only talent accounts can save jobs");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    setSavingFavorite(true);
    try {
      if (!isFavorite) {
        await axios.post(
          `${API_BASE_URL}/api/saved-jobs`,
          { jobId: id, source },
          { headers },
        );
        toast.success("Job added to favorites!");
      } else {
        await axios.post(
          `${API_BASE_URL}/api/saved-jobs/remove-job`,
          { jobId: id, source },
          { headers },
        );
        toast.success("Job removed from favorites!");
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      if (/already saved/i.test(error.response?.data?.message || "")) {
        setIsFavorite(true);
      } else {
        toast.error(
          friendlyError(
            error,
            "We couldn't update your saved jobs. Please try again.",
          ),
        );
      }
    } finally {
      setSavingFavorite(false);
    }
  };

  const nextPortfolio = () => {
    setCurrentPortfolioIndex(
      activePortfolioIndex >= portfolioItems.length - 1
        ? 0
        : activePortfolioIndex + 1,
    );
  };

  const prevPortfolio = () => {
    setCurrentPortfolioIndex(
      activePortfolioIndex <= 0
        ? portfolioItems.length - 1
        : activePortfolioIndex - 1,
    );
  };

  // Old links (/jobs/<id>) and links with an outdated title move to the current address.
  useEffect(() => {
    if (!job?._id || String(job._id) !== id || (job.source || "employer") !== source) return;
    const wanted = jobPath(job);
    let current = routeLocation.pathname + routeLocation.search;
    try {
      current = decodeURIComponent(current);
    } catch {
      /* keep the raw path */
    }
    if (current !== wanted) navigate(wanted, { replace: true });
  }, [job, id, source, routeLocation.pathname, routeLocation.search, navigate]);

  const jobUrl = job?._id ? `${window.location.origin}${jobPath(job)}` : "";
  const company = job?.employer?.companyName;
  useDocumentSeo({
    title: job
      ? `${job.jobTitle}${company ? ` at ${company}` : ""} | QNDUIT`
      : "",
    description: job
      ? shortText(job.jobDescription) ||
        `${job.jobTitle}${company ? ` at ${company}` : ""}${job.location ? ` in ${job.location}` : ""}. Apply on QNDUIT.`
      : "",
    canonical: jobUrl,
    jsonLd: job ? buildJobPostingLd(job, jobUrl) : null,
  });

  if (loadError) {
    return (
      <AnimatedPage>
        <div
          className="min-h-screen bg-[#0F1419] flex flex-col items-center justify-center gap-4 text-white"
          role="alert"
        >
          <p>{loadError}</p>
          <Link
            to="/jobs"
            className="px-6 py-2 border border-blue-600 text-[#3B82F6] rounded-sm"
          >
            Browse jobs
          </Link>
        </div>
      </AnimatedPage>
    );
  }

  if (!job) {
    return (
      <div
        className="min-h-screen bg-[#0F1419] flex items-center justify-center text-white"
        role="status"
      >
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading job...
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#0F1419] text-white">
        {/* Header Banner */}
        <div className="bg-[#262C36] px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="grid grid-cols-[4rem_1fr] md:grid-cols-[6rem_1fr] gap-x-4 md:gap-x-6 min-w-0">
                <JobImage job={job} className="w-16 h-16 md:w-24 md:h-24 md:row-span-2 bg-muted rounded-lg text-3xl font-bold text-white/80" />
                <div className="self-center md:self-auto text-[#3B82F6] text-sm md:mb-2">
                  {job.employer?.companyName}
                </div>
                <div className="col-span-2 md:col-span-1 mt-4 md:mt-0 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 break-words">
                    {job.jobTitle}{" "}
                    {job.verified && (
                      <span className="bg-blue-600 inline-block p-1 rounded-full ml-2">
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
                    <span>⏰ {formatPosted(job.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {normalizeList(job.jobApplyType)
                      .concat(job.workType ? [job.workType] : [])
                      .map((type, idx) => (
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

              <div className="flex flex-col md:items-end w-full md:w-auto md:shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleShare}
                    aria-label="Share job"
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-[#2A3142] hover:bg-[#2A3142] transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleFavorite}
                    disabled={savingFavorite}
                    aria-label={
                      isFavorite ? "Remove from saved jobs" : "Save job"
                    }
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-[#2A3142] hover:bg-[#2A3142] transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`}
                    />
                  </button>

                  <button
                    onClick={handleApply}
                    disabled={applying || applied}
                    aria-busy={applying}
                    className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                    {applying
                      ? "Applying..."
                      : applied
                        ? "Applied"
                        : "Apply Now"}
                  </button>
                </div>

                <div className="flex flex-col mt-6 pt-6">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">
                      {daysLeftLabel(job.deadlineDate, "left to apply")}
                    </span>
                  </div>
                  <div className="text-[#3B82F6] text-lg">
                    {formatSalary(job.salary)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#1A1F2E]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-4 md:gap-8 overflow-x-auto thin-scroll whitespace-nowrap">
              <button
                onClick={() => setActiveTab("about")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === "about"
                    ? "border-blue-600 text-white"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab("jobs")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === "jobs"
                    ? "border-blue-600 text-white"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                Related Jobs ({similarJobs.length})
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  activeTab === "reviews"
                    ? "border-blue-600 text-white"
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
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Content */}
            <div className="flex-1 min-w-0">
              {activeTab === "about" && (
                <div className="space-y-8">
                  <section className="rounded-xl p-5 md:p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Full Job Description
                    </h2>
                    <JobDescriptionText
                      value={job.jobDescription}
                      className="text-muted-foreground leading-relaxed"
                    />

                    <div className="mt-8">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Qualifications:
                      </h3>
                      <ul className="space-y-3">
                        {normalizeList(job.qualifications).map((qual, idx) => (
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
                  </section>

                  {/* Portfolio Section: only when the employer added media */}
                  {portfolioItems.length > 0 && (
                    <section className="bg-[#1A1F2E] rounded-xl p-5 md:p-8">
                      <h2 className="text-2xl font-bold text-white mb-6">
                        Portfolio
                      </h2>
                      <div className="relative">
                        <div className="aspect-video bg-muted rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                          {activePortfolioItem.type === "video" ? (
                            <video
                              key={activePortfolioItem.url}
                              src={activePortfolioItem.url}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain bg-black"
                            />
                          ) : (
                            <img
                              src={activePortfolioItem.url}
                              alt={`Portfolio ${activePortfolioIndex + 1}`}
                              onError={() =>
                                setBrokenMedia((b) => ({
                                  ...b,
                                  [activePortfolioItem.url]: true,
                                }))
                              }
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        {portfolioItems.length > 1 && (
                          <div className="flex gap-4 items-center">
                            <button
                              onClick={prevPortfolio}
                              aria-label="Previous"
                              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-800" />
                            </button>
                            <div className="flex flex-1 gap-4 overflow-x-auto thin-scroll">
                              {portfolioItems.map((item, idx) => (
                                <button
                                  key={`${item.url}-${idx}`}
                                  onClick={() => setCurrentPortfolioIndex(idx)}
                                  aria-label={`Show item ${idx + 1}`}
                                  className={`relative w-28 shrink-0 aspect-video rounded-lg bg-muted overflow-hidden ${
                                    activePortfolioIndex === idx
                                      ? "ring-2 ring-[#3B82F6]"
                                      : ""
                                  }`}
                                >
                                  {item.type === "video" ? (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                                      <Play className="w-5 h-5 text-white" />
                                    </span>
                                  ) : (
                                    <img
                                      src={item.url}
                                      alt=""
                                      onError={() =>
                                        setBrokenMedia((b) => ({
                                          ...b,
                                          [item.url]: true,
                                        }))
                                      }
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={nextPortfolio}
                              aria-label="Next"
                              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 transition-colors"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-800" />
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeTab === "jobs" && (
                <div className="space-y-8">
                  {/* Similar Jobs */}
                  <section className="bg-[#1A1F2E] rounded-xl p-5 md:p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Related Jobs
                    </h2>
                    {similarJobs.length > 0 ? (
                      <div className="space-y-6">
                        {similarJobs.map((relatedJob) => (
                          <div
                            key={jobKey(relatedJob)}
                            className="bg-[#0F1419] rounded-xl p-6 hover:bg-[#141921] transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex gap-4 flex-1">
                                <JobImage job={relatedJob} className="w-16 h-16 bg-muted rounded-lg font-bold text-white/80" />
                                <div className="flex-1">
                                  <div className="text-[#3B82F6] text-sm mb-1">
                                    {relatedJob.employer?.companyName}
                                  </div>
                                  <Link to={jobPath(relatedJob)}>
                                    <h3 className="text-white text-lg font-semibold mb-2 hover:text-[#3B82F6] transition-colors">
                                      {relatedJob.jobTitle}{" "}
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
                                    <span>
                                      ⏰ {formatPosted(relatedJob.createdAt)}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    {normalizeList(relatedJob.jobApplyType).map(
                                      (type, idx) => (
                                        <span
                                          key={idx}
                                          className="px-3 py-1 bg-[#2A3142] text-white rounded-md text-sm"
                                        >
                                          {type}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button className="p-2 rounded-lg hover:bg-[#2A3142] transition-colors">
                                <Heart className="w-5 h-5 text-muted-foreground" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#2A3142]">
                              <span className="text-muted-foreground text-sm">
                                {daysLeftLabel(
                                  relatedJob.deadlineDate,
                                  "left to apply",
                                )}
                              </span>
                            </div>

                            <div className="mt-4">
                              <span className="text-[#3B82F6] font-semibold flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {formatSalary(relatedJob.salary)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        No related jobs found at the moment.
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === "reviews" && (
                <section className="bg-[#1A1F2E] rounded-xl p-5 md:p-8 text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Reviews
                  </h2>
                  <p className="text-muted-foreground">
                    No reviews have been posted for this employer yet.
                  </p>
                </section>
              )}
            </div>

            {/* Right Sidebar */}
            {source === "employer" && (<div className="w-full lg:w-85 lg:flex-shrink-0 space-y-6">
              <div className="bg-[#191D23] rounded-xl p-6 space-y-4">
                <div className="flex justify-between">
                  <h3 className=" text-[#64666C] text-sm">Website</h3>
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3B82F6] hover:underline break-all text-right"
                    >
                      {websiteRaw}
                    </a>
                  ) : (
                    <span className="text-white text-sm">Not provided</span>
                  )}
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Email
                  </h3>
                  <div className="text-white text-sm">
                    {job.employer.companyEmail}
                  </div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Industry
                  </h3>
                  <div className="text-white text-sm">
                    {job.employer.companyIndustry}
                  </div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Company size
                  </h3>
                  <div className="text-white text-sm">
                    {job.employer.companySize}
                  </div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Headquarters
                  </h3>
                  <div className="text-white text-sm">
                    {job.employer.location}
                  </div>
                </div>
                <hr className="text-[#64666C]" />
                <div className="flex justify-between">
                  <h3 className="text-muted-foreground text-sm mb-1 text-[#64666C]">
                    Founded
                  </h3>
                  <div className="text-white text-sm">
                    {job.employer.foundedYear}
                  </div>
                </div>
                {socialLinks.length > 0 && (
                  <>
                    <hr className="text-[#64666C]" />
                    <div className="flex justify-between items-center">
                      <h3 className="text-muted-foreground text-[1rem] ">
                        Socials:
                      </h3>
                      <div className="flex gap-1">
                        {socialLinks.map((social) => (
                          <a
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={social.name}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#262C36] hover:bg-[#202630] transition-colors"
                          >
                            <social.Icon className="w-4 h-4 text-white" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <JobContactForm jobId={id} />
            </div>) }
          </div>
        </div>
      </div>
      <CTA />
    </AnimatedPage>
  );
};

export default JobDetails;
