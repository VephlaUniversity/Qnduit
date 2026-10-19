import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Search, Eye, MessageSquare, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { messageRecipientUrl } from "../utils/messageRecipient";
import { API_BASE_URL } from "../utils/api";
import { profileImageUrl } from "../profiles/profileApi";

const SavedCandidateAvatar = ({ name, imageUrl }) => {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-white" aria-label={name}>
      {imageUrl && !failed
        ? <img src={imageUrl} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        : <span aria-hidden="true">{initials}</span>}
    </div>
  );
};

export const SavedCandidates = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const owner = user ? `${user.userType}:${user.id || user._id}` : "";
  const scope = JSON.stringify([owner, token]);
  const session = useRef(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [result, setResult] = useState({ scope: "", status: "loading", rows: [] });
  // Render-time gating prevents even one frame of another account's rows.
  const current = result.scope === scope;
  const status = current ? result.status : "loading";
  const candidates = current && status === "ready" ? result.rows : [];

  useLayoutEffect(() => {
    if (session.current?.scope !== scope) session.current?.controller.abort();
  }, [scope]);

  useEffect(() => {
    const controller = new AbortController();
    const request = { scope, controller };
    session.current = request;
    const active = () => !controller.signal.aborted && session.current === request && localStorage.getItem("token") === token;
    setResult({ scope, status: "loading", rows: [] });
    const invalidate = event => {
      if (event.key !== null && event.key !== "token" && event.key !== "user") return;
      if (event.key === "token" && event.newValue === token) return;
      if (event.key === "user" && event.newValue) {
        try { const stored = JSON.parse(event.newValue); if (`${stored.userType}:${stored.id || stored._id}` === owner) return; } catch { /* Invalid account storage invalidates these rows. */ }
      }
      controller.abort();
      setResult({ scope, status: "error", rows: [], error: "Session changed. Please sign in again." });
    };
    window.addEventListener("storage", invalidate);
    const fetchSavedCandidates = async () => {
      try {
        if (!token || !owner.startsWith("employer:")) {
          setResult({ scope, status: "error", rows: [], error: "Sign in as an Employer to view saved candidates." });
          return;
        }
        const res = await axios.get(
          `${API_BASE_URL}/api/employers/saved-candidates`,
          { signal: controller.signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` } }
        );

        if (!active()) return;
        if (!Array.isArray(res.data.savedCandidates)) throw new Error();
        const formatted = res.data.savedCandidates.map((c) => ({
          id: c._id,
          name: (typeof c.fullName === "string" ? c.fullName.trim() : "") ||
            [c.firstName, c.lastName].filter(value => typeof value === "string" && value.trim()).map(value => value.trim()).join(" ") || "Talent",
          role: typeof c.jobTitle === "string" ? c.jobTitle : "",
          location: c.location || "N/A",
          avatar: profileImageUrl(typeof c.avatar === "string" ? c.avatar : c.avatar?.url),
          cvUrl: c.resume?.url,
          salary: c.offeredSalary != null && String(c.offeredSalary).trim() !== ""
            ? `$${String(c.offeredSalary).trim()}${typeof c.salaryType === "string" && c.salaryType.trim() ? `/${c.salaryType.trim()}` : ""}`
            : "Not specified",
        }));

        if (active()) setResult({ scope, status: "ready", rows: formatted });
      } catch (error) {
        if (active()) setResult({ scope, status: "error", rows: [], error: error.response?.status === 401
          ? "Session expired. Please sign in again." : "Unable to load saved candidates. Refresh to retry." });
      }
    };

    fetchSavedCandidates();
    return () => { controller.abort(); window.removeEventListener("storage", invalidate); };
  }, [scope, token, owner]);

  const handleViewProfile = (candidate) => {
    navigate(`/dashboard/users/talent/${encodeURIComponent(candidate.id)}?from=saved-candidates`);
  };

  const handleMessage = (candidate) => {
    navigate(messageRecipientUrl(candidate.id));
  };

  const handleRemove = async (id, name) => {
    const request = session.current;
    const active = () => request?.scope === scope && session.current === request && !request.controller.signal.aborted && localStorage.getItem("token") === token;
    if (!active()) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/employers/saved-candidates/${id}`, {
        signal: request.controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!active()) return;
      setResult(previous => previous.scope === scope ? { ...previous, rows: previous.rows.filter(c => c.id !== id) } : previous);

      toast({
        title: "Success!",
        description: `${name} removed from saved candidates`,
      });
    } catch {
      if (!active()) return;
      toast({
        title: "Error",
        description: "Failed to remove candidate",
        variant: "destructive",
      });
    }
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
        // No cross-period comparison contract: preserve the existing saved-list order.
        return 0;
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
              {status === "loading" || status === "error" ? (
                <tr><td colSpan={2} className={`py-8 text-center ${status === "error" ? "text-red-400" : "text-gray-400"}`}>
                  <p role={status === "error" ? "alert" : "status"}>{status === "loading" ? "Loading saved candidates…" : result.error}</p>
                </td></tr>
              ) : sortedCandidates.length > 0 ? (
                sortedCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <SavedCandidateAvatar key={`${candidate.id}:${candidate.avatar}`} name={candidate.name} imageUrl={candidate.avatar} />
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
                    {candidates.length === 0
                      ? "No saved candidates"
                      : "No candidates found matching your search"}
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
