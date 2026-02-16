import React, { useState } from "react";
import { Search, X } from "lucide-react";

export const CandidateAlerts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const alerts = [
    {
      id: 1,
      title: "UI UX Designer",
      type: "Full Time",
      appliedDate: "All",
      experience: "2 Years",
      careerLevel: "Officer",
      candidatesFound: 21,
      times: "Daily",
    },
    {
      id: 2,
      title: "Graphic Designer",
      type: "Full Time",
      appliedDate: "All",
      experience: "2 Years",
      careerLevel: "Officer",
      candidatesFound: 8,
      times: "weekly",
    },
    {
      id: 3,
      title: "Developer",
      type: "Full Time",
      appliedDate: "All",
      experience: "2 Years",
      careerLevel: "Officer",
      candidatesFound: 12,
      times: "Daily",
    },
    {
      id: 4,
      title: "Developer",
      type: "Full Time",
      appliedDate: "All",
      experience: "2 Years",
      careerLevel: "Officer",
      candidatesFound: 12,
      times: "Daily",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Alerts Candidate
        </h1>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 min-w-[200px]"
        >
          <option value="default">Sort by (Default)</option>
          <option value="title">Sort by Title</option>
          <option value="candidates">Sort by Candidates</option>
          <option value="times">Sort by Times</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Title
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Alert Query
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Number Candidate
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Times
                </th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-6">
                    <p className="text-white font-medium">{alert.title}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>
                        Type: <span className="text-white">{alert.type}</span>
                      </p>
                      <p>
                        Applied Date:{" "}
                        <span className="text-white">{alert.appliedDate}</span>
                      </p>
                      <p>
                        Experience:{" "}
                        <span className="text-white">{alert.experience}</span>
                      </p>
                      <p>
                        Career Level:{" "}
                        <span className="text-white">{alert.careerLevel}</span>
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-white">
                      Candidate found {alert.candidatesFound}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-blue-400 capitalize">
                      {alert.times}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="p-2 hover:bg-white/5 rounded transition-colors">
                      <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
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

export default CandidateAlerts;
