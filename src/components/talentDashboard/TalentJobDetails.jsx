import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import {
  daysLeftLabel,
  formatSalary,
  formatPosted,
  normalizeList,
} from "../utils/jobDisplay";
import { useAuth } from "../hooks/useAuth";

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
  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("about");
  const [currentPortfolioIndex, setCurrentPortfolioIndex] = useState(0);
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
    setRelatedJobs([]);
    const fetchJob = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/jobs/public/${id}`);
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
        const res = await axios.get(`${API_BASE_URL}/api/jobs/related/${id}`);
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
  }, [id]);

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
            (res.data.jobs || []).some((saved) => String(saved.id) === id),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  // Filter similar jobs dynamically based on job type and location
  const similarJobs = relatedJobs;

  const portfolioItems = [
    { type: "video" },
    { type: "image" },
    { type: "image" },
  ];

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
        { jobId: id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setApplied(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      const message = error.response?.data?.message;
      if (error.response?.status === 401) {
        toast.error("Session expired. Please sign in again");
      } else if (/already applied/i.test(message || "")) {
        setApplied(true);
        toast.info("You have already applied for this job");
      } else if (error.response?.status === 403) {
        toast.error("Only talent accounts can apply for jobs");
      } else {
        toast.error(message || "Failed to apply for job");
      }
    } finally {
      setApplying(false);
    }
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
        await axios.post(`${API_BASE_URL}/api/saved-jobs`, { jobId: id }, { headers });
        toast.success("Job added to favorites!");
      } else {
        await axios.post(`${API_BASE_URL}/api/saved-jobs/remove-job`, { jobId: id }, { headers });
        toast.success("Job removed from favorites!");
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      if (/already saved/i.test(error.response?.data?.message || "")) {
        setIsFavorite(true);
      } else {
        toast.error(error.response?.data?.message || "Failed to update favorites");
      }
    } finally {
      setSavingFavorite(false);
    }
  };

  const nextPortfolio = () => {
    setCurrentPortfolioIndex((prev) =>
      prev === portfolioItems.length - 1 ? 0 : prev + 1,
    );
  };

  const prevPortfolio = () => {
    setCurrentPortfolioIndex((prev) =>
      prev === 0 ? portfolioItems.length - 1 : prev - 1,
    );
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white" role="alert">
        <p>{loadError}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 border border-[#3B82F6] text-[#3B82F6] rounded-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" role="status">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading job...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Jobs
        </button>
      </div>
      <div className="bg-[#262C36] px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex gap-6">
              <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0" />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[#3B82F6] text-sm">
                    {job.employer?.companyName}
                  </span>
                </div>
                <JobEmployerActions employerId={job.employer?._id} jobId={id} />
                <h1 className="text-3xl font-bold text-white mb-3">
                  {job.jobTitle}{" "}
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
                  <span>⏰ {formatPosted(job.createdAt)}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {normalizeList(job.jobApplyType).concat(job.workType ? [job.workType] : []).map((type, idx) => (
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
                  onClick={handleFavorite}
                  disabled={savingFavorite}
                  aria-label={isFavorite ? "Remove from saved jobs" : "Save job"}
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
                  className="px-8 py-2 bg-[#3B82F6] hover:bg-[#3077e8] text-white font-semibold rounded-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                  {applying ? "Applying..." : applied ? "Applied" : "Apply Now"}
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
                    {job.jobDescription}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Key Responsibilities:
                    </h3>
                    <ul className="space-y-3">
                      {normalizeList(job.requirements).map((req, idx) => (
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
                        ),
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
                          key={relatedJob._id}
                          className="bg-[#0F1419] rounded-xl p-6 hover:bg-[#141921] transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4 flex-1">
                              <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-[#3B82F6] text-sm mb-1">
                                  {relatedJob.employer?.companyName}
                                </div>
                                <Link to={`/talent-dashboard/job-results/details/${relatedJob._id}`}>
                                  <h3 className="text-white text-lg font-semibold mb-2 hover:text-[#3B82F6] transition-colors">
                                    {relatedJob.jobTitle}{" "}
                                    {relatedJob.verified && (
                                      <span className="text-[#3B82F6]">✓</span>
                                    )}
                                  </h3>
                                </Link>
                                <div className="flex items-center gap-4 text-muted-foreground text-sm mb-3">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {relatedJob.location}
                                  </span>
                                  <span>⏰ {formatPosted(relatedJob.createdAt)}</span>
                                </div>
                                <div className="flex gap-2">
                                  {relatedJob.jobApplyType?.map((type, idx) => (
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
                            <span className="text-muted-foreground text-sm">
                                {daysLeftLabel(relatedJob.deadlineDate, "left to apply")}
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
                      No similar jobs found at the moment.
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "reviews" && (
              <section className="bg-[#1A1F2E] rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Customer Reviews
                </h2>
                <p className="text-muted-foreground">
                  Reviews are currently unavailable for this job.
                </p>
              </section>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-85 flex-shrink-0 space-y-6">
            <div className="bg-[#191D23] rounded-xl p-6 space-y-4">
              <div className="flex justify-between">
                <h3 className=" text-[#64666C] text-sm">Website</h3>
                <a
                  href={job.employer?.companyWebsite}
                  className="text-[#3B82F6] hover:underline"
                >
                  {job.employer?.companyWebsite}
                </a>
              </div>
              <hr className="text-[#64666C]" />
              <div className="flex justify-between">
                <h3 className=" text-sm mb-1 text-[#64666C]">Email</h3>
                <div className="text-white text-sm">
                  {job.employer?.companyEmail}
                </div>
              </div>
              <hr className="text-[#64666C]" />
              <div className="flex justify-between">
                <h3 className=" text-sm mb-1 text-[#64666C]">Industry</h3>
                <div className="text-white text-sm">
                  {job.employer?.companyIndustry}
                </div>
              </div>
              <hr className="text-[#64666C]" />
              <div className="flex justify-between">
                <h3 className=" text-sm mb-1 text-[#64666C]">Company size</h3>
                <div className="text-white text-sm">
                  {job.employer?.companySize}
                </div>
              </div>
              <hr className="text-[#64666C]" />
              <div className="flex justify-between">
                <h3 className=" text-sm mb-1 text-[#64666C]">Headquarters</h3>
                <div className="text-white text-sm">
                  {job.employer?.location}
                </div>
              </div>
              <hr className="text-[#64666C]" />
              <div className="flex justify-between">
                <h3 className=" text-sm mb-1 text-[#64666C]">Founded</h3>
                <div className="text-white text-sm">
                  {job.employer?.foundedYear}
                </div>
              </div>
              <hr className="text-[#64666C]" />
              <div className="flex justify-between">
                <h3 className="text-muted-foreground text-[1rem] ">Socials:</h3>
                <div className="flex gap-1">
                  {[Facebook, Linkedin, Twitter, Instagram, Youtube].map(
                    (Icon, idx) => (
                      <button
                        key={idx}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#262C36] hover:bg-[#202630] transition-colors"
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </button>
                    ),
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
  );
};

export default TalentJobDetails;
