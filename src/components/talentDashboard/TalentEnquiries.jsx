
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  Archive,
  Check,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useTalentSubscription } from "../hooks/useTalentSubscription";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import { browserSessions } from "../utils/requestSafety";
import { API_BASE_URL } from "../utils/api";

const FILTERS = [
  { value: "all", label: "All Enquiries" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatDate = value => {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const TalentEnquiries = () => {
  const { user } = useAuth();
  const entitlement = useTalentSubscription();

  const {
    loading: entitlementLoading,
    error: entitlementError,
    refresh: refreshEntitlement,
  } = entitlement;

  const actor =
    user?.userType === "talent"
      ? `talent:${user.id || user._id}`
      : null;

  const token = actor
    ? browserSessions().find(
        session => session.actor === actor
      )?.token
    : null;

  const paid = hasTalentPublicAccess(entitlement);

  const [filter, setFilter] = useState("all");
  const [enquiries, setEnquiries] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const sessionIsCurrent = useCallback(
    () =>
      Boolean(token) &&
      browserSessions().some(
        session =>
          session.actor === actor &&
          session.token === token
      ),
    [actor, token]
  );

  const loadEnquiries = useCallback(
    async (signal) => {
      if (!token || !paid || !sessionIsCurrent()) return;

      const { data } = await axios.get(
        `${API_BASE_URL}/api/talents/portfolio-enquiries`,
        {
          params: {
            limit: 20,
            status: filter,
          },
          signal,
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        signal.aborted ||
        !sessionIsCurrent()
      ) return;

      if (
        data?.success !== true ||
        !Array.isArray(data.enquiries) ||
        !data.pagination
      ) {
        throw new Error("Invalid enquiry response.");
      }

      setEnquiries(data.enquiries);
      setUnreadCount(
        Number.isFinite(data.unreadCount)
          ? data.unreadCount
          : 0
      );
      setNextCursor(data.pagination.nextCursor || null);
      setHasMore(data.pagination.hasMore === true);
    },
    [token, paid, filter, sessionIsCurrent]
  );

  useEffect(() => {
    if (entitlementLoading) return;

    if (entitlementError || !paid || !token) {
      setEnquiries([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        await loadEnquiries(controller.signal);
      } catch (err) {
        if (
          !cancelled &&
          err.code !== "ERR_CANCELED" &&
          sessionIsCurrent()
        ) {
          setError(
            getErrorMessage(
              err,
              "Unable to load your enquiries. Please try again."
            )
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    entitlementLoading,
    entitlementError,
    paid,
    token,
    filter,
    refreshVersion,
    loadEnquiries,
    sessionIsCurrent,
  ]);

  const loadMore = async () => {
    if (
      !nextCursor ||
      !hasMore ||
      loadingMore ||
      !token ||
      !sessionIsCurrent()
    ) return;

    const controller = new AbortController();

    setLoadingMore(true);
    setError("");

    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/talents/portfolio-enquiries`,
        {
          params: {
            limit: 20,
            status: filter,
            before: nextCursor,
          },
          signal: controller.signal,
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!sessionIsCurrent()) return;

      if (
        data?.success !== true ||
        !Array.isArray(data.enquiries) ||
        !data.pagination
      ) {
        throw new Error("Invalid enquiry response.");
      }

      setEnquiries(previous => {
        const existing = new Set(previous.map(item => item._id));

        return [
          ...previous,
          ...data.enquiries.filter(
            item => !existing.has(item._id)
          ),
        ];
      });

      setUnreadCount(
        Number.isFinite(data.unreadCount)
          ? data.unreadCount
          : 0
      );

      setNextCursor(data.pagination.nextCursor || null);
      setHasMore(data.pagination.hasMore === true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load older enquiries."
        )
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const updateStatus = async (enquiry, status) => {
    if (
      updatingId ||
      !token ||
      !sessionIsCurrent()
    ) return;

    setUpdatingId(enquiry._id);
    setError("");

    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/api/talents/portfolio-enquiries/${enquiry._id}`,
        { status },
        {
          timeout: 15000,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!sessionIsCurrent()) return;

      if (data?.success !== true || !data.enquiry) {
        throw new Error("The enquiry update could not be confirmed.");
      }

      // Reload the current filter so counts and pagination stay accurate.
      setRefreshVersion(value => value + 1);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to update this enquiry. Please try again."
        )
      );
    } finally {
      if (sessionIsCurrent()) setUpdatingId("");
    }
  };

  if (entitlementLoading || loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your enquiries...
      </div>
    );
  }

  if (entitlementError) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="text-sm text-red-300">
            {entitlementError}
          </p>

          <button
            type="button"
            onClick={refreshEntitlement}
            className={`${button} mt-4`}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!paid) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-xl border border-white/5 bg-[#1A1A1E] p-6">
          <Inbox className="mb-4 h-9 w-9 text-blue-400" />

          <h2 className="font-semibold text-white">
            Talent Enquiries
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            An active paid Talent subscription is required to
            receive and manage public portfolio enquiries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-blue-600" />

          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Enquiries
          </h1>
        </div>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Manage messages submitted through your public Qnduit portfolio.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-[#1A1A1E] px-4 py-3">
            <p className="text-xs text-gray-500">New enquiries</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {unreadCount}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshVersion(value => value + 1)}
            className={button}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(item => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`min-h-10 rounded-lg border px-4 py-2 text-sm transition-colors ${
              filter === item.value
                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                : "border-white/10 text-gray-400 hover:bg-white/5"
            }`}
          >
            {item.label}
            {item.value === "new" && unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {enquiries.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#1A1A1E] px-5 py-14 text-center">
            <Mail className="mx-auto mb-4 h-9 w-9 text-gray-500" />

            <h2 className="font-medium text-white">
              No enquiries found
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              {filter === "all"
                ? "Enquiries submitted through your public portfolio will appear here."
                : `There are currently no ${filter} enquiries.`}
            </p>
          </div>
        ) : (
          enquiries.map(enquiry => (
            <article
              key={enquiry._id}
              className="rounded-xl border border-white/5 bg-[#1A1A1E] p-5 md:p-6"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words font-semibold text-white">
                      {enquiry.senderName}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        enquiry.status === "new"
                          ? "bg-blue-500/10 text-blue-300"
                          : enquiry.status === "archived"
                            ? "bg-gray-500/10 text-gray-400"
                            : "bg-green-500/10 text-green-300"
                      }`}
                    >
                      {enquiry.status}
                    </span>
                  </div>

                  <a
                    href={`mailto:${enquiry.senderEmail}`}
                    className="mt-2 inline-flex min-h-8 items-center gap-2 break-all text-sm text-blue-400 hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    {enquiry.senderEmail}
                  </a>

                  <p className="mt-2 text-xs text-gray-500">
                    {formatDate(enquiry.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {enquiry.status === "new" ? (
                    <button
                      type="button"
                      disabled={Boolean(updatingId)}
                      onClick={() => updateStatus(enquiry, "read")}
                      className={button}
                    >
                      {updatingId === enquiry._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Mark Read
                    </button>
                  ) : enquiry.status === "read" ? (
                    <button
                      type="button"
                      disabled={Boolean(updatingId)}
                      onClick={() => updateStatus(enquiry, "new")}
                      className={button}
                    >
                      <MailOpen className="h-4 w-4" />
                      Mark New
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(updatingId)}
                      onClick={() => updateStatus(enquiry, "new")}
                      className={button}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                  )}

                  {enquiry.status !== "archived" && (
                    <button
                      type="button"
                      disabled={Boolean(updatingId)}
                      onClick={() => updateStatus(enquiry, "archived")}
                      className={button}
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/5 bg-[#202024] p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-300">
                  {enquiry.message}
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      {hasMore && enquiries.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={button}
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loadingMore ? "Loading..." : "Load Older Enquiries"}
          </button>
        </div>
      )}
    </div>
  );
};

export default TalentEnquiries;
