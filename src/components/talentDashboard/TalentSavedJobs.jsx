import React, { useState, useEffect } from "react";
import { Search, MapPin, Calendar, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import axios from "axios"; 
import dayjs from "dayjs"; 
import { API_BASE_URL } from "../utils/api";

export const TalentSavedJobs = () => {
  const [savedJobs, setSavedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");

  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/saved-jobs`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (res.data.success) {
          const jobs = res.data.jobs.map((job) => ({
            id: job._id,
            title: job.title,
            company: job.company,
            category: job.category,
            categoryColor:
              job.category === "Full Time"
                ? "text-blue-500"
                : job.category === "Part-time"
                ? "text-green-500"
                : job.category === "Contract"
                ? "text-red-500"
                : "text-yellow-500",
            datePost: dayjs(job.datePost).format("MMMM D, YYYY"),
          }));
          setSavedJobs(jobs);
        }
      } catch (err) {
        console.error("Failed to fetch saved jobs:", err);
      }
    };

    fetchSavedJobs();
  }, []);

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
        return new Date(b.datePost).getTime() - new Date(a.datePost).getTime();
      case "Title A-Z":
        return a.title.localeCompare(b.title);
      case "Company":
        return a.company.localeCompare(b.company);
      default:
        return 0;
    }
  });

  // Handle remove job
  const handleRemoveJob = async (id) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/saved-jobs/remove-job`,
        { jobId: id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setSavedJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (err) {
      console.error("Failed to remove job:", err);
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
      <div className="bg-[#1A1A1E] rounded-t-lg border border-white/5 px-6 py-4">
        <div className="grid grid-cols-12 gap-4 text-sm text-gray-400 uppercase">
          <div className="col-span-5">JOBS</div>
          <div className="col-span-2">CATEGORY</div>
          <div className="col-span-3">DATE POST</div>
          <div className="col-span-2 text-right">ACTION</div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-[#1A1A1E] rounded-b-lg border border-t-0 border-white/5">
        {sortedJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400">No saved jobs found</p>
          </div>
        ) : (
          sortedJobs.map((job, index) => (
            <div
              key={job.id}
              className={`px-6 py-5 ${
                index !== sortedJobs.length - 1
                  ? "border-b border-white/5"
                  : ""
              } hover:bg-white/5 transition-colors`}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Job Info */}
                <div className="col-span-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-400 rounded-lg flex-shrink-0"></div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold mb-1">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{job.company}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{job.daysAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="col-span-2">
                  <span className={`font-medium ${job.categoryColor}`}>
                    {job.category}
                  </span>
                </div>

                {/* Date Post */}
                <div className="col-span-3">
                  <span className="text-gray-400">{job.datePost}</span>
                </div>

                {/* Action */}
                <div className="col-span-2 flex justify-end">
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
                      <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer">
                        View Job
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleRemoveJob(job.id)}
                        className="text-red-400 hover:bg-white/10 cursor-pointer"
                      >
                        Remove Job
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