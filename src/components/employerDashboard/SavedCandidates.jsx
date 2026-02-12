import React, { useState, useEffect } from "react";
import { Search, Eye, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "../hooks/useToast";

export const SavedCandidates = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [candidates, setCandidates] = useState([]);

  // Load saved candidates from localStorage on mount
  useEffect(() => {
    const loadSavedCandidates = () => {
      const saved = JSON.parse(localStorage.getItem("savedCandidates") || "[]");
      setCandidates(saved);
    };

    loadSavedCandidates();

    // Listen for storage changes (when RecentApplication adds a candidate)
    const handleStorageChange = () => {
      loadSavedCandidates();
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-tab updates
    window.addEventListener("savedCandidatesUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("savedCandidatesUpdated", handleStorageChange);
    };
  }, []);

  const handleViewProfile = (candidate) => {
    toast({
      title: "Profile Viewer",
      description: `Viewing ${candidate.name}'s profile`,
    });
  };

  const handleMessage = (candidate) => {
    toast({
      title: "Message",
      description: `Opening chat with ${candidate.name}`,
    });
  };

  const handleRemove = (id, name) => {
    const updatedCandidates = candidates.filter((c) => c.id !== id);
    setCandidates(updatedCandidates);

    // Update localStorage
    localStorage.setItem("savedCandidates", JSON.stringify(updatedCandidates));

    // Trigger custom event for real-time sync
    window.dispatchEvent(new Event("savedCandidatesUpdated"));

    toast({
      title: "Success!",
      description: `${name} removed from saved candidates`,
    });
  };

  // Filter by search query
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "role":
        return a.role.localeCompare(b.role);
      case "salary":
        return b.salaryValue - a.salaryValue; // Descending order
      default:
        return 0; // Default order
    }
  });

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
            placeholder="Search by name, role, or location..."
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
              {sortedCandidates.length > 0 ? (
                sortedCandidates.map((candidate) => (
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
                        <button
                          onClick={() => handleViewProfile(candidate)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMessage(candidate)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                          title="Send Message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleRemove(candidate.id, candidate.name)
                          }
                          className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-gray-400">
                    {searchQuery
                      ? "No candidates found matching your search"
                      : "No saved candidates"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SavedCandidates;
