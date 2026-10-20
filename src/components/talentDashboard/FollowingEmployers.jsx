import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { friendlyError } from "../utils/userMessage";
import { Link } from "react-router-dom";
import { Search, MapPin, Briefcase, Star } from "lucide-react";
import { API_BASE_URL } from "../utils/api";

const SORT_OPTIONS = [
  "(Default)",
  "Name A-Z",
  "Name Z-A",
  "Most Openings",
  "Top Rated",
];

const getHeaders = () => {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");

  return { Authorization: `Bearer ${token}` };
};

const normalizeEmployer = (employer) => ({
  ...employer,
  id: employer.id || employer._id,
  name:
    employer.name || employer.displayName || employer.companyName || "Company",
  category: Array.isArray(employer.categories)
    ? employer.categories.join(", ")
    : employer.companyIndustry || employer.category || "Employer",
  logo: typeof employer.logo === "object" ? employer.logo?.url : employer.logo,
});

const EmployerCard = ({ employer, onAction, loading }) => (
  <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 hover:border-white/10 transition-colors">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {employer.logo ? (
          <img
            src={employer.logo}
            alt={`${employer.name} logo`}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0">
            {employer.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {employer.rating != null && (
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < employer.rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "fill-gray-600 text-gray-600"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <h3 className="text-white font-semibold text-lg mb-2">
            {employer.name}
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            {employer.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{employer.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              <span>{employer.category}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="inline-flex min-h-[44px] items-center rounded-lg border border-blue-500 px-4 text-blue-400 focus-visible:outline focus-visible:outline-2"
          to={`/talent-dashboard/users/employer/${encodeURIComponent(employer.id)}`}
        >
          View Profile
        </Link>
        <button
          disabled={loading}
          onClick={onAction}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
            employer.isFollowing
              ? "bg-[#2A2A2E] hover:bg-white/10 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading
            ? "Please wait..."
            : employer.isFollowing
              ? "Unfollow"
              : "Follow"}
        </button>
      </div>
    </div>
  </div>
);

export const TalentFollowingEmployers = () => {
  const [tab, setTab] = useState("following");
  const [employers, setEmployers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadEmployers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint =
        tab === "following"
          ? "/api/follows/employers/following"
          : "/api/follows/employers/search";

      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: getHeaders(),
        params: {
          q: searchQuery.trim(),
          page: 1,
          limit: 50,
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to load employers.");
      }

      setEmployers((response.data.data || []).map(normalizeEmployer));
    } catch (err) {
      setError(friendlyError(err, "Unable to load employers."));
      setEmployers([]);
    } finally {
      setLoading(false);
    }
  }, [tab, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(loadEmployers, 300);
    return () => clearTimeout(timer);
  }, [loadEmployers]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        employers.map((employer) => employer.category).filter(Boolean),
      ),
    ],
    [employers],
  );

  const activeCategory = categories.includes(category) ? category : "All";

  const visible = useMemo(() => {
    let rows = employers.filter(
      (employer) =>
        tab !== "discover" ||
        activeCategory === "All" ||
        employer.category === activeCategory,
    );

    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case "Name A-Z":
          return a.name.localeCompare(b.name);
        case "Name Z-A":
          return b.name.localeCompare(a.name);
        case "Most Openings":
          return (b.openings ?? 0) - (a.openings ?? 0);
        case "Top Rated":
          return (b.rating ?? 0) - (a.rating ?? 0);
        default:
          return 0;
      }
    });
  }, [employers, sortBy, tab, activeCategory]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setSearchQuery("");
    setCategory("All");
  };

  const handleFollowToggle = async (employer) => {
    setActionId(employer.id);
    setError("");

    try {
      const url = `${API_BASE_URL}/api/follows/employers/${employer.id}`;

      if (employer.isFollowing) {
        await axios.delete(url, { headers: getHeaders() });
        setNotice(`You unfollowed ${employer.name}.`);
      } else {
        await axios.post(url, {}, { headers: getHeaders() });
        setNotice(`You are now following ${employer.name}.`);
      }

      await loadEmployers();
    } catch (err) {
      setError(friendlyError(err, "Unable to update follow status."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Following Employers
        </h1>
      </div>

      <div className="flex gap-2 border-b border-white/10 mb-6">
        <button
          onClick={() => switchTab("following")}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            tab === "following"
              ? "border-blue-500 text-white"
              : "border-transparent text-gray-400"
          }`}
        >
          Following
        </button>
        <button
          onClick={() => switchTab("discover")}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            tab === "discover"
              ? "border-blue-500 text-white"
              : "border-transparent text-gray-400"
          }`}
        >
          Discover Employers
        </button>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by company name, email, location or category"
            className="w-full pl-12 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="px-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {tab === "discover" && categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`px-3 py-1.5 rounded-full text-xs ${
                activeCategory === item
                  ? "bg-blue-600 text-white"
                  : "bg-[#1A1A1E] border border-white/10 text-gray-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-400 py-8 text-center">Loading employers...</p>
        ) : visible.length === 0 ? (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-12 text-center text-gray-400">
            {tab === "following"
              ? "You are not following any employers matching this search."
              : "No employers match your search."}
          </div>
        ) : (
          visible.map((employer) => (
            <EmployerCard
              key={employer.id}
              employer={employer}
              loading={actionId === employer.id}
              onAction={() => handleFollowToggle(employer)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TalentFollowingEmployers;
