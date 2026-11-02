import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, BriefcaseBusiness } from "lucide-react";
import JobImage from "../jobs/JobImage";
import JobApplyAction from "../jobs/JobApplyAction";
import { formatPosted, jobKey, talentJobPath } from "../utils/jobDisplay";
import { profileRequest } from "./profileApi";

export default function EmployerRecentJobs({ employerId }) {
  const [snapshot, setSnapshot] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null);
    async function load() {
      try {
        const data = await profileRequest(
          `/api/profiles/employer/${encodeURIComponent(employerId)}/jobs`,
          { signal: controller.signal },
        );
        if (!Array.isArray(data.jobs)) throw new Error("Invalid jobs response");
        if (!controller.signal.aborted) setSnapshot({ employerId, jobs: data.jobs });
      } catch (error) {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          setSnapshot({ employerId, error: true });
        }
      }
    }
    load();
    return () => controller.abort();
  }, [employerId, attempt]);

  // Identity-keyed rendering also hides the previous result before effects run.
  const current = snapshot?.employerId === employerId ? snapshot : null;
  return (
    <section aria-labelledby="employer-recent-jobs-heading" className="mt-6 rounded-2xl border border-white/10 bg-[#1A1A1E] p-6 md:p-8">
      <h2 id="employer-recent-jobs-heading" className="text-xl font-semibold md:text-2xl">Recent Job Postings</h2>
      {!current ? (
        <p role="status" className="mt-4 text-gray-400">Loading recent job postings…</p>
      ) : current.error ? (
        <div role="alert" className="mt-4">
          <p className="text-gray-400">We couldn’t load this employer’s job postings. Please try again.</p>
          <button type="button" onClick={() => { setSnapshot(null); setAttempt(value => value + 1); }}
            className="mt-3 min-h-[44px] rounded-lg border border-blue-500 px-4 text-blue-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            Retry job postings
          </button>
        </div>
      ) : current.jobs.length === 0 ? (
        <p className="mt-4 text-gray-400">This employer has no active job postings.</p>
      ) : (
        <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          {current.jobs.map(job => {
            const details = talentJobPath(job);
            const posted = formatPosted(job.createdAt);
            return (
              <article key={jobKey(job)} className="flex min-w-0 flex-col rounded-xl border border-[#2A3142] bg-[#191D23] p-5">
                <div className="flex items-start gap-3">
                  <JobImage job={job} className="h-12 w-12 rounded-xl bg-white/5" />
                  <h3 className="min-w-0 break-words text-base font-semibold text-white">
                    <Link to={details} className="rounded hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      {job.jobTitle || "Untitled position"}
                    </Link>
                  </h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
                  <span className="inline-flex min-w-0 items-start gap-1.5 break-words">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {job.location || "Location not specified"}
                  </span>
                  <span className="inline-flex items-start gap-1.5">
                    <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {job.workType || "Work type not specified"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  {posted ? <>Posted <time dateTime={job.createdAt}>{posted}</time></> : "Posting date unavailable"}
                </p>
                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap gap-3 border-t border-[#2A3142] pt-4">
                    <Link to={details} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#2A3142] px-4 py-2 text-sm text-gray-200 hover:bg-[#1E232B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      View Details
                    </Link>
                    <JobApplyAction job={job} internalHref={details} internalLabel="Apply"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-center text-sm text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
