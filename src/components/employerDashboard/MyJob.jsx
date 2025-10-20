import React, { useState } from "react";
import { Search, Edit, Lock, X } from "lucide-react";

export const MyJob = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const jobs = [
    {
      title: "Junior Marketing",
      location: "Tokyo, Japan",
      applicants: 213,
      created: "Oct 18, 2022",
      expiry: "Sept 5, 2023",
      status: "Published",
      verified: true,
    },
    {
      title: "UI UX Designer",
      location: "Tokyo, Japan",
      applicants: 213,
      created: "Oct 18, 2022",
      expiry: "Sept 5, 2023",
      status: "Published",
      verified: true,
    },
    {
      title: "Intern Digital Marketing",
      location: "Tokyo, Japan",
      applicants: 213,
      created: "Oct 18, 2022",
      expiry: "Sept 5, 2023",
      status: "Published",
      verified: false,
    },
    {
      title: "Content Marketing",
      location: "Tokyo, Japan",
      applicants: 213,
      created: "Oct 18, 2022",
      expiry: "Sept 5, 2023",
      status: "Published",
      verified: true,
    },
    {
      title: "Intern Digital Marketing",
      location: "Tokyo, Japan",
      applicants: 213,
      created: "Oct 18, 2022",
      expiry: "Sept 5, 2023",
      status: "Published",
      verified: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
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
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0E0E10] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto bg-[#0E0E10] border border-gray-700 text-white rounded-lg px-4 py-3 pr-10 focus:border-blue-600 focus:outline-none appearance-none cursor-pointer"
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
              {jobs.map((job, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{job.title}</h3>
                      {job.verified && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {job.location}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="text-white">
                      {job.applicants} Applicants
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-white text-sm">
                        Created: {job.created}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Expiry date: {job.expiry}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-green-500 text-sm font-medium">
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <Lock className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium transition-colors">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyJob;
