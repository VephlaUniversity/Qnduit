import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Briefcase,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";

const getHeaders = () => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");

  return { Authorization: `Bearer ${token}` };
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getName = (talent) =>
  talent.name ||
  talent.fullName ||
  [talent.firstName, talent.lastName].filter(Boolean).join(" ") ||
  "Talent";

const getAvatar = (talent) =>
  typeof talent.avatar === "object" ? talent.avatar?.url : talent.avatar;

export const Followers = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  const loadFollowers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/follows/talents/followers`,
        {
          headers: getHeaders(),
          params: {
            q: search.trim(),
            page,
            limit: 10,
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to load followers.");
      }

      setRows(response.data.data || []);
      setTotalPages(Math.max(1, response.data.pagination?.totalPages || 1));
    } catch (err) {
      setRows([]);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load followers.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(loadFollowers, 300);
    return () => clearTimeout(timer);
  }, [loadFollowers]);

  const handleFollowToggle = async (talent) => {
    setActionId(talent.id);
    setError("");

    try {
      const url = `${API_BASE_URL}/api/follows/talents/${talent.id}`;

      if (talent.isFollowing) {
        await axios.delete(url, { headers: getHeaders() });
      } else {
        await axios.post(url, {}, { headers: getHeaders() });
      }

      await loadFollowers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update follow status.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Followers
        </h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search followers by name, email, role or location"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full pl-12 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="bg-[#1A1A1E] rounded-lg p-10 text-center text-gray-400">
            Loading followers...
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-12 text-center">
            <p className="text-gray-400">
              {search.trim()
                ? "No followers match your search."
                : "No one is following your company yet."}
            </p>
          </div>
        ) : (
          rows.map((talent) => {
            const name = getName(talent);
            const avatar = getAvatar(talent);
            const skills = [
              ...(Array.isArray(talent.tags) ? talent.tags : []),
              ...(Array.isArray(talent.categories) ? talent.categories : []),
            ];

            return (
              <div
                key={talent.id}
                className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 hover:border-white/10 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0].toUpperCase())
                          .join("")}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg mb-2">
                        {name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                        {talent.jobTitle && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{talent.jobTitle}</span>
                          </div>
                        )}

                        {talent.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{talent.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Followed {formatDate(talent.followedAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[...new Set(skills)].slice(0, 8).map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-md bg-[#2A2A2E] text-gray-300 text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-blue-500 px-4 text-sm text-blue-400"
                      to={`/dashboard/users/talent/${encodeURIComponent(talent.id)}?from=followers`}
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => navigate("/dashboard/messages")}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2E] hover:bg-white/10 text-white rounded-lg font-medium text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>

                    <button
                      disabled={actionId === talent.id}
                      onClick={() => handleFollowToggle(talent)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                    >
                      {actionId === talent.id
                        ? "Please wait..."
                        : talent.isFollowing
                          ? "Unfollow"
                          : "Follow"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="px-4 py-2 rounded-lg bg-[#2A2A2E] text-white disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="px-4 py-2 rounded-lg bg-[#2A2A2E] text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Followers;
