import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { profileImageUrl } from "../profiles/profileApi";
import { API_BASE_URL } from "../utils/api";
import { Plus, X, Download, Trash2, Search, Eye } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
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
      if (!applicant.cvUrl) { setPreview({ loading: false, url: "", message: "No résumé is available for this application." }); return; }
      if (/\.docx?$/i.test(new URL(applicant.cvUrl).pathname)) {
        setPreview({ loading: false, url: "", message: "Preview unavailable for DOC/DOCX files. Use Download résumé." }); return;
      }
      try {
        const response = await fetch(applicant.cvUrl, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const signature = await blob.slice(0, 5).text();
        if (controller.signal.aborted) return;
        if (signature !== "%PDF-") {
          setPreview({ loading: false, url: "", message: "Preview unavailable for this file format. Use Download résumé." }); return;
        }
        blobUrl = URL.createObjectURL(blob.type === "application/pdf" ? blob : blob.slice(0, blob.size, "application/pdf"));
        setPreview({ loading: false, url: blobUrl, message: "" });
      } catch {
        if (!controller.signal.aborted) setPreview({ loading: false, url: "", message: "Unable to load résumé preview. Please try again later." });
      }
    }
    load();
    return () => { controller.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [applicant.cvUrl]);
  return preview.loading ? <p role="status">Loading résumé…</p>
    : preview.url ? <>
      <iframe src={preview.url} title={`Résumé preview for ${applicant.name}`} className="w-full h-[55dvh] min-h-48 rounded border border-white/10 bg-white"
        onError={() => setPreview({ loading: false, url: "", message: "PDF preview is unavailable in this browser. Use Download résumé." })} />
      <p className="text-sm text-gray-400">If your browser cannot display the PDF, use Download résumé.</p>
    </> : <p role="status">{preview.message}</p>;
}

const statusLabels = { pending: "Pending", reviewed: "Reviewed", shortlisted: "Shortlisted", rejected: "Rejected", hired: "Hired" };
const nextStatus = { pending: "reviewed", reviewed: "shortlisted", shortlisted: "hired" };

const RecentApplication = () => {
  const [applicants, setApplicants] = useState([]);
  const [resumeApplicant, setResumeApplicant] = useState(null);
  const resumeTrigger = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [savingId, setSavingId] = useState(null);
  const [pendingStatuses, setPendingStatuses] = useState(new Set());
  const statusRequests = useRef(new Set());

  useEffect(() => {
    const fetchApplications = async () => {
      try {

        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");

        if (!user?.id) return;

        const res = await axios.get(
          `${API_BASE_URL}/api/applications/employer`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const formatted = res.data.applications.map((app) => ({
          applicationId: app.id,
          talentId: app.applicant?.id,
          name: app.applicant?.name || "Unknown",
          role: app.job?.title || "Applicant",
          availability: "Available",
          location: app.applicant?.location || "N/A",
          status: app.status || "pending",
          date: formatAppliedDate(app.appliedAt ?? app.createdAt ?? app.date),
          cvUrl: profileImageUrl(app.resumeUrl ?? app.applicant?.resume),
          resumeSource: app.resumeSource ?? (app.applicant?.resume ? "talent" : null),
        }));

        setApplicants(formatted);

      } catch (error) {
        console.error("Failed to fetch applications", error);
      }
    };

    fetchApplications();
  }, []);

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

  const removeApplicant = (id) => {
    setApplicants((prev) => prev.filter((a) => a.applicationId !== id));
    toast({
      title: "Success!",
      description: "Applicant removed",
    });
  };

  const downloadCV = async (applicant) => {
    if (!applicant.cvUrl) {
      toast({ title: "Résumé unavailable", description: "No valid résumé is available for this application.", variant: "destructive" });
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
      toast({ title: "Unable to download résumé", description: "Please try again later.", variant: "destructive" });
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

  // Filter and search logic
  const filteredApplicants = applicants.filter((applicant) => {
    const matchesSearch =
      applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      applicant.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      applicant.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || applicant.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Dialog open={Boolean(resumeApplicant)} onOpenChange={(open) => { if (!open) setResumeApplicant(null); }}>
        <DialogContent className="bg-[#1A1A1E] text-white border-white/10 w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90dvh] overflow-y-auto"
          onCloseAutoFocus={(event) => { event.preventDefault(); resumeTrigger.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle>Résumé — {resumeApplicant?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {resumeApplicant?.resumeSource === "application" ? "Résumé saved with this application."
                : resumeApplicant?.resumeSource === "talent" ? "Legacy application: showing the Talent’s current résumé, which may have changed since applying."
                : "No résumé source is available."}
            </DialogDescription>
          </DialogHeader>
          {resumeApplicant && <ResumePreview key={resumeApplicant.applicationId} applicant={resumeApplicant} />}
          {resumeApplicant?.cvUrl && <button onClick={() => downloadCV(resumeApplicant)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white justify-self-start">Download résumé</button>}
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
              placeholder="Search by name, role, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-[50%] lg:w-[40%] pl-10 pr-4 py-3 bg-[#1A1A1E] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
              {filteredApplicants.map((applicant) => (
                <tr
                  key={applicant.applicationId}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex-shrink-0"></div>
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
                        onClick={() => navigate(`/dashboard/users/talent/${encodeURIComponent(applicant.talentId)}?from=applicants&origin=${pathname === "/dashboard/applicants" ? "applicants" : "dashboard"}`)}
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
                        title="View résumé"
                        aria-label={`View résumé for ${applicant.name}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeApplicant(applicant.applicationId)}
                        className="px-4 py-2 bg-transparent border border-white/20 hover:bg-white/5 rounded text-white text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredApplicants.length === 0 && (
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
      </div>
    </div>
  );
};

export default RecentApplication;
