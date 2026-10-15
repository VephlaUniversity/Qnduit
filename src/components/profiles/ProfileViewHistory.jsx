import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProfileAvatar from "./ProfileAvatar";
import { profileRequest } from "./profileApi";

export default function ProfileViewHistory() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const dashboard = pathname.startsWith("/talent-dashboard/")
    ? "/talent-dashboard"
    : "/dashboard";
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const userId = user?.id || user?._id;
  const userType = user?.userType;
  useEffect(() => {
    if (!userId || !["talent", "employer"].includes(userType)) return;
    const controller = new AbortController();
    setResult(null);
    setError(null);
    profileRequest(
      `/api/profiles/${userType}/${encodeURIComponent(userId)}/views?page=${page}&limit=20`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      });
    return () => controller.abort();
  }, [page, reload, userId, userType]);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Who viewed my profile</h1>
      <p className="mt-3 mb-6 text-sm text-gray-400">
        One recorded visit per viewer per UTC calendar day. Self-views are
        excluded. This is your private history.
      </p>
      {!userId || !["talent", "employer"].includes(userType) ? (
        <p role="alert">Sign in to view your profile history.</p>
      ) : error ? (
        <div role="alert">
          <p>
            {[401, 403].includes(error.status)
              ? "You are not authorized to view this history."
              : error.message}
          </p>
          {error.status === 401 ? (
            <Link to="/signin" className="text-blue-400 underline">
              Sign in
            </Link>
          ) : (
            ![403, 404].includes(error.status) && (
              <button
                className="min-h-[44px] text-blue-400 underline"
                onClick={() => setReload((value) => value + 1)}
              >
                Try again
              </button>
            )
          )}
        </div>
      ) : !result ? (
        <p role="status">Loading profile views…</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-400">
            {result.pagination.total} recorded visits
          </p>
          {result.views.length === 0 ? (
            <p className="rounded-lg border border-white/10 p-6">
              {page === 1
                ? "No one has viewed your profile yet."
                : "No visits on this page."}
            </p>
          ) : (
            <ul className="space-y-4">
              {result.views.map((view) => (
                <li
                  key={view.id}
                  className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#1A1A1E] p-4 sm:flex-row sm:items-center"
                >
                  <ProfileAvatar
                    image={view.viewer.imageUrl}
                    name={view.viewer.name}
                  />
                  <div className="min-w-0 flex-1 break-words">
                    <p>{view.viewer.name}</p>
                    <p className="text-sm text-gray-400">
                      {view.viewer.userType === "talent"
                        ? "Talent"
                        : "Employer"}
                    </p>
                    <time
                      className="text-sm text-gray-400"
                      dateTime={view.viewedAt}
                    >
                      {new Date(view.viewedAt).toLocaleString()}
                    </time>
                  </div>
                  {view.viewer.id && (
                    <Link
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-blue-500 px-4 text-blue-400 focus-visible:outline focus-visible:outline-2"
                      to={`${dashboard}/users/${view.viewer.userType}/${view.viewer.id}`}
                    >
                      View Profile
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <nav
            aria-label="Profile views pages"
            className="mt-6 flex items-center gap-4"
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="min-h-[44px] text-blue-400 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, result.pagination.totalPages)}
            </span>
            <button
              disabled={page >= result.pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="min-h-[44px] text-blue-400 disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
