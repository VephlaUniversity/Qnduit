import React, { useEffect, useState } from "react";
import { MapPin, Clock } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { applicationStatusLabel } from "../utils/applicationStatus";
import JobImage from "../jobs/JobImage";
import { useSearchParams } from "react-router-dom";
import { readApplicantSearch, writeApplicantSearch } from "../employerDashboard/applicantSearch";

const RecentApplication = ({ pageSize } = {}) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [params, setParams] = useSearchParams();
  const { page: requestedPage } = readApplicantSearch(params);
  const totalPages = pageSize ? Math.max(1, Math.ceil(applications.length / pageSize)) : 1;
  const page = Math.min(requestedPage, totalPages);

  useEffect(() => {
    if (pageSize && !loading && !error && requestedPage !== page) {
      setParams(previous => writeApplicantSearch(previous, {
        ...readApplicantSearch(previous), page,
      }), { replace: true });
    }
  }, [pageSize, loading, error, requestedPage, page, setParams]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE_URL}/api/applications/my-applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const formatted = (res.data.applications || []).map((app) => ({
          id: `${app.source || "employer"}:${app._id}`,
          job: { ...app.jobId, source: app.source || "employer" },
          title: app.jobId?.jobTitle || "Unknown Role",
          location: app.jobId?.location || "N/A",
          category: app.jobId?.category || "General",
          status: app.status,
          statusColor: getStatusColor(app.status),
          dateApplied: new Date(app.createdAt).toLocaleDateString(),
        }));

        setApplications(formatted);
      } catch (error) {
        console.error("Failed to fetch applications", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "reviewed":
      case "shortlisted":
      case "hired":
        return "bg-green-600/20 text-green-400";
      case "pending":
        return "bg-yellow-600/20 text-yellow-400";
      case "rejected":
        return "bg-red-600/20 text-red-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  const visibleApplications = pageSize
    ? applications.slice((page - 1) * pageSize, page * pageSize) : applications;
  const changePage = next => setParams(previous => writeApplicantSearch(previous, {
    ...readApplicantSearch(previous), page: next,
  }));

  return (
    <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
      <h2 className="text-xl font-semibold text-white mb-6">
        Job Applied Recently
      </h2>
      <div className="overflow-x-auto thin-scroll">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                JOBS
              </th>
              <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                STATUS
              </th>
              <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                DATE APPLIED
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 px-4 text-center text-gray-400"
                  role="status"
                >
                  Loading applications…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 px-4 text-center text-red-400"
                  role="alert"
                >
                  Unable to load your applications.
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 px-4 text-center text-gray-400">
                  You haven't applied for any jobs yet.
                </td>
              </tr>
            ) : null}
            {!loading &&
              !error &&
              visibleApplications.map((app, index) => (
                <tr
                  key={app.id || index}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <JobImage job={app.job} className="w-16 h-16 rounded-lg bg-gray-600" />
                      <div>
                        <p className="text-white font-semibold text-base mb-1">
                          {app.title}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {app.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {app.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${app.statusColor}`}
                    >
                      {applicationStatusLabel(app.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-300 text-base">
                    {app.dateApplied}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {pageSize && <div
        className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-gray-400"
        aria-label="Applications pagination"
      >
        <span aria-live="polite">
          {!loading && !error ? `Page ${page} of ${totalPages} · ${applications.length} applications` : ""}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => changePage(page - 1)}
            disabled={loading || error || page <= 1}
            className="px-3 py-2 rounded border border-white/20 focus-visible:outline focus-visible:outline-blue-500 disabled:opacity-50">
            Previous
          </button>
          <button type="button" onClick={() => changePage(page + 1)}
            disabled={loading || error || page >= totalPages}
            className="px-3 py-2 rounded border border-white/20 focus-visible:outline focus-visible:outline-blue-500 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>}
    </div>
  );
};

export default RecentApplication;
