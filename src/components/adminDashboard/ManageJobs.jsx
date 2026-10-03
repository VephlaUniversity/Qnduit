import React, { useEffect, useState } from "react";
import {
  Flag,
  Trash2,
  Zap,
  MapPin,
  X,
  Users,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { Modal } from "./Modal";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const statusStyle = {
  Published: "bg-emerald-600/15 text-emerald-500",
  Draft: "bg-yellow-500/15 text-yellow-500",
  Closed: "bg-red-600/15 text-red-500",
  Expired: "bg-red-600/15 text-red-500",
};

const formatDate = (date) => {
  if (!date) return "Not specified";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not specified";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getJobStatus = (job) => {
  if (job.status === "draft") return "Draft";
  if (job.status === "closed") return "Closed";

  if (
    job.deadlineDate &&
    new Date(job.deadlineDate) < new Date()
  ) {
    return "Expired";
  }

  return "Published";
};

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "applicants-desc", label: "Most applicants" },
  { value: "title-asc", label: "Title (A-Z)" },
];

export const ManageJobs = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
  });

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        sort,
      });

      const res = await axios.get(
        `${API_BASE_URL}/api/admin/jobs?${params}`,
        {
          headers: getAuthHeaders(),
        }
      );

      setJobs(res.data.data || []);
      setPagination(
        res.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (error) {
      console.error("Fetch jobs error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load jobs"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, sort, search]);

  const toggleFlag = async (job) => {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/jobs/${job._id}/flag`,
        {},
        {
          headers: getAuthHeaders(),
        }
      );

      const updatedJob = res.data.data;

      setJobs((prev) =>
        prev.map((item) =>
          item._id === updatedJob._id
            ? { ...item, flagged: updatedJob.flagged }
            : item
        )
      );

      if (activeJob?._id === updatedJob._id) {
        setActiveJob((prev) => ({
          ...prev,
          flagged: updatedJob.flagged,
        }));
      }

      toast.success(
        updatedJob.flagged
          ? `"${job.jobTitle}" flagged for review`
          : `Flag removed from "${job.jobTitle}"`
      );
    } catch (error) {
      console.error("Toggle job flag error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to update job flag"
      );
    }
  };

  const deleteJob = async (job) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${job.jobTitle}"?`
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/jobs/${job._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      toast.success(`"${job.jobTitle}" deleted`);

      if (activeJob?._id === job._id) {
        setActiveJob(null);
      }

      // Refresh the current page and its pagination.
      if (jobs.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        fetchJobs();
      }
    } catch (error) {
      console.error("Delete job error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to delete job"
      );
    }
  };

  const viewJobInfo = async (job) => {
    setActiveJob(job);
    setDetailsLoading(true);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/jobs/${job._id}`,
        {
          headers: getAuthHeaders(),
        }
      );

      setActiveJob(res.data.data);
    } catch (error) {
      console.error("Fetch job details error:", error);

      toast.error(
        error.response?.data?.message ||
          "Failed to load job details"
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const getEmployerName = (employer) => {
    if (!employer) return "Employer unavailable";

    return (
      employer.companyName ||
      employer.displayName ||
      `${employer.firstName || ""} ${
        employer.lastName || ""
      }`.trim() ||
      "Unnamed Employer"
    );
  };

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Manage Jobs
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <ListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by title or location"
          sortOptions={sortOptions}
          sortValue={sort}
          onSortChange={(value) => {
            setSort(value);
            setPage(1);
          }}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-white/5">
                <th className="pb-3 font-medium">Jobs</th>
                <th className="pb-3 font-medium">Applicants</th>
                <th className="pb-3 font-medium">
                  Created &amp; Expiry
                </th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-gray-500 text-sm"
                  >
                    {loading
                      ? "Loading jobs..."
                      : `No jobs match "${search}"`}
                  </td>
                </tr>
              )}

              {jobs.map((job) => {
                const status = getJobStatus(job);

                return (
                  <tr key={job._id}>
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {job.jobTitle || "Untitled job"}
                        </span>

                        {job.featured && (
                          <span className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-3 h-3 text-white fill-white" />
                          </span>
                        )}

                        {job.flagged && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 text-xs">
                            Flagged
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location || "Location not specified"}
                      </div>
                    </td>

                    <td className="py-5 pr-4 text-gray-300 text-sm whitespace-nowrap">
                      {job.applicantsCount || 0} Applicants
                    </td>

                    <td className="py-5 pr-4 text-sm whitespace-nowrap">
                      <div className="text-gray-300">
                        Created: {formatDate(job.createdAt)}
                      </div>

                      <div className="text-gray-500">
                        Expiry date: {formatDate(job.deadlineDate)}
                      </div>
                    </td>

                    <td className="py-5 pr-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          statusStyle[status] ||
                          "bg-gray-600/15 text-gray-400"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title={
                            job.flagged
                              ? "Remove Flag"
                              : "Flag Job"
                          }
                          onClick={() => toggleFlag(job)}
                          className={`w-9 h-9 rounded-sm flex items-center justify-center text-white transition-colors ${
                            job.flagged
                              ? "bg-orange-500 hover:bg-orange-600"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          <Flag className="w-4 h-4" />
                        </button>

                        <button
                          title="Delete Job"
                          onClick={() => deleteJob(job)}
                          className="w-9 h-9 rounded-sm bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => viewJobInfo(job)}
                          className="px-4 py-2 rounded-sm bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
                        >
                          View Job Info
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </div>

      <Modal
        open={!!activeJob}
        onClose={() => setActiveJob(null)}
        maxWidth="max-w-lg"
      >
        {activeJob && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">
                {activeJob.jobTitle || "Untitled job"}
              </h3>

              {activeJob.featured && (
                <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-white fill-white" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-gray-500 text-sm mb-5">
              <MapPin className="w-3.5 h-3.5" />
              {activeJob.location || "Location not specified"}
            </div>

            {detailsLoading ? (
              <p className="text-gray-400 text-sm">
                Loading job details...
              </p>
            ) : (
              <>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      Applicants
                    </span>
                    <span className="text-white font-medium">
                      {activeJob.applicantsCount || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="flex items-center gap-2 text-gray-400">
                      <CalendarClock className="w-4 h-4" />
                      Created
                    </span>
                    <span className="text-white font-medium">
                      {formatDate(activeJob.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="flex items-center gap-2 text-gray-400">
                      <CalendarClock className="w-4 h-4" />
                      Expiry date
                    </span>
                    <span className="text-white font-medium">
                      {formatDate(activeJob.deadlineDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400">
                      Status
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusStyle[getJobStatus(activeJob)] ||
                        "bg-gray-600/15 text-gray-400"
                      }`}
                    >
                      {getJobStatus(activeJob)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400">
                      Employer
                    </span>
                    <span className="text-white font-medium text-right">
                      {getEmployerName(activeJob.employer)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-gray-400">
                      Work type
                    </span>
                    <span className="text-white font-medium">
                      {activeJob.workType || "Not specified"}
                    </span>
                  </div>

                  <div className="border-b border-white/5 pb-3">
                    <p className="text-gray-400 mb-2">
                      Description
                    </p>
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {activeJob.jobDescription ||
                        "No description provided."}
                    </p>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setActiveJob(null)}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2A2A2E] hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageJobs;