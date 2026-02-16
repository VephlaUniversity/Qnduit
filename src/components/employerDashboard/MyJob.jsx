import React, { useState, useEffect, useMemo } from "react";
import { Search, Edit, Trash2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const MyJob = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [jobs, setJobs] = useState([]);

  useEffect(() => {

    const fetchJobs = async () => {
      try {

        const res = await fetch(
          `${API_BASE_URL}/api/jobs/my-jobs`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        const data = await res.json();

        if (data.success) {
          setJobs(data.jobs);
        }

      } catch (error) {
        console.log(error);
      }
    };

    fetchJobs();

  }, []);


  const deleteJob = async (id) => {
    try {

      await axios.delete(
        `${API_BASE_URL}/api/jobs/delete/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      setJobs(prev => prev.filter(job => job._id !== id));

    } catch (error) {
      console.log(error);
    }
  };


  const editJob = (job) => {
    navigate(`/dashboard/submit-job?edit=${job._id}`);
  };

  const filteredAndSorted = useMemo(() => {
    let result = jobs.filter(
      (job) =>
        job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.category.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    switch (sortBy) {
      case "newest":
        result = [...result].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        break;

      case "oldest":
        result = [...result].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        break;
      case "applicants":
        result = [...result].sort((a, b) => b.applicants - a.applicants);
        break;
      default:
        break;
    }
    return result;
  }, [jobs, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          My Job
        </h1>
      </div>

      {/* Search and Filter */}
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, location, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0E0E10] border border-white/10 text-white rounded-lg pl-10 pr-4 py-3 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto bg-[#0E0E10] border border-white/10 text-white rounded-lg px-4 py-3 pr-10 focus:border-blue-600 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="default">Sort by (Default)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="applicants">Most Applicants</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-[#0E0E10]">
                <th className="text-left text-gray-400 text-sm font-medium p-4 whitespace-nowrap">
                  MY JOBS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium p-4 whitespace-nowrap">
                  APPLICANTS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium p-4 whitespace-nowrap">
                  CREATED & EXPIRY
                </th>
                <th className="text-left text-gray-400 text-sm font-medium p-4 whitespace-nowrap">
                  STATUS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium p-4 whitespace-nowrap">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    {jobs.length === 0 ? (
                      <div>
                        <p className="mb-3">No jobs posted yet.</p>
                        <button
                          onClick={() => navigate("/dashboard/submit-job")}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                          Submit Your First Job
                        </button>
                      </div>
                    ) : (
                      "No jobs match your search."
                    )}
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((job) => (
                  <tr
                    key={job._id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">
                          {job.jobTitle}
                        </h3>
                        {job.verified && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location || job.address || "N/A"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="text-white">
                        {job.applicants} Applicants
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-white text-sm">
                        Created: {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Expiry: {job.deadlineDate || "N/A"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="text-green-500 text-sm font-medium">
                        {job.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => editJob(job)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                          title="Edit Job"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteJob(job._id)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                          title="Delete Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyJob;
