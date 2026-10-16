import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";
import { editorPlainText, profileName, profileRequest } from "./profileApi";

function ProfileContent({ userType, userId }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [viewError, setViewError] = useState("");
  const [viewBusy, setViewBusy] = useState(false);
  const path = `/api/profiles/${encodeURIComponent(userType)}/${encodeURIComponent(userId)}`;

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(null);
    setViewError("");
    async function load() {
      try {
        const data = await profileRequest(path, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setResult(data);
        // Retrieval is read-only. Explicit recording is server-deduplicated,
        // including StrictMode remounts, refreshes, retries and concurrent visits.
        if (!data.isSelf) {
          try {
            await profileRequest(`${path}/views`, {
              method: "POST",
              signal: controller.signal,
            });
          } catch (err) {
            if (err.name !== "AbortError")
              setViewError("Your visit could not be recorded.");
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") setError(err);
      }
    }
    load();
    return () => controller.abort();
  }, [path, reload]);

  const recordAgain = async () => {
    setViewBusy(true);
    try {
      await profileRequest(`${path}/views`, { method: "POST" });
      setViewError("");
    } catch {
      setViewError("Your visit could not be recorded. Please try again.");
    } finally {
      setViewBusy(false);
    }
  };

  const toggleFollow = async () => {
    setFollowBusy(true);
    setActionError("");
    const nextFollowing = !result.isFollowing;
    try {
      await profileRequest(
        `/api/follows/${userType === "employer" ? "employers" : "talents"}/${encodeURIComponent(userId)}`,
        {
          method: nextFollowing ? "POST" : "DELETE",
        },
      );
      setResult((current) => ({
        ...current,
        isFollowing: nextFollowing,
      }));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setFollowBusy(false);
    }
  };

  if (error) {
    const notFound = [400, 404].includes(error.status);
    const unauthorized = [401, 403].includes(error.status);
    return (
      <section
        className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-6"
        role="alert"
      >
        <h1 className="text-2xl font-semibold">
          {notFound
            ? "Profile not found"
            : unauthorized
              ? "Profile access denied"
              : "Unable to load profile"}
        </h1>
        <p className="mt-3 text-gray-400">
          {notFound
            ? "This profile is unavailable. Check the user type and ID."
            : error.message}
        </p>
        {error.status === 401 ? (
          <Link
            to="/signin"
            className="mt-4 inline-block text-blue-400 underline"
          >
            Sign in
          </Link>
        ) : (
          !notFound &&
          !unauthorized && (
            <button
              onClick={() => setReload((value) => value + 1)}
              className="mt-4 min-h-[44px] text-blue-400 underline"
            >
              Try again
            </button>
          )
        )}
      </section>
    );
  }
  if (!result)
    return (
      <p role="status" className="p-6 text-gray-400">
        Loading profile…
      </p>
    );
  const { profile, canFollow, isFollowing } = result;
  const talent = profile.userType === "talent";
  const name = profileName(profile);
  const about = editorPlainText(
    talent
      ? profile.aboutMe
      : profile.accountType === "individual"
        ? profile.aboutYou || profile.aboutCompany
        : profile.aboutCompany,
  );
  const image = talent ? profile.avatar : profile.logo;
  const title = talent ? profile.jobTitle : profile.companyIndustry;

  return (
    <>
      <article className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-6 md:p-8 break-words">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ProfileAvatar key={image} image={image} name={name} />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm text-blue-400">
              {talent ? "Talent" : "Employer"} profile
            </p>
            <h1 className="text-2xl font-semibold md:text-3xl">{name}</h1>
            {title && <p className="mt-2 text-gray-300">{title}</p>}
            {profile.location && (
              <p className="mt-2 flex items-start gap-2 text-sm text-gray-400">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {profile.location}
              </p>
            )}
            {profile.address && (
              <p className="mt-2 text-sm text-gray-400">
                Address: {profile.address}
              </p>
            )}
          </div>
          {canFollow && (
            <button
              disabled={followBusy}
              onClick={toggleFollow}
              aria-pressed={isFollowing}
              className="min-h-[44px] rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2"
            >
              {followBusy
                ? "Please wait…"
                : isFollowing
                  ? "Unfollow"
                  : "Follow"}
            </button>
          )}
        </div>
        {actionError && (
          <p role="alert" className="mt-4 text-red-300">
            {actionError}
          </p>
        )}
        <section className="mt-8 border-t border-white/10 pt-6">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-300">
            {about || "No about information available."}
          </p>
        </section>
        {profile.categories?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Categories</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.categories.map((category) => (
                <li
                  key={category}
                  className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300"
                >
                  {category}
                </li>
              ))}
            </ul>
          </section>
        )}
        {talent && profile.tags?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Tags</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </section>
        )}
        {talent && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Qualification", profile.qualification],
              ["Experience", profile.experienceTime],
              ["Language", profile.language],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-gray-400">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        )}
      </article>
      {viewError && (
        <p role="alert" className="mt-4 text-amber-200">
          {viewError}{" "}
          <button
            disabled={viewBusy}
            onClick={recordAgain}
            className="min-h-[44px] underline disabled:opacity-50"
          >
            {viewBusy ? "Retrying…" : "Retry recording"}
          </button>
        </p>
      )}
    </>
  );
}

export default function UserProfileView() {
  const { userType, userId } = useParams();
  const { pathname, search } = useLocation();
  const dashboard = pathname.startsWith("/talent-dashboard/")
    ? "/talent-dashboard"
    : "/dashboard";
  const params = new URLSearchParams(search);
  // Only named origins resolve to fixed dashboard routes; never use a supplied URL.
  const fromFollowers = dashboard === "/dashboard" && userType === "talent" && params.get("from") === "followers";
  const jobId = params.get("jobId") || "";
  const fromJob = dashboard === "/talent-dashboard" && userType === "employer" &&
    params.get("from") === "job" && /^[a-f\d]{24}$/i.test(jobId);
  const returnTo = fromFollowers
    ? "/dashboard/followers"
    : fromJob
      ? `/talent-dashboard/job-results/details/${jobId}`
      : dashboard === "/dashboard" && userType === "talent"
        ? `${dashboard}/talent-results${search}`
        : dashboard === "/talent-dashboard" && userType === "employer"
          ? `${dashboard}/following-employers`
          : dashboard;
  const backLabel = fromFollowers ? "Back to followers" : fromJob ? "Back to job details" :
    `Back to ${returnTo.includes("talent-results") ? "talent results" : returnTo.includes("following-employers") ? "following employers" : "dashboard"}`;
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
      <Link
        to={returnTo}
        aria-label={backLabel}
        title={backLabel}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center mb-6 rounded-lg text-blue-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Link>
      <ProfileContent
        key={`${userType}:${userId}`}
        userType={userType}
        userId={userId}
      />
    </div>
  );
}
