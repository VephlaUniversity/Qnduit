import { talentJobPath, jobKey } from "../utils/jobDisplay";
import React, { useState, useEffect } from "react";
import { Search, MapPin, Calendar, MoreVertical, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import axios from "axios";
import dayjs from "dayjs";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import JobImage from "../jobs/JobImage";

export const TalentSavedJobs = () => {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSavedJobs = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await axios.get(`${API_BASE_URL}/api/saved-jobs`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (cancelled) return;

        const jobs = (res.data?.jobs || []).map((job) => {
          const category = job.category || "";
          return {
            // The API returns `id`; older responses used `_id`.
            id: job.id || job._id,
            source: job.source || "employer",
            applicationType: job.applicationType ?? "internal", applicationUrl: job.applicationUrl || "",
            status: job.status, isDeleted: job.isDeleted, deadlineDate: job.deadlineDate,
            title: job.title || "Untitled job",
            company: job.company || "",
            featuredImage: job.featuredImage,
            gallery: job.gallery,
            employer: job.employer,
            category,
            categoryColor:
              category === "Full Time"
                ? "text-blue-500"
                : category === "Part-time"
                  ? "text-green-500"
                  : category === "Contract"
                    ? "text-red-500"
                    : "text-yellow-500",
            postedAt: job.datePost,
            datePost: job.datePost
              ? dayjs(job.datePost).format("MMMM D, YYYY")
              : "",
          };
        });
        setSavedJobs(jobs);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            friendlyError(
              err,
              "We couldn't load your saved jobs. Please try again.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSavedJobs();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Filter jobs based on search query
  const filteredJobs = savedJobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.category.toLowerCase().includes(query)
    );
  });

  // Sort jobs based on selected sort option
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "Date Posted":
        return (
          new Date(b.postedAt || 0).getTime() -
          new Date(a.postedAt || 0).getTime()
        );
      case "Title A-Z":
        return a.title.localeCompare(b.title);
      case "Company":
        return a.company.localeCompare(b.company);
      default:
        return 0;
    }
  });

  // Handle remove job
  const handleRemoveJob = async (job) => {
    const id = jobKey(job);
    setRemovingId(id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/saved-jobs/remove-job`,
        { jobId: job.id, source: job.source },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setSavedJobs((prev) => prev.filter((row) => jobKey(row) !== id));
    } catch (err) {
      toast.error(
        friendlyError(err, "We couldn't remove this job. Please try again."),
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Save Jobs
        </h1>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, company, or category"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 md:w-auto"
        >
          <option>(Default)</option>
          <option>Date Posted</option>
          <option>Title A-Z</option>
          <option>Company</option>
        </select>
      </div>

      {/* Table Header */}
      <div className="hidden md:block bg-[#1A1A1E] rounded-t-lg border border-white/5 px-6 py-4">
        <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 uppercase">
          <div className="col-span-5">JOBS</div>
          <div className="col-span-2">CATEGORY</div>
          <div className="col-span-3">DATE POST</div>
          <div className="col-span-2 text-right">ACTION</div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-[#1A1A1E] rounded-lg md:rounded-b-lg md:rounded-t-none border md:border-t-0 border-white/5">
        {loading ? (
          <div className="px-6 py-12 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading saved jobs...</span>
          </div>
        ) : loadError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 mb-4">{loadError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400">
              {savedJobs.length === 0
                ? "You haven't saved any jobs yet"
                : "No saved jobs match your search"}
            </p>
          </div>
        ) : (
          sortedJobs.map((job, index) => (
            <div
              key={jobKey(job)}
              className={`px-6 py-5 ${
                index !== sortedJobs.length - 1 ? "border-b border-white/5" : ""
              } hover:bg-white/5 transition-colors`}
            >
              <div className="grid grid-cols-2 md:grid-cols-12 gap-4 items-center">
                {/* Job Info */}
                <div className="col-span-2 md:col-span-5 flex items-center gap-4 min-w-0">
                  <JobImage job={job} className="w-14 h-14 bg-gray-400 rounded-lg font-bold text-white/80" />
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold mb-1">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{job.company}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <span className={`font-medium ${job.categoryColor}`}>
                    {job.category}
                  </span>
                </div>

                {/* Date Post */}
                <div className="md:col-span-3">
                  <span className="text-gray-400">{job.datePost}</span>
                </div>

                {/* Action */}
                <div className="col-span-2 md:col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#2A2A2E] border-white/10"
                    >
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(
                            talentJobPath(job),
                          )
                        }
                        className="text-white hover:bg-white/10 cursor-pointer"
                      >
                        View Job
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemoveJob(job)}
                        disabled={removingId === jobKey(job)}
                        className="text-red-400 hover:bg-white/10 cursor-pointer"
                      >
                        {removingId === jobKey(job) ? "Removing..." : "Remove Job"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TalentSavedJobs;
