import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { createAdminJobClient } from "../utils/adminJobs";
import { browserSessions } from "../utils/requestSafety";
import { API_BASE_URL } from "../utils/api";
import { startMessagePolling } from "../utils/messagePolling";
import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration";

const readOwner = () => browserSessions().find(row => row.actor.startsWith("admin:"));
const ownerKey = () => JSON.stringify(readOwner());
const button = "min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm text-blue-400 hover:bg-white/5 disabled:opacity-50";

export default function AdminExternalActivity() {
  const [q, setQ] = useState(""), [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [initialOwner] = useState(ownerKey), [sessionChanged, setSessionChanged] = useState(false);
  const [result, setResult] = useState(null), [error, setError] = useState(""), [copied, setCopied] = useState("");
  const client = useMemo(() => createAdminJobClient({ client: axios, baseUrl: API_BASE_URL, readOwner }), []);
  const key = JSON.stringify([q, page, reload, initialOwner]);
  useEffect(() => {
    const changed = () => { if (ownerKey() !== initialOwner) { client.cancel(); setSessionChanged(true); setResult(null); } };
    window.addEventListener("storage", changed); window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { client.cancel(); window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [client, initialOwner]);
  useEffect(() => {
    if (sessionChanged || ownerKey() !== initialOwner) return;
    let current = true;
    setError(""); setCopied("");
    const loop = startMessagePolling({
      intervalMs: 15000, maxDelayMs: 60000,
      async run(signal) {
        if (!current || ownerKey() !== initialOwner) return false;
        const data = await client.externalActivities({ q, page, limit: 20 }, { signal });
        if (!current || signal.aborted || !data || ownerKey() !== initialOwner) return false;
        if (page > Math.max(1, data.pagination.totalPages)) { setPage(Math.max(1, data.pagination.totalPages)); return false; }
        setResult({ key, ...data }); setError("");
      },
      onSuccess() {},
      onError(error) {
        if (!current || ownerKey() !== initialOwner) return;
        if (error.response?.status === 403) setResult(null);
        setError("Unable to load external activity. Please try again.");
      },
      onUnauthorized() { if (current) { setResult(null); setError("Unable to load external activity. Please try again."); } },
    });
    const timer = setTimeout(() => loop.wake(), 250);
    return () => { current = false; clearTimeout(timer); loop.stop(); client.cancel(); };
  }, [client, initialOwner, key, page, q, sessionChanged]);
  if (sessionChanged) return <p role="alert">Your Admin session changed. Refresh the page.</p>;
  const data = result?.key === key ? result : null;
  const copy = async row => {
    try { await navigator.clipboard.writeText(row.destinationUrl); if (ownerKey() === initialOwner) setCopied(`Copied destination for ${row.job.title}.`); }
    catch { setCopied("Unable to copy. Please retry or use Open destination."); }
  };
  return <section aria-label="Admin external application activity" className="rounded-lg border border-white/5 bg-[#1A1A1E] p-4 md:p-6">
    <p className="mb-4 text-sm text-gray-400">External Apply clicks on Admin-posted jobs. These records do not confirm completion on the external site. Internal applicants, statuses and counts are separate.</p>
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <label className="min-w-0 basis-full sm:basis-auto flex-1 text-sm text-gray-400">Search activity<input type="search" value={q} onChange={event => { setQ(event.target.value); setPage(1); }} placeholder="Talent, recorded job or destination" className="mt-2 w-full rounded-lg border border-white/10 bg-[#0E0E10] p-3 text-white" /></label>
      <button className={button} onClick={() => setReload(value => value + 1)}>Refresh activity</button>
    </div>
    {error ? <div role="alert" className="mb-4 text-red-400">{error} <button className={button} onClick={() => setReload(value => value + 1)}>Retry</button></div> : !data && <p role="status" className="text-gray-400">Loading external activity…</p>}
    <p role="status" className="text-sm text-gray-400">{copied}</p>
    {data && <>
      <p className="mb-3 text-sm text-gray-400">Totals for Admin-source events matching the current filters, across all pages.</p>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-[#0E0E10] p-4"><p className="text-2xl font-semibold">{data.summary.externalTalents}</p><p className="text-sm text-gray-400">External Talents</p></div>
        <div className="rounded-lg border border-white/10 bg-[#0E0E10] p-4"><p className="text-2xl font-semibold">{data.summary.externalClicks}</p><p className="text-sm text-gray-400">External clicks</p></div>
      </div>
      {!data.activities.length && <p className="py-8 text-center text-gray-400">No Admin external activity matches your filters.</p>}
      <div className="space-y-4">{data.activities.map(row => {
        const destination = jobApplicationConfiguration({ applicationType: "external", applicationUrl: row.destinationUrl });
        const safe = !Object.keys(destination.errors).length && destination.configuration.applicationUrl === row.destinationUrl;
        return <article key={row.id} className="rounded-lg border border-white/10 bg-[#0E0E10] p-4 md:p-5">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-blue-400">External Application · Admin</p><h2 className="mt-2 break-words font-semibold">{row.job.title || "Job unavailable"}</h2><p className="text-sm text-gray-400">{row.job.companyName}</p></div><p className="text-sm text-gray-400">Recorded <time dateTime={row.clickedAt}>{new Date(row.clickedAt).toLocaleString()}</time></p></div>
          <div className="mt-3 space-y-1 text-sm"><p>{row.talent.name || "Talent unavailable"}</p>{!row.job.exists && <p className="text-gray-400">Job unavailable · recorded snapshot</p>}</div>
          <div className="mt-3 flex flex-wrap gap-3">{safe ? <><a href={row.destinationUrl} target="_blank" rel="noopener noreferrer" className={button}>Open destination</a><button className={button} onClick={() => copy(row)}>Copy destination</button></> : <p className="text-sm text-gray-400">Recorded destination is unavailable for navigation.</p>}</div>
        </article>;
      })}</div>
      <nav aria-label="External activity pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"><p>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)} · {data.pagination.total} activities</p><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className={button} disabled={page >= data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></nav>
    </>}
  </section>;
}
