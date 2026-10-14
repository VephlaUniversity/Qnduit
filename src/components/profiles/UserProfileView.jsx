import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, UserRound } from "lucide-react";
import { candidatesData } from "../../data/talentsData";
import { EMPLOYER_DIRECTORY } from "../utils/follows";

// These routes intentionally resolve only existing fixtures. The own-profile
// endpoints are not a source for viewing another account's public details.
export default function UserProfileView() {
  const { userType, userId } = useParams();
  const { pathname, search } = useLocation();
  const dashboard = pathname.startsWith("/talent-dashboard/")
    ? "/talent-dashboard"
    : "/dashboard";
  const directory = userType === "talent"
    ? candidatesData
    : userType === "employer"
      ? EMPLOYER_DIRECTORY
      : [];
  // Compare the complete ID: malformed IDs such as "1abc" must not match 1.
  const profile = directory.find((entry) => String(entry.id) === userId);
  const returnTo = dashboard === "/dashboard" && userType === "talent"
    ? `${dashboard}/talent-results${search}`
    : dashboard === "/talent-dashboard" && userType === "employer"
      ? `${dashboard}/following-employers`
      : dashboard;
  const backLabel = `Back to ${returnTo.includes("talent-results") ? "talent results" : returnTo.includes("following-employers") ? "following employers" : "dashboard"}`;

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
      {!profile ? (
        <section className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-white">Profile not found</h1>
          <p className="mt-3 text-gray-400">
            This profile is unavailable. Check the user type and ID, or return to your dashboard.
          </p>
        </section>
      ) : (
        <>
          <p className="mb-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            Sample profile — this preview uses demonstration data and does not represent a real QNDUIT user account.
          </p>
          <article className="rounded-2xl border border-white/10 bg-[#1A1A1E] p-6 md:p-8 break-words">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400" aria-hidden="true">
                <UserRound className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-sm text-blue-400">{userType === "talent" ? "Talent" : "Employer"} profile</p>
                <h1 className="text-2xl font-semibold text-white md:text-3xl">{profile.name}</h1>
                {(profile.title || profile.category) && (
                  <p className="mt-2 text-gray-300">{profile.title || profile.category}</p>
                )}
                {profile.location && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-gray-400">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>
            <section className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-lg font-semibold text-white">About</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-300">
                {profile.about || "No about information available."}
              </p>
            </section>
            {profile.skills?.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-white">Skills</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <li key={skill} className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300">{skill}</li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        </>
      )}
    </div>
  );
}
