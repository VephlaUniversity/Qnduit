import React, { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Briefcase, Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  EMPLOYER_DIRECTORY,
  getFollows,
  isInFollowingTab,
  followEmployer,
  unfollowEmployer,
  subscribeFollows,
} from "../utils/follows";

const SORT_OPTIONS = [
  "(Default)",
  "Name A-Z",
  "Name Z-A",
  "Most Openings",
  "Top Rated",
];

const EmployerCard = ({ employer, actionLabel, actionVariant, onAction }) => (
  <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 hover:border-white/10 transition-colors">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="flex items-start gap-4 flex-1">
        {/* Logo */}
        <div className="w-16 h-16 bg-gray-400 rounded-lg flex-shrink-0"></div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Rating Stars (only for employers we have a rating for) */}
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
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-semibold text-lg">
              {employer.name || "Company Name"}
            </h3>
            {employer.verified && (
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
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

      {/* Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {employer.openings != null && (
          <button className="px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm">
            {employer.openings} job opening{employer.openings !== 1 ? "s" : ""}
          </button>
        )}
        <button
          onClick={onAction}
          className={`px-6 py-2 rounded-lg font-medium transition-colors text-sm ${
            actionVariant === "primary"
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-white hover:bg-gray-100 text-gray-900"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  </div>
);

export const TalentFollowingEmployers = () => {
  const { user } = useAuth();
  const email = user?.email || "guest";

  const [tab, setTab] = useState("following");
  const [follows, setFollows] = useState(() => getFollows(email));
  const [now, setNow] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("(Default)");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");

  // Keep in sync with the store (this tab and other tabs).
  useEffect(() => {
    setFollows(getFollows(email));
    return subscribeFollows(() => setFollows(getFollows(email)));
  }, [email]);

  // Re-check every 30s so an unfollowed employer moves back to Discover once
  // its grace period runs out.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  const entryById = useMemo(
    () => new Map(follows.map((e) => [e.id, e])),
    [follows],
  );

  const followingAll = useMemo(() => {
    const directoryIds = new Set(EMPLOYER_DIRECTORY.map((e) => e.id));

    // Real employers followed from a job's details page (not in the directory),
    // newest follow first.
    const fromJobs = follows
      .filter(
        (e) =>
          !directoryIds.has(e.id) && e.employer && isInFollowingTab(e, now),
      )
      .sort((a, b) => b.followedAt - a.followedAt)
      .map((e) => ({
        id: e.id,
        name: e.employer.name || "Company",
        location: e.employer.location || "",
        category: e.employer.category || "Employer",
        rating: null,
        openings: null,
        verified: false,
        isFollowing: e.unfollowedAt == null,
      }));

    const fromDirectory = EMPLOYER_DIRECTORY.filter((emp) =>
      isInFollowingTab(entryById.get(emp.id), now),
    ).map((emp) => ({
      ...emp,
      isFollowing: entryById.get(emp.id).unfollowedAt == null,
    }));

    return [...fromJobs, ...fromDirectory];
  }, [follows, entryById, now]);

  const discoverAll = useMemo(
    () =>
      EMPLOYER_DIRECTORY.filter(
        (emp) => !isInFollowingTab(entryById.get(emp.id), now),
      ),
    [entryById, now],
  );

  const categories = useMemo(
    () => ["All", ...[...new Set(discoverAll.map((e) => e.category))].sort()],
    [discoverAll],
  );
  const activeCategory = categories.includes(category) ? category : "All";

  const source = tab === "following" ? followingAll : discoverAll;

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = source.filter((employer) => {
      const matchesQuery =
        !query ||
        employer.name.toLowerCase().includes(query) ||
        (employer.location || "").toLowerCase().includes(query) ||
        employer.category.toLowerCase().includes(query);
      const matchesCategory =
        tab !== "discover" ||
        activeCategory === "All" ||
        employer.category === activeCategory;
      return matchesQuery && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
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
  }, [source, searchQuery, sortBy, tab, activeCategory]);

  const switchTab = (next) => {
    setTab(next);
    setSearchQuery("");
    setCategory("All");
  };

  const handleToggle = (employer) => {
    if (employer.isFollowing) unfollowEmployer(email, employer.id);
    else followEmployer(email, employer.id);
  };

  const handleFollowNew = (employer) => {
    followEmployer(email, employer.id);
    setNotice(`You're now following ${employer.name}`);
  };

  const tabClass = (name) =>
    `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      tab === name
        ? "border-blue-500 text-white"
        : "border-transparent text-gray-400 hover:text-white"
    }`;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Following Employers
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 mb-6">
        <button
          onClick={() => switchTab("following")}
          className={tabClass("following")}
        >
          Following{" "}
          <span className="text-gray-500">
            ({followingAll.filter((e) => e.isFollowing).length})
          </span>
        </button>
        <button
          onClick={() => switchTab("discover")}
          className={tabClass("discover")}
        >
          Discover <span className="text-gray-500">({discoverAll.length})</span>
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">{notice}</p>
        </div>
      )}

      {/* Search and Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company name, location, or category"
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
          {SORT_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      {/* Category filter (Discover only) */}
      {tab === "discover" && categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === c
                  ? "bg-blue-600 text-white"
                  : "bg-[#1A1A1E] border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {(tab === "following" || categories.length <= 2) && (
        <div className="mb-2" />
      )}

      {/* Employers List */}
      <div className="space-y-4">
        {visible.length === 0 ? (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-12 text-center">
            {source.length === 0 && tab === "following" ? (
              <>
                <p className="text-gray-400 mb-4">
                  You aren&apos;t following any employers yet.
                </p>
                <button
                  onClick={() => switchTab("discover")}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Discover employers
                </button>
              </>
            ) : source.length === 0 ? (
              <p className="text-gray-400">
                You&apos;re following every employer we have right now.
              </p>
            ) : (
              <p className="text-gray-400">No employers found</p>
            )}
          </div>
        ) : tab === "following" ? (
          visible.map((employer) => (
            <EmployerCard
              key={employer.id}
              employer={employer}
              actionLabel={employer.isFollowing ? "Unfollow" : "Follow"}
              actionVariant={employer.isFollowing ? "primary" : "light"}
              onAction={() => handleToggle(employer)}
            />
          ))
        ) : (
          visible.map((employer) => (
            <EmployerCard
              key={employer.id}
              employer={employer}
              actionLabel="Follow"
              actionVariant="light"
              onAction={() => handleFollowNew(employer)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TalentFollowingEmployers;
