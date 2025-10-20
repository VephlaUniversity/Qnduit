import React, { useState } from "react";
import { Search, Eye, MessageSquare } from "lucide-react";

export const SavedCandidates = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const candidates = [
    {
      id: 1,
      name: "Arlene McCoy",
      role: "UI UX Designer",
      location: "Tokyo, Japan",
      salary: "$8000/month",
    },
    {
      id: 2,
      name: "Brooklyn Simmons",
      role: "UI UX Designer",
      location: "Tokyo, Japan",
      salary: "$8000/month",
    },
    {
      id: 3,
      name: "Dianne Russell",
      role: "UI UX Designer",
      location: "Tokyo, Japan",
      salary: "$8000/month",
    },
    {
      id: 4,
      name: "Kathryn Murphy",
      role: "UI UX Designer",
      location: "Tokyo, Japan",
      salary: "$8000/month",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Saved Candidates
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
          <option value="name">Sort by Name</option>
          <option value="role">Sort by Role</option>
          <option value="salary">Sort by Salary</option>
        </select>
      </div>

      {/* Candidates Table */}
      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Candidates
                </th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider py-4 px-6">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex-shrink-0"></div>
                      <div>
                        <p className="text-blue-400 text-sm mb-1">
                          {candidate.role}
                        </p>
                        <p className="text-white font-medium">
                          {candidate.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{candidate.location}</span>
                          <span>•</span>
                          <span>{candidate.salary}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors">
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

export default SavedCandidates;
