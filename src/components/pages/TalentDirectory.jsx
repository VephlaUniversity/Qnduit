import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
  UserRound,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import { friendlyError } from "../utils/userMessage";
import { COUNTRIES } from "../data/countries";

const PAGE_SIZE = 12;

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
  const urlQuery = searchParams.get("q") || "";
  const country = searchParams.get("country") || "";
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
  }, [urlQuery, country, page, reloadKey]);

  const hasFilters = Boolean(urlQuery || country);

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <section className="px-6 py-12 border-b border-[#1A1F2E]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Browse Talents
          </h1>
          <p className="text-gray-400 mb-8 max-w-2xl">
            Discover talented individuals from around the world. Search by name,
            role or skill, filter by country, and open a profile to see their
            work and experience.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Search by name, role or skill"
                aria-label="Search talents"
                maxLength={60}
                className="w-full pl-12 pr-4 py-3 bg-[#1A1F2E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={country}
              onChange={(e) =>
                updateParams({ country: e.target.value, page: "" })
              }
              aria-label="Filter by country"
              className="md:w-64 px-4 py-3 bg-[#1A1F2E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All countries</option>
              {COUNTRIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="max-w-7xl mx-auto">
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
                  onClick={() => {
                    setQueryInput("");
                    setSearchParams({}, { replace: true });
                  }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.talents.map((talent) => (
                  <article
                    key={talent.username}
                    className="bg-[#1A1F2E] rounded-2xl p-6 border border-white/5 flex flex-col"
                  >
                    <div className="flex items-center gap-4 mb-4 min-w-0">
                      <TalentAvatar src={talent.avatar} name={talent.name} />
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate">
                          {talent.name}
                        </h2>
                        {talent.jobTitle && (
                          <p className="text-blue-400 text-sm truncate">
                            {talent.jobTitle}
                          </p>
                        )}
                      </div>
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
      </section>
    </div>
  );
};

export default TalentDirectory;
