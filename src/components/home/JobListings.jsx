import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import { formatSalary, jobPath, jobKey } from "../utils/jobDisplay";
import { friendlyError } from "../utils/userMessage";
import JobImage from "../jobs/JobImage";

const MAX_JOBS = 6;

const stripHtml = (value) =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

export const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchJobs = async () => {
      setLoading(true);
      setError("");
      try {
        // Open jobs, newest first (boosted plans first) - same source as the job search.
        const res = await axios.get(`${API_BASE_URL}/api/jobs/search`, {
          signal: controller.signal,
        });
        setJobs(
          Array.isArray(res.data?.jobs) ? res.data.jobs.slice(0, MAX_JOBS) : [],
        );
      } catch (err) {
        if (axios.isCancel(err) || err?.code === "ERR_CANCELED") return;
        setError(
          friendlyError(err, "We couldn't load the latest jobs right now."),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchJobs();
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <section
      id="search-jobs"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-10 bg-[#0A0F17] rounded-3xl mt-10"
    >
      <h2 className="text-4xl lg:text-5xl  text-center mb-12">
        Latest Jobs of the Week
      </h2>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading jobs...</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-center text-gray-400 py-12">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="border border-gray-600 text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <p className="text-center text-gray-400 py-12">
          No open jobs right now. Please check back soon.
        </p>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {jobs.map((job) => (
            <div
              key={jobKey(job)}
              className="bg-gray-800 rounded-2xl p-6 hover:bg-gray-750 transition-colors flex flex-col"
            >
              <JobImage job={job} className="h-12 w-12 rounded-lg bg-gray-700 text-lg font-bold text-white/80 mb-4" />

              <h3 className="text-xl font-semibold mb-1">{job.jobTitle}</h3>
              {job.employer?.companyName && (
                <p className="text-gray-300 text-sm mb-1">
                  {job.employer.companyName}
                </p>
              )}
              <p className="text-gray-400 text-sm mb-4">
                {[job.location, job.workType].filter(Boolean).join(" · ")}
              </p>
              <p className="text-gray-300 text-sm mb-6 line-clamp-3">
                {stripHtml(job.jobDescription)}
              </p>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-sm font-semibold text-gray-100">
                  {formatSalary(job.salary)}
                </span>
                <Link
                  to={jobPath(job)}
                  className="bg-blue-600 text-white text-sm px-3.5 py-1.5 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Apply Now →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <Link
          to="/jobs"
          className="inline-block border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors"
        >
          Show all Jobs →
        </Link>
      </div>
    </section>
  );
};
