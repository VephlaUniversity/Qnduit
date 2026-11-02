import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Briefcase, Loader2 } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { talentJobPath } from "../utils/jobDisplay";
import { friendlyError } from "../utils/userMessage";
import { applicationStatusLabel } from "../utils/applicationStatus";
import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration";
import { useAuth } from "../hooks/useAuth";
import JobImage from "../jobs/JobImage";

const control = "min-h-[44px] rounded-lg border border-white/10 bg-[#1A1A1E] px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";
const action = "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-blue-500 px-4 py-2 text-sm text-blue-400 hover:bg-blue-600/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const statusColor = status => ["reviewed", "shortlisted", "hired"].includes(status) ? "text-blue-400"
  : status === "rejected" ? "text-red-400" : status === "pending" ? "text-yellow-400" : "text-gray-400";
const activityTabs = [
  { value: "all", label: "All activity" },
  { value: "internal", label: "Internal applications" },
  { value: "external", label: "External applications" },
];

export const TalentMyApplied = () => {
  const { user } = useAuth();
  const actor = user && `${user.userType}:${user.id || user._id}`;
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const [filters, setFilters] = useState({ q: "", type: "all", source: "all", page: 1 });
  const [search, setSearch] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [reload, setReload] = useState(0);
  const [copyState, setCopyState] = useState(null);
  const { q, type, source, page } = filters;
  const params = new URLSearchParams({ q, type, source, page: String(page), limit: "20" }).toString();
  const key = `${actor}:${token}:${params}`;
  const current = snapshot?.key === key ? snapshot : null;

  useEffect(() => {
    const timer = setTimeout(() => setFilters(value => value.q === search.trim() ? value : { ...value, q: search.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/applications/activity-feed?${params}`, {
          signal: controller.signal, headers: { Authorization: `Bearer ${token}` }, timeout: 20000,
        });
        if (controller.signal.aborted) return;
        if (!data.success || !Array.isArray(data.activities) || !data.pagination) throw new Error("Invalid activity response");
        if (page > Math.max(1, data.pagination.totalPages)) {
          setFilters(value => ({ ...value, page: Math.max(1, data.pagination.totalPages) }));
          return;
        }
        setSnapshot({ key, activities: data.activities, pagination: data.pagination });
      } catch (error) {
        if (!controller.signal.aborted) setSnapshot({ key, error: friendlyError(error, "We couldn’t load your application activity. Please try again.") });
      }
    }
    load();
    return () => controller.abort();
  }, [key, params, page, token, reload]);

  const changeFilter = (field, value) => { setCopyState(null); setFilters(previous => ({ ...previous, [field]: value, page: 1 })); };
  const navigateTabs = (event, index) => {
    const next = event.key === "ArrowRight" ? (index + 1) % activityTabs.length
      : event.key === "ArrowLeft" ? (index + activityTabs.length - 1) % activityTabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? activityTabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    changeFilter("type", activityTabs[next].value);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  };
  const copyDestination = async row => {
    try { await navigator.clipboard.writeText(row.destinationUrl); setCopyState({ id: row.id, message: "Destination copied." }); }
    catch { setCopyState({ id: row.id, message: "Unable to copy the destination. Please try again or use Open recorded destination." }); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3"><div className="h-8 w-1 rounded-full bg-blue-600" /><h1 className="text-2xl font-semibold md:text-3xl">My Applied</h1></div>
        <p className="mt-2 text-sm text-gray-400">Internal applications and recorded external Apply clicks, newest first.</p>
      </header>
      <div role="tablist" aria-label="Application activity type" className="mb-6 flex gap-2 border-b border-white/10">
        {activityTabs.map((tab, index) => <button key={tab.value} type="button" role="tab" id={`activity-tab-${tab.value}`}
          aria-selected={type === tab.value} aria-controls="application-activity-panel" tabIndex={type === tab.value ? 0 : -1}
          onClick={() => changeFilter("type", tab.value)} onKeyDown={event => navigateTabs(event, index)}
          className={`min-h-[44px] min-w-0 flex-1 break-words border-b-2 px-2 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:flex-none sm:px-4 ${
            type === tab.value ? "border-blue-500 text-white" : "border-transparent text-gray-400"
          }`}>{tab.label}</button>)}
      </div>
      <section role="tabpanel" id="application-activity-panel" aria-labelledby={`activity-tab-${type}`}>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" aria-hidden="true" />
          <input aria-label="Search application activity" maxLength={200} placeholder="Search title, company, location or status" value={search}
            onChange={event => setSearch(event.target.value)} className={`${control} w-full pl-12`} />
        </div>
        <select aria-label="Job source" value={source} onChange={event => changeFilter("source", event.target.value)} className={control}>
          <option value="all">All sources</option><option value="employer">Employer jobs</option><option value="admin">Admin jobs</option>
        </select>
        <button type="button" className={control} onClick={() => { setSnapshot(null); setFilters(value => ({ ...value, page: 1 })); setReload(value => value + 1); }}>Refresh activity</button>
      </div>
      {!current ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading your application activity…</p>
        : current.error ? <div role="alert" className="rounded-xl border border-white/10 bg-[#1A1A1E] p-6 text-center">
          <p className="mb-4 text-gray-400">{current.error}</p><button type="button" className={action} onClick={() => { setSnapshot(null); setReload(value => value + 1); }}>Try again</button>
        </div> : <>
          {current.activities.length === 0 ? <p className="rounded-xl border border-white/10 bg-[#1A1A1E] px-6 py-12 text-center text-gray-400">
            {q || type !== "all" || source !== "all" ? "No application activity matches your filters." : "You have no application activity yet."}
          </p> : <div className="space-y-4" aria-label="Application activity">
            {current.activities.map(row => {
              const external = row.kind === "external";
              const display = row.display;
              const destination = external ? jobApplicationConfiguration({ applicationType: "external", applicationUrl: row.destinationUrl }) : null;
              const safeDestination = external && !Object.keys(destination.errors).length && destination.configuration.applicationUrl === row.destinationUrl;
              const recorded = new Date(row.occurredAt);
              return <article key={row.id} data-activity-id={row.id} className="min-w-0 break-words rounded-lg border border-white/5 bg-[#1A1A1E] p-6 transition-colors hover:border-white/10">
                <div className="flex items-start gap-4">
                  <JobImage job={{ jobTitle: display.jobTitle, featuredImage: { url: row.imageUrl }, employer: { companyName: display.companyName } }} className="h-16 w-16 rounded-lg bg-gray-700" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">{display.jobTitle || "Job no longer available"}</h2>
                    {display.companyName && <p className="mt-1 text-sm text-gray-400">{display.companyName}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
                      <span className="inline-flex items-start gap-1"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />{display.location || "Location not specified"}</span>
                      <span className="inline-flex items-start gap-1"><Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />{display.category || "General"}</span>
                      {display.workType && <span>{display.workType}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className={external ? "rounded-full bg-blue-500/10 px-3 py-1 text-blue-300" : statusColor(row.status)}>
                    {external ? "External Application" : applicationStatusLabel(row.status)}
                  </span>
                  <span className="text-gray-400">{row.source === "admin" ? "Admin job" : "Employer job"}</span>
                  <p className="text-gray-400">{external ? "Recorded" : "Applied"}: {Number.isNaN(recorded.getTime()) ? "Date unavailable" : <time dateTime={row.occurredAt}>{recorded.toLocaleString()}</time>}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {row.jobExists ? <Link to={talentJobPath({ _id: row.jobId, source: row.source })} className={action}>View Job</Link>
                    : <p className="self-center text-sm text-gray-500">Job no longer available.</p>}
                  {external && <>
                    {safeDestination && <a href={row.destinationUrl} target="_blank" rel="noopener noreferrer" className={action}>Open recorded destination</a>}
                    <button type="button" onClick={() => copyDestination(row)} className={action}>Copy destination</button>
                  </>}
                </div>
                {copyState?.id === row.id && <p role="status" className="mt-3 text-sm text-gray-400">{copyState.message}</p>}
              </article>;
            })}
          </div>}
          <nav aria-label="Activity pagination" className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button type="button" disabled={page <= 1} onClick={() => setFilters(value => ({ ...value, page: value.page - 1 }))} className={`${action} disabled:cursor-not-allowed disabled:opacity-40`}>Previous</button>
            <p className="text-sm text-gray-400">Page {page} of {Math.max(1, current.pagination.totalPages)} · {current.pagination.total} activities</p>
            <button type="button" disabled={page >= current.pagination.totalPages} onClick={() => setFilters(value => ({ ...value, page: value.page + 1 }))} className={`${action} disabled:cursor-not-allowed disabled:opacity-40`}>Next</button>
          </nav>
        </>}
      </section>
    </div>
  );
};

export default TalentMyApplied;
