import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { profileImageUrl } from "../profiles/profileApi";
import { API_BASE_URL } from "../utils/api";
import { Plus, X, Download, Trash2, Search, Eye } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { readApplicantSearch, writeApplicantSearch } from "./applicantSearch";
import { useToast } from "../hooks/useToast";



const formatAppliedDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date)
    : "Date unavailable";
};

function ResumePreview({ applicant }) {
  const [preview, setPreview] = useState({ loading: true, url: "", message: "" });
  useEffect(() => {
    const controller = new AbortController();
    let blobUrl;
    async function load() {
      if (!applicant.cvUrl) { setPreview({ loading: false, url: "", message: "No Resume was provided." }); return; }
      if (/\.docx?$/i.test(new URL(applicant.cvUrl).pathname)) {
        setPreview({ loading: false, url: "", message: "Preview unavailable for DOC/DOCX files. Use Download Resume." }); return;
      }
      try {
        const response = await fetch(applicant.cvUrl, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const signature = await blob.slice(0, 5).text();
        if (controller.signal.aborted) return;
        if (signature !== "%PDF-") {
          setPreview({ loading: false, url: "", message: "Preview unavailable for this file format. Use Download Resume." }); return;
        }
        blobUrl = URL.createObjectURL(blob.type === "application/pdf" ? blob : blob.slice(0, blob.size, "application/pdf"));
        setPreview({ loading: false, url: blobUrl, message: "" });
      } catch {
        if (!controller.signal.aborted) setPreview({ loading: false, url: "", message: "Unable to load Resume. Please try again." });
      }
    }
    load();
    return () => { controller.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [applicant.cvUrl]);
  return preview.loading ? <p role="status">Loading Resume…</p>
    : preview.url ? <>
      <iframe src={preview.url} title={`Resume preview for ${applicant.name}`} className="w-full h-[55dvh] min-h-48 rounded border border-white/10 bg-white"
        onError={() => setPreview({ loading: false, url: "", message: "PDF preview is unavailable in this browser. Use Download Resume." })} />
      <p className="text-sm text-gray-400">If your browser cannot display the PDF, use Download Resume.</p>
    </> : <p role="status">{preview.message}</p>;
}

const statusLabels = { pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", rejected: "Rejected", hired: "Hired" };
const nextStatus = { pending: "reviewed", reviewed: "shortlisted", shortlisted: "hired" };

function ApplicantAvatar({ name, imageUrl }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-white" aria-label={name}>
      {imageUrl && !failed
        ? <img src={imageUrl} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        : <span aria-hidden="true">{initials}</span>}
    </div>
  );
}

const RecentApplication = ({ pageSize = 20, onApplicationChange } = {}) => {
  const [applicants, setApplicants] = useState([]);
  const [resumeApplicant, setResumeApplicant] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const archivePending = useRef(false);
  const archiveTrigger = useRef(null);
  const resumeTrigger = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { query: searchQuery, status: filterStatus, page } = readApplicantSearch(params);
  const [reload, setReload] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [listState, setListState] = useState({ key: "", loading: true, error: "" });
  const listRequest = useRef(null);
  const requestSequence = useRef(0);
  const requestKey = JSON.stringify([searchQuery, filterStatus, page, pageSize, reload]);
  const loading = listState.key !== requestKey || listState.loading;
  const error = listState.key === requestKey ? listState.error : "";
  const changeSearch = (patch, replace = false) => setParams(previous =>
    writeApplicantSearch(previous, { ...readApplicantSearch(previous), page: 1, ...patch }), { replace });
  const refreshList = () => {
    listRequest.current?.abort();
    requestSequence.current += 1;
    setReload(value => value + 1);
  };
  const [savingId, setSavingId] = useState(null);
  const [pendingStatuses, setPendingStatuses] = useState(new Set());
  const statusRequests = useRef(new Set());

  useEffect(() => {
    const controller = new AbortController();
    listRequest.current = controller;
    const sequence = ++requestSequence.current;
    const current = () => !controller.signal.aborted && sequence === requestSequence.current;
    // Typing updates the URL/control immediately; only the request is debounced.
    const timer = setTimeout(async () => {
      setListState({ key: requestKey, loading: true, error: "" });
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error();
        const { data } = await axios.get(`${API_BASE_URL}/api/applications/employer`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
          params: { q: searchQuery, status: filterStatus, page, limit: pageSize },
        });
        if (!current()) return;
        if (!Array.isArray(data.applications) || !data.pagination) throw new Error();
        const resolvedPage = Math.min(page, Math.max(1, data.pagination.pages));
        if (resolvedPage !== page) {
          setParams(previous => writeApplicantSearch(previous, { ...readApplicantSearch(previous), page: resolvedPage }), { replace: true });
          return;
        }
        setApplicants(data.applications.map(app => ({
          applicationId: app.id, talentId: app.applicant?.id,
          name: app.applicant?.name?.trim() || "Unknown",
          avatar: profileImageUrl(typeof app.applicant?.avatar === "string" ? app.applicant.avatar : app.applicant?.avatar?.url),
          role: app.job?.title || "Applicant",
          availability: "Available", location: app.applicant?.location || "N/A",
          status: app.status || "pending", date: formatAppliedDate(app.appliedAt ?? app.createdAt ?? app.date),
          cvUrl: profileImageUrl(app.resumeUrl ?? app.applicant?.resume),
          resumeSource: app.resumeSource ?? (app.applicant?.resume ? "talent" : null),
        })));
        setPagination(data.pagination);
        setListState({ key: requestKey, loading: false, error: "" });
      } catch (failure) {
        if (!current()) return;
        setListState({ key: requestKey, loading: false, error: failure.response?.status === 401
          ? "Your session has expired. Please sign in again." : "Unable to load applicants. Please try again." });
      }
    }, searchQuery ? 200 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery, filterStatus, page, pageSize, reload, requestKey, setParams]);

  const addToSavedCandidates = async (applicant) => {
    try {
      setSavingId(applicant.talentId);

      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/api/employers/saved-candidates/${applicant.talentId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast({
        title: "Success!",
        description: `${applicant.name} saved successfully`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const updateStatus = async (applicant, status) => {
    const id = applicant.applicationId;
    if (statusRequests.current.has(id)) return;
    statusRequests.current.add(id);
    setPendingStatuses(new Set(statusRequests.current));
    try {
      const { data } = await axios.patch(`${API_BASE_URL}/api/applications/${encodeURIComponent(id)}/status`,
        { status, expectedStatus: applicant.status }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!data.success || data.application?.applicationId !== id || !Object.hasOwn(statusLabels, data.application.status)) throw new Error();
      refreshList();
      onApplicationChange?.();
      setApplicants(previous => previous.map(row => row.applicationId === id ? { ...row, status: data.application.status } : row));
      toast({ title: "Status updated", description: `Application is ${statusLabels[data.application.status]}.` });
    } catch (error) {
      toast({ title: "Unable to update status", description: error.response?.status === 409
        ? "This application changed elsewhere. Refresh before trying again." : "Please try again. The displayed status has not changed.", variant: "destructive" });
    } finally {
      statusRequests.current.delete(id);
      setPendingStatuses(new Set(statusRequests.current));
    }
  };

  const archiveApplicant = async () => {
    if (!archiveTarget || archivePending.current) return;
    archivePending.current = true;
    setArchiving(true);
    try {
      const { data } = await axios.patch(`${API_BASE_URL}/api/applications/${encodeURIComponent(archiveTarget.applicationId)}/archive`, {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (!data.success || data.application?.applicationId !== archiveTarget.applicationId || !data.application.employerArchivedAt) throw new Error();
      refreshList();
      onApplicationChange?.();
      setApplicants(previous => previous.filter(row => row.applicationId !== archiveTarget.applicationId));
      setArchiveTarget(null);
      toast({ title: "Application archived", description: "Removed from your active list. The application and its status are preserved." });
    } catch {
      toast({ title: "Unable to archive application", description: "Please try again. The application has not been removed from your list.", variant: "destructive" });
    } finally {
      archivePending.current = false;
      setArchiving(false);
    }
  };

  const downloadCV = async (applicant) => {
    if (!applicant.cvUrl) {
      toast({ title: "Resume unavailable", description: "No valid Resume is available for this application.", variant: "destructive" });
      return;
    }
    let blobUrl;
    try {
      const response = await fetch(applicant.cvUrl, { credentials: "omit" });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      const extension = new URL(applicant.cvUrl).pathname.match(/\.(pdf|docx?)$/i)?.[0]
        || (blob.type === "application/pdf" ? ".pdf" : "");
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${applicant.name.replace(/\s+/g, "_")}_CV${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow the browser to consume the download before releasing its temporary URL.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      toast({ title: "Unable to download Resume", description: "Please try again later.", variant: "destructive" });
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "reviewed":
      case "shortlisted":
      case "hired":
        return "bg-blue-600/20 text-blue-400";
      case "rejected":
        return "bg-red-600/20 text-red-400";
      default:
        return "bg-yellow-600/20 text-yellow-400";
    }
  };


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Dialog open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open && !archivePending.current) setArchiveTarget(null); }}>
        <DialogContent className="bg-[#1A1A1E] text-white border-white/10"
          onCloseAutoFocus={(event) => { event.preventDefault(); if (archiveTrigger.current?.isConnected) archiveTrigger.current.focus(); }}>
          <DialogHeader>
            <DialogTitle>Archive application?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Archive {archiveTarget?.name}’s application for {archiveTarget?.role}? This removes it from your active list without deleting it or changing its status. The Talent can still see it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-3">
            <button disabled={archiving} onClick={() => setArchiveTarget(null)} className="px-4 py-2 rounded bg-[#2A2A2E] disabled:opacity-50">Cancel</button>
            <button disabled={archiving} onClick={archiveApplicant} className="px-4 py-2 rounded bg-blue-600 disabled:opacity-50">{archiving ? "Archiving…" : "Archive application"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(resumeApplicant)} onOpenChange={(open) => { if (!open) setResumeApplicant(null); }}>
        <DialogContent className="bg-[#1A1A1E] text-white border-white/10 w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90dvh] overflow-y-auto"
          onCloseAutoFocus={(event) => { event.preventDefault(); resumeTrigger.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle>Resume — {resumeApplicant?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {resumeApplicant?.resumeSource === "application" ? "Resume saved with this application."
                : resumeApplicant?.resumeSource === "talent" ? "Showing the Talent’s current Resume, which may have changed since applying."
                : "No Resume source is available."}
            </DialogDescription>
          </DialogHeader>
          {resumeApplicant && <ResumePreview key={resumeApplicant.applicationId} applicant={resumeApplicant} />}
          {resumeApplicant?.cvUrl && <button onClick={() => downloadCV(resumeApplicant)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white justify-self-start">Download Resume</button>}
        </DialogContent>
      </Dialog>
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5">
        <h2 className="text-xl font-semibold text-white mb-6">
          Recent Applicants
        </h2>
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              maxLength={200}
              placeholder="Search by name, role, or location..."
              value={searchQuery}
              onChange={(e) => changeSearch({ query: e.target.value }, true)}
              className="w-full md:w-[50%] lg:w-[40%] pl-10 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => changeSearch({ status: e.target.value })}
            className={`w-full sm:w-44 max-w-full min-w-0 shrink-0 pl-4 pr-10 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2020%2020'%20fill='none'%20stroke='white'%3E%3Cpath%20d='m6%208%204%204%204-4'/%3E%3C/svg%3E")] bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.75rem_center]`}
          >
            <option value="all">All</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  CANDIDATES
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  STATUS
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  APPLIED DATE
                </th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4 px-4">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && applicants.map((applicant) => (
                <tr
                  key={applicant.applicationId}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <ApplicantAvatar key={`${applicant.talentId}:${applicant.avatar}`} name={applicant.name} imageUrl={applicant.avatar} />
                      <div>
                        <p className="text-blue-500 text-sm font-medium">
                          {applicant.role}
                        </p>
                        <p className="text-white font-medium">
                          {applicant.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {applicant.availability} • {applicant.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(applicant.status)}`}
                    >
                      {statusLabels[applicant.status] || applicant.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-400 text-sm">
                    {applicant.date}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/dashboard/users/talent/${encodeURIComponent(applicant.talentId)}?${writeApplicantSearch(new URLSearchParams({ from: "applicants", origin: pathname === "/dashboard/applicants" ? "applicants" : "dashboard" }), { query: searchQuery, status: filterStatus, page })}`)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="View Profile" aria-label={`View Profile for ${applicant.name}`}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        disabled={savingId === applicant.talentId}
                        onClick={() => addToSavedCandidates(applicant)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Add to Saved Candidates"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <select value="" disabled={pendingStatuses.has(applicant.applicationId) || !nextStatus[applicant.status]}
                        aria-label={`Status action for ${applicant.name} — ${applicant.role}`}
                        onChange={(event) => { if (event.target.value) updateStatus(applicant, event.target.value); }}
                        className={`w-36 max-w-full shrink-0 pl-3 pr-10 py-2 bg-blue-600 rounded text-white text-sm disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2020%2020'%20fill='none'%20stroke='white'%3E%3Cpath%20d='m6%208%204%204%204-4'/%3E%3C/svg%3E")] bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.75rem_center]`}>
                        <option value="">{pendingStatuses.has(applicant.applicationId) ? "Saving…" : nextStatus[applicant.status] ? "Status action" : statusLabels[applicant.status]}</option>
                        {nextStatus[applicant.status] && <option value={nextStatus[applicant.status]}>{statusLabels[nextStatus[applicant.status]]}</option>}
                      </select>
                      <button
                        onClick={() => updateStatus(applicant, "rejected")}
                        disabled={pendingStatuses.has(applicant.applicationId) || !nextStatus[applicant.status]}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors disabled:opacity-50"
                        title="Reject" aria-label={`Reject application for ${applicant.name} — ${applicant.role}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(event) => { resumeTrigger.current = event.currentTarget; setResumeApplicant(applicant); }}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="View Resume"
                        aria-label={`View Resume for ${applicant.name}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(event) => { archiveTrigger.current = event.currentTarget; setArchiveTarget(applicant); }}
                        disabled={pendingStatuses.has(applicant.applicationId)}
                        title="Archive application" aria-label={`Archive application for ${applicant.name} — ${applicant.role}`}
                        className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(loading || error) && <tr><td colSpan={4} className="py-8 text-center text-gray-400">
                <p role={error ? "alert" : "status"}>{loading ? "Loading applicants…" : error}</p>
              </td></tr>}
              {!loading && !error && applicants.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    {searchQuery || filterStatus !== "all"
                      ? "No applicants found matching your search"
                      : "No applicants"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-gray-400" aria-label="Applicants pagination">
          <span aria-live="polite">{!loading && !error ? `Page ${page} of ${pagination.pages} · ${pagination.total} applications` : ""}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => changeSearch({ page: page - 1 })} disabled={loading || Boolean(error) || page <= 1}
              className="px-3 py-2 rounded border border-white/20 focus-visible:outline focus-visible:outline-blue-500 disabled:opacity-50">Previous</button>
            <button type="button" onClick={() => changeSearch({ page: page + 1 })} disabled={loading || Boolean(error) || page >= pagination.pages}
              className="px-3 py-2 rounded border border-white/20 focus-visible:outline focus-visible:outline-blue-500 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentApplication;
