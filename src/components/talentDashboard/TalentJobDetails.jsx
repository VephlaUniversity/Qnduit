import JobApplyAction from "../jobs/JobApplyAction";
import { jobApplicationAction } from "../utils/jobApplicationAction";
import { useState, useEffect } from "react";
import JobImage from "../jobs/JobImage";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
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
  UserPlus,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { JobContactForm } from "../pages/JobContactForm";
import { shareLink, jobPath, jobKey, talentJobPath } from "../utils/jobDisplay";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import {
  daysLeftLabel,
  formatSalary,
  formatPosted,
  normalizeList,
} from "../utils/jobDisplay";
import { useAuth } from "../hooks/useAuth";
import JobDescriptionText from "../utils/JobDescriptionText";

const followError = (error) => {
  const status = error.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "Only Talent accounts can follow employers.";
  if (status === 404) return "This employer is no longer available.";
  return "Unable to update employer follow status. Please try again.";
};

const EmployerFollow = ({ employerId, token }) => {
  const [status, setStatus] = useState("loading");
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    axios
      .get(`${API_BASE_URL}/api/follows/status/${employerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (!active) return;
        if (!data.success || typeof data.isFollowing !== "boolean")
          throw new Error();
        setIsFollowing(data.isFollowing);
        setStatus("ready");
      })
      .catch((failure) => {
        if (!active) return;
        setError(followError(failure));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [employerId, token, attempt]);

  const toggle = async () => {
    if (status !== "ready") return;
    setStatus("busy");
    setError("");
    try {
      const url = `${API_BASE_URL}/api/follows/employers/${employerId}`;
      const options = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = isFollowing
        ? await axios.delete(url, options)
        : await axios.post(url, {}, options);
      if (!data.success || typeof data.isFollowing !== "boolean")
        throw new Error();
      setIsFollowing(data.isFollowing);
    } catch (failure) {
      setError(followError(failure));
    } finally {
      setStatus("ready");
    }
  };

  return (
    <div>
      {status === "error" ? (
        <button
          onClick={() => setAttempt((value) => value + 1)}
          className="min-h-[44px] rounded-lg border border-blue-500 px-3 text-blue-400 focus-visible:outline focus-visible:outline-2"
        >
          Retry follow status
        </button>
      ) : (
        <button
          onClick={toggle}
          disabled={status !== "ready"}
          aria-pressed={isFollowing}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-blue-500 px-3 text-blue-400 disabled:opacity-50 focus-visible:outline focus-visible:outline-2"
        >
          {isFollowing ? (
            <UserCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {status === "loading"
            ? "Loading follow status…"
            : status === "busy"
              ? "Updating…"
              : isFollowing
                ? "Unfollow employer"
                : "Follow employer"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

const JobEmployerActions = ({ employerId, jobId }) => {
  const { user } = useAuth();
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  if (typeof employerId !== "string" || !/^[a-f\d]{24}$/i.test(employerId)) {
    return (
      <p className="text-sm text-gray-400">Employer profile unavailable.</p>
    );
  }
  const origin = /^[a-f\d]{24}$/i.test(jobId) ? `?from=job&jobId=${jobId}` : "";
  return (
    <div className="mb-3 flex flex-wrap items-start gap-3">
      <Link
        to={`/talent-dashboard/users/employer/${employerId}${origin}`}
        className="inline-flex min-h-[44px] items-center rounded-lg border border-blue-500 px-3 text-sm text-blue-400 focus-visible:outline focus-visible:outline-2"
      >
        View Employer Profile
      </Link>
      {user?.userType === "talent" &&
        (token ? (
          <EmployerFollow
            key={`${employerId}:${user.id}`}
            employerId={employerId}
            token={token}
          />
        ) : (
          <p role="alert" className="text-sm text-red-400">
            Please sign in to follow this employer.
          </p>
        ))}
    </div>
  );
};

export const TalentJobDetails = () => {
  const { id } = useParams();
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
    if (!token) return;
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
    if (jobApplicationAction(job).kind !== "internal" || applying || applied) return;
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

  if (loadError) {
    return (
      <div
        className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 p-4 md:p-6 lg:p-8 text-white"
        role="alert"
      >
        <p>{loadError}</p>
        <button
          onClick={() => navigate(-1)}
          className="min-h-11 px-6 py-2 border border-blue-600 text-blue-400 rounded-lg"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div
        className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 text-white"
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
    <div className="min-h-[calc(100vh-4rem)] min-w-0 bg-[#0E0E10] p-4 md:p-6 lg:p-8 text-white">
      {/* Header Banner */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Jobs
        </button>
      </div>
      <div className="bg-[#1A1A1E] border border-white/5 rounded-lg p-4 sm:p-6 mb-6">
        <div className="min-w-0">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
            <div className="grid flex-1 grid-cols-[4rem_minmax(0,1fr)] gap-x-4 min-w-0">
              <JobImage job={job} className="w-16 h-16 sm:row-span-2 bg-[#0E0E10] rounded-lg text-2xl font-semibold text-white/80" />
              <div className="self-center sm:self-auto min-w-0 break-words">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[#3B82F6] text-sm">
                    {job.employer?.companyName}
                  </span>
                </div>
                <JobEmployerActions employerId={job.employer?._id} jobId={id} />
              </div>
              <div className="col-span-2 sm:col-span-1 mt-4 sm:mt-0 min-w-0">
                <h1 className="text-2xl md:text-3xl font-semibold text-white mb-3 break-words">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span>⏰ {formatPosted(job.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {normalizeList(job.jobApplyType)
                    .concat(job.workType ? [job.workType] : [])
                    .map((type, idx) => (
                      <span
                        key={idx}
                        className="max-w-full px-3 py-1 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-md text-xs font-medium break-words"
                      >
                        {type}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full min-w-0 xl:w-72 xl:shrink-0 border-t border-white/10 pt-5 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleShare}
                  aria-label="Share job"
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleFavorite}
                  disabled={savingFavorite}
                  aria-label={
                    isFavorite ? "Remove from saved jobs" : "Save job"
                  }
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`}
                  />
                </button>

                <JobApplyAction job={job} applied={applied} applying={applying}
                  onApply={handleApply}
                  className="min-h-11 min-w-0 flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm break-words font-medium rounded-lg flex items-center gap-2 whitespace-normal justify-center text-center transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                </JobApplyAction>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">
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
      <div className="border-b border-white/10 mb-6">
        <div className="min-w-0">
          <div className="flex gap-4 md:gap-8 overflow-x-auto thin-scroll whitespace-nowrap">
            <button
              onClick={() => setActiveTab("about")}
              className={`shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "about"
                  ? "border-blue-600 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "jobs"
                  ? "border-blue-600 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Related Jobs ({similarJobs.length})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "reviews"
                  ? "border-blue-600 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Reviews
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-w-0">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "about" && (
              <div className="space-y-6">
                <section className="bg-[#1A1A1E] border border-white/5 rounded-lg p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Full Job Description
                  </h2>
                  <JobDescriptionText
                    value={job.jobDescription}
                    className="text-gray-400 text-sm leading-7 break-words"
                  />

                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Qualifications:
                    </h3>
                    <ul className="space-y-3">
                      {normalizeList(job.qualifications).map((qual, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-gray-400"
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
                  <section className="bg-[#1A1A1E] border border-white/5 rounded-lg p-4 sm:p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                      Portfolio
                    </h2>
                    <div className="relative">
                      <div className="aspect-video bg-[#0E0E10] rounded-xl mb-4 flex items-center justify-center overflow-hidden">
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
                                className={`relative w-28 shrink-0 aspect-video rounded-lg bg-[#0E0E10] overflow-hidden ${
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
              <div className="space-y-6">
                {/* Similar Jobs */}
                <section className="bg-[#1A1A1E] border border-white/5 rounded-lg p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Related Jobs
                  </h2>
                  {similarJobs.length > 0 ? (
                    <div className="space-y-6">
                      {similarJobs.map((relatedJob) => (
                        <div
                          key={jobKey(relatedJob)}
                          className="min-w-0 bg-[#0E0E10] border border-white/10 rounded-lg p-4 sm:p-5 hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex gap-3 flex-1 min-w-0">
                              <JobImage job={relatedJob} className="w-16 h-16 bg-[#0E0E10] rounded-lg font-bold text-white/80" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[#3B82F6] text-sm mb-1">
                                  {relatedJob.employer?.companyName}
                                </div>
                                <Link
                                  to={talentJobPath(relatedJob)}
                                >
                                  <h3 className="text-white text-lg font-semibold break-words mb-2 hover:text-[#3B82F6] transition-colors">
                                    {relatedJob.jobTitle}{" "}
                                    {relatedJob.verified && (
                                      <span className="text-[#3B82F6]">✓</span>
                                    )}
                                  </h3>
                                </Link>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-400 text-sm mb-3">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {relatedJob.location}
                                  </span>
                                  <span>
                                    ⏰ {formatPosted(relatedJob.createdAt)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {normalizeList(relatedJob.jobApplyType).map((type, idx) => (
                                    <span
                                      key={idx}
                                      className="px-3 py-1 bg-white/5 text-white rounded-md text-sm"
                                    >
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                              <Heart className="w-5 h-5 text-gray-400" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                            <span className="text-gray-400 text-sm">
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
                    <div className="text-center text-gray-400 py-12">
                      No related jobs found at the moment.
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "reviews" && (
              <section className="bg-[#1A1A1E] border border-white/5 rounded-lg p-4 sm:p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Customer Reviews
                </h2>
                <p className="text-gray-400">
                  Reviews are currently unavailable for this job.
                </p>
              </section>
            )}
          </div>

          {/* Right Sidebar */}
          {source === "employer" && (<div className="w-full min-w-0 xl:w-72 2xl:w-80 xl:shrink-0 space-y-6 [&>div]:bg-[#1A1A1E] [&>div]:border [&>div]:border-white/5 [&>div]:rounded-lg [&>div]:p-4 sm:[&>div]:p-6 [&_input]:bg-[#0E0E10] [&_textarea]:bg-[#0E0E10]">
            <div className="bg-[#1A1A1E] border border-white/5 rounded-lg p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <h3 className=" text-gray-400 text-sm">Website</h3>
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
                  <span className="text-white text-sm break-words min-w-0">Not provided</span>
                )}
              </div>
              <hr className="border-white/10" />
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <h3 className=" text-sm mb-1 text-gray-400">Email</h3>
                <div className="text-white text-sm break-words min-w-0">
                  {job.employer?.companyEmail}
                </div>
              </div>
              <hr className="border-white/10" />
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <h3 className=" text-sm mb-1 text-gray-400">Industry</h3>
                <div className="text-white text-sm break-words min-w-0">
                  {job.employer?.companyIndustry}
                </div>
              </div>
              <hr className="border-white/10" />
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <h3 className=" text-sm mb-1 text-gray-400">Company size</h3>
                <div className="text-white text-sm break-words min-w-0">
                  {job.employer?.companySize}
                </div>
              </div>
              <hr className="border-white/10" />
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <h3 className=" text-sm mb-1 text-gray-400">Headquarters</h3>
                <div className="text-white text-sm break-words min-w-0">
                  {job.employer?.location}
                </div>
              </div>
              <hr className="border-white/10" />
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <h3 className=" text-sm mb-1 text-gray-400">Founded</h3>
                <div className="text-white text-sm break-words min-w-0">
                  {job.employer?.foundedYear}
                </div>
              </div>
              {socialLinks.length > 0 && (
                <>
                  <hr className="border-white/10" />
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 items-center">
                    <h3 className="text-gray-400 text-[1rem] ">
                      Socials:
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {socialLinks.map((social) => (
                        <a
                          key={social.name}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.name}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
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
  );
};

export default TalentJobDetails;
