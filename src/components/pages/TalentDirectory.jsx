import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  Loader2,
  MapPin,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import { COUNTRIES } from "../data/countries";

const PAGE_SIZE = 12;

// Same choices the employer talent search uses
const EXPERIENCE_OPTIONS = ["< 1 year", "1–3 years", "3–5 years", "5+ years"];
const QUALIFICATION_OPTIONS = [
  "Certificate",
  "Bachelor Degree",
  "Master Degree",
  "PhD",
];

const selectClass =
  "w-full px-4 py-2.5 bg-[#0F1419] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500";

const isEmployerUser = () => {
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "null")?.userType ===
      "employer"
    );
  } catch {
    return false;
  }
};

function TalentAvatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500/10 text-blue-400">
      {src && !failed ? (
        <img
          src={src}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound className="h-8 w-8" aria-hidden="true" />
      )}
    </div>
  );
}

export const TalentDirectory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  // Only signed-in employers can save candidates
  const isEmployer = isAuthenticated && isEmployerUser();
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedReady, setSavedReady] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const urlQuery = searchParams.get("q") || "";
  const country = searchParams.get("country") || "";
  const experience = EXPERIENCE_OPTIONS.includes(searchParams.get("experience"))
    ? searchParams.get("experience")
    : "";
  const qualification = QUALIFICATION_OPTIONS.includes(
    searchParams.get("qualification"),
  )
    ? searchParams.get("qualification")
    : "";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

  const [queryInput, setQueryInput] = useState(urlQuery);
  const [data, setData] = useState({ talents: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, String(value));
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  // Wait for the visitor to stop typing before searching.
  useEffect(() => {
    if (queryInput.trim() === urlQuery) return undefined;
    const timer = setTimeout(
      () => updateParams({ q: queryInput.trim(), page: "" }),
      350,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError("");
    axios
      .get(`${API_BASE_URL}/api/talents/public`, {
        params: {
          q: urlQuery || undefined,
          country: country || undefined,
          experience: experience || undefined,
          qualification: qualification || undefined,
          page,
          limit: PAGE_SIZE,
        },
        signal: controller.signal,
      })
      .then(({ data: body }) => {
        if (!current) return;
        setData({
          talents: Array.isArray(body?.talents) ? body.talents : [],
          total: body?.total || 0,
          pages: Math.max(1, body?.pages || 1),
        });
      })
      .catch((err) => {
        if (current && !axios.isCancel?.(err) && err?.code !== "ERR_CANCELED") {
          setError(
            friendlyError(
              err,
              "We couldn't load the talent directory. Please try again.",
            ),
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [urlQuery, country, experience, qualification, page, reloadKey]);

  // Load the employer's saved candidates once
  useEffect(() => {
    if (!isEmployer) {
      setSavedReady(false);
      return undefined;
    }
    const controller = new AbortController();
    axios
      .get(`${API_BASE_URL}/api/employers/saved-candidates`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(({ data: body }) => {
        const list = Array.isArray(body?.savedCandidates)
          ? body.savedCandidates
          : [];
        setSavedIds(new Set(list.map((candidate) => String(candidate._id))));
        setSavedReady(true);
      })
      .catch(() => {
        // If this fails the hearts stay hidden rather than showing wrong states.
        setSavedReady(false);
      });
    return () => controller.abort();
  }, [isEmployer]);

  const toggleSaved = async (talent) => {
    if (!savedReady || savingIds.has(talent.id)) return;
    const unsave = savedIds.has(talent.id);
    setSavingIds((previous) => new Set(previous).add(talent.id));
    try {
      await axios({
        method: unsave ? "delete" : "post",
        url: `${API_BASE_URL}/api/employers/saved-candidates/${encodeURIComponent(talent.id)}`,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSavedIds((previous) => {
        const next = new Set(previous);
        if (unsave) next.delete(talent.id);
        else next.add(talent.id);
        return next;
      });
      toast.success(
        unsave ? "Removed from saved candidates." : "Candidate saved.",
      );
    } catch {
      toast.error("Couldn't update saved candidates. Please try again.");
    } finally {
      setSavingIds((previous) => {
        const next = new Set(previous);
        next.delete(talent.id);
        return next;
      });
    }
  };

  const activeFilterCount = [
    urlQuery,
    country,
    experience,
    qualification,
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;
  const clearFilters = () => {
    setQueryInput("");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <section className="px-6 py-12 border-b border-[#1A1F2E]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Browse Talent</h1>
          <p className="text-gray-400 max-w-2xl">
            Discover talented individuals from around the world. Search by name,
            role or skill, filter by country, and open a profile to see their
            work and experience.
          </p>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
          {/* Filters: always visible on large screens, a toggled panel on phones */}
          <aside className="mb-8 lg:mb-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="talent-filters"
              className="lg:hidden flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#1A1F2E] px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-blue-500 px-2 text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-90" : ""}`}
              />
            </button>

            <div
              id="talent-filters"
              className={`${filtersOpen ? "block" : "hidden"} lg:block mt-3 lg:mt-0 rounded-xl bg-[#1A1F2E] p-6 space-y-6 lg:sticky lg:top-24`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Filters</h2>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <X className="h-3.5 w-3.5" /> Clear all
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="talent-keyword"
                  className="mb-2 block text-sm font-medium"
                >
                  Keyword
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="talent-keyword"
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="Name, role or skill"
                    aria-label="Search talents"
                    maxLength={60}
                    className="w-full rounded-lg border border-white/10 bg-[#0F1419] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="talent-country"
                  className="mb-2 block text-sm font-medium"
                >
                  Location
                </label>
                <select
                  id="talent-country"
                  value={country}
                  onChange={(e) =>
                    updateParams({ country: e.target.value, page: "" })
                  }
                  aria-label="Filter by country"
                  className={selectClass}
                >
                  <option value="">All countries</option>
                  {COUNTRIES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="talent-experience"
                  className="mb-2 block text-sm font-medium"
                >
                  Experience
                </label>
                <select
                  id="talent-experience"
                  value={experience}
                  onChange={(e) =>
                    updateParams({ experience: e.target.value, page: "" })
                  }
                  className={selectClass}
                >
                  <option value="">Any experience</option>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="talent-qualification"
                  className="mb-2 block text-sm font-medium"
                >
                  Qualification
                </label>
                <select
                  id="talent-qualification"
                  value={qualification}
                  onChange={(e) =>
                    updateParams({ qualification: e.target.value, page: "" })
                  }
                  className={selectClass}
                >
                  <option value="">Any qualification</option>
                  {QUALIFICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {loading ? (
              <div className="py-20 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading talents...</span>
              </div>
            ) : error ? (
              <div className="py-20 text-center" role="alert">
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : data.talents.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-white font-medium mb-1">
                  {hasFilters
                    ? "No talents match your search"
                    : "No talents are listed yet"}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  {hasFilters
                    ? "Try a different name, role or country."
                    : "Check back soon."}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-400 text-sm mb-6">
                  {data.total} {data.total === 1 ? "talent" : "talents"} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.talents.map((talent) => (
                    <article
                      key={talent.username}
                      className="bg-[#1A1F2E] rounded-2xl p-6 border border-white/5 flex flex-col"
                    >
                      <div className="flex items-center gap-4 mb-4 min-w-0">
                        <TalentAvatar src={talent.avatar} name={talent.name} />
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-semibold truncate">
                            {talent.name}
                          </h2>
                          {talent.jobTitle && (
                            <p className="text-blue-400 text-sm truncate">
                              {talent.jobTitle}
                            </p>
                          )}
                        </div>
                        {isEmployer && savedReady && talent.id && (
                          <button
                            type="button"
                            onClick={() => toggleSaved(talent)}
                            disabled={savingIds.has(talent.id)}
                            aria-pressed={savedIds.has(talent.id)}
                            aria-label={
                              savedIds.has(talent.id)
                                ? `Remove ${talent.name} from saved candidates`
                                : `Save ${talent.name}`
                            }
                            className="shrink-0 self-start rounded-full p-2 transition-colors hover:bg-white/10 disabled:opacity-50"
                          >
                            <Heart
                              className={`h-5 w-5 ${
                                savedIds.has(talent.id)
                                  ? "fill-red-500 text-red-500"
                                  : "text-gray-400"
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-400 mb-4">
                        {talent.location && (
                          <p className="flex items-center gap-2">
                            <MapPin
                              className="w-4 h-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">{talent.location}</span>
                          </p>
                        )}
                        {talent.experienceTime && (
                          <p className="flex items-center gap-2">
                            <Briefcase
                              className="w-4 h-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {talent.experienceTime}
                            </span>
                          </p>
                        )}
                      </div>

                      {talent.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                          {talent.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-300 max-w-full truncate"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      <Link
                        to={`/${encodeURIComponent(talent.username)}`}
                        className="mt-auto text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        View profile
                      </Link>
                    </article>
                  ))}
                </div>

                {data.pages > 1 && (
                  <nav
                    className="mt-10 flex items-center justify-center gap-4"
                    aria-label="Pagination"
                  >
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() =>
                        updateParams({ page: page - 1 > 1 ? page - 1 : "" })
                      }
                      className="flex items-center gap-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-sm text-gray-400">
                      Page {page} of {data.pages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= data.pages}
                      onClick={() => updateParams({ page: page + 1 })}
                      className="flex items-center gap-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TalentDirectory;
