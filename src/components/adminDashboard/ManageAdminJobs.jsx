import { jobApplicationConfiguration } from "../utils/jobApplicationConfiguration";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Flag, Trash2, MapPin, Pencil, Plus } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { ListToolbar } from "./ListToolbar";
import { PaginationBar } from "./PaginationBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import JobDescriptionText from "../utils/JobDescriptionText";
import { createAdminJobClient } from "../utils/adminJobs";
import { browserSessions } from "../utils/requestSafety";
import { API_BASE_URL } from "../utils/api";
import { formatAdminProfileDate } from "../utils/adminProfile";
import { jobDateKey } from "../utils/jobDeadline";
import JobForm from "../jobs/JobForm";
import JobFormSelect from "../jobs/JobFormSelect";
import { editorPlainText, profileImageUrl } from "../profiles/profileApi";
import { validateJobSalary } from "../utils/jobSalaryValidation";
import { deadlineError } from "../utils/jobDeadline";
import { safeText } from "../utils/userMessage";

const statuses = ["draft", "published", "closed"];
const fields = [["jobTitle", "Job title", true], ["organization", "Organization"], ["location", "Location"], ["category", "Category"], ["experience", "Experience"], ["careerLevel", "Career level"], ["qualification", "Qualification"], ["address", "Address"]];
const formFields = ["applicationType", "applicationUrl", "jobTitle", "jobDescription", "category", "jobCategory", "jobApplyType", "salaryType", "minSalary", "maxSalary", "experience", "careerLevel", "qualification", "deadlineDate", "address", "location"];
const sortOptions = [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "title-asc", label: "Title (A-Z)" }];
const blank = () => ({ applicationType: "internal", applicationUrl: "", jobTitle: "", jobDescription: "", organization: "", location: "", category: "", experience: "", careerLevel: "", qualification: "", address: "", jobCategory: "", jobApplyType: "", workType: "On-site", minSalary: "", maxSalary: "", salaryType: "", deadlineDate: "", status: "draft" });
const readOwner = () => browserSessions().find(row => row.actor.startsWith("admin:"));
const inputClass = "w-full rounded-lg border border-white/10 bg-[#0E0E10] p-3 text-sm text-white";
const buttonClass = "min-h-11 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50";
const badgeClass = status => status === "published" ? "bg-emerald-600/15 text-emerald-500" : status === "draft" ? "bg-yellow-500/15 text-yellow-500" : "bg-red-600/15 text-red-500";
const message = error => error.response?.status === 409 ? "This job or request changed. Refresh Admin Jobs before trying again."
  : safeText(error.response?.data?.message, "The operation could not be confirmed. Refresh Admin Jobs before retrying.");

export default function ManageAdminJobs() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(""), [sort, setSort] = useState("newest"), [filter, setFilter] = useState("all"), [page, setPage] = useState(1);
  const [jobs, setJobs] = useState([]), [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [reload, setReload] = useState(0), [pending, setPending] = useState(false);
  const [view, setView] = useState(null), [editor, setEditor] = useState(null), [draft, setDraft] = useState(blank), [formError, setFormError] = useState(""), [errors, setErrors] = useState({}), [action, setAction] = useState(null);
  const [featuredImage, setFeaturedImage] = useState(null), [photos, setPhotos] = useState([]);
  const featuredImageRef = useRef(null), photosRef = useRef(null), nextPhotoKey = useRef(0);
  const creationKey = useRef(null), mounted = useRef(false), cancelButton = useRef(null), actionTrigger = useRef(null), heading = useRef(null);
  const client = useMemo(() => createAdminJobClient({ client: axios, baseUrl: API_BASE_URL, readOwner }), []);
  const openCreate = useCallback(() => { creationKey.current = crypto.randomUUID(); setDraft(blank()); setFeaturedImage(null); setPhotos([]); setErrors({}); setFormError(""); setEditor({ creating: true }); }, []);
  useEffect(() => {
    mounted.current = true;
    const owner = JSON.stringify(readOwner());
    const changed = () => {
      if (JSON.stringify(readOwner()) !== owner) { client.cancel(); setJobs([]); setEditor(null); setView(null); setAction(null); setError("Your Admin session changed. Refresh the page."); }
    };
    window.addEventListener("storage", changed); window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { mounted.current = false; client.cancel(); window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [client]);
  useEffect(() => {
    if (params.get("create") === "1") { openCreate(); setParams({}, { replace: true }); }
  }, [params, setParams, openCreate]);
  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const data = await client.list({ search, sort, page, limit: 10, status: filter });
        if (current && data) { setJobs(data.data); setPagination(data.pagination); }
      } catch (problem) { if (current) setError(message(problem)); }
      finally { if (current) setLoading(false); }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [client, search, sort, page, filter, reload]);
  const details = async (job, editing = false) => {
    setError("");
    try {
      const data = await client.details(job);
      if (!mounted.current || !data) return;
      if (!editing) setView(data.job);
      else {
        const row = data.job;
        setDraft({ ...blank(), ...Object.fromEntries(fields.map(([key]) => [key, row[key] || ""])), jobDescription: row.jobDescription,
          applicationType: row.applicationType ?? "internal", applicationUrl: row.applicationType === "external" ? row.applicationUrl || "" : "",
          jobCategory: row.jobCategory || "", jobApplyType: row.jobApplyType || "", workType: row.workType, minSalary: row.salary?.min ?? "", maxSalary: row.salary?.max ?? "", salaryType: row.salary?.type || "", deadlineDate: jobDateKey(row.deadlineDate) });
        setFeaturedImage(row.featuredImage?.url ? { preview: profileImageUrl(row.featuredImage.url) } : null);
        setPhotos((row.gallery || []).map((item, index) => ({ key: `saved-${item._id || index}`, id: item._id, preview: profileImageUrl(item.url), type: item.type })));
        setErrors({}); setFormError(""); setEditor({ creating: false, job: row });
      }
    } catch (problem) { if (mounted.current) setError(message(problem)); }
  };
  const save = async () => {
    if (pending) return;
    if (!draft.jobTitle.trim()) { setFormError("Job Title is required"); return; }
    if (!editorPlainText(draft.jobDescription).trim()) { setFormError("Job Description is required"); return; }
    const application = jobApplicationConfiguration(draft);
    const validation = { ...validateJobSalary(draft), ...application.errors }, deadline = deadlineError(draft.deadlineDate, jobDateKey(editor.job?.deadlineDate));
    if (deadline) validation.deadlineDate = deadline;
    if (Object.keys(validation).length) { setErrors(validation); setFormError(Object.values(validation)[0]); requestAnimationFrame(() => document.getElementById(`job-${Object.keys(validation)[0]}`)?.focus()); return; }
    setPending(true); setFormError(""); setErrors({});
    try {
      const body = new FormData();
      formFields.forEach(key => body.append(key, application.configuration[key] ?? draft[key] ?? ""));
      if (featuredImage instanceof File) body.append("featuredImage", featuredImage);
      body.append("retainedGalleryIds", JSON.stringify(photos.filter(photo => !photo.file).map(photo => photo.id)));
      body.append("removeFeaturedImage", String(Boolean(editor.job?.featuredImage?.url && !featuredImage)));
      photos.forEach(photo => { if (photo.file instanceof File) body.append("photos", photo.file); });
      if (editor.creating) body.append("requestId", creationKey.current);
      const data = editor.creating ? await client.create(body) : await client.update(editor.job, body);
      if (!mounted.current || !data) return;
      setEditor(null); setView(null); setReload(value => value + 1); toast.success(editor.creating ? "Admin job posted" : "Admin job updated");
    } catch (problem) { if (mounted.current) { setFormError(message(problem)); setErrors(problem.response?.data?.errors || {}); } }
    finally { if (mounted.current) setPending(false); }
  };
  const change = async () => {
    if (!action || pending) return;
    setPending(true); setFormError("");
    try {
      const data = action.kind === "delete" ? await client.remove(action.job) : await client.status(action.job, action.status);
      if (!mounted.current || !data) return;
      setAction(null); setView(null);
      if (action.kind === "delete" && jobs.length === 1 && page > 1) setPage(value => value - 1);
      else setReload(value => value + 1);
      toast.success(action.kind === "delete" ? "Admin job deleted" : "Admin job status updated");
    } catch (problem) { if (mounted.current) setFormError(message(problem)); }
    finally { if (mounted.current) setPending(false); }
  };
  const flag = async job => {
    if (pending) return; setPending(true); setError("");
    try { const data = await client.flag(job); if (mounted.current && data) setReload(value => value + 1); }
    catch (problem) { if (mounted.current) setError(message(problem)); }
    finally { if (mounted.current) setPending(false); }
  };
  const ask = (kind, job, trigger) => { actionTrigger.current = trigger; setFormError(""); setAction({ kind, job, status: job.status }); };
  const setField = (key, value) => { setDraft(previous => ({ ...previous, [key]: value, ...(key === "applicationType" && value === "internal" ? { applicationUrl: "" } : {}) })); if (["applicationType", "applicationUrl"].includes(key)) setErrors(previous => ({ ...previous, applicationType: undefined, applicationUrl: undefined })); };
  const handleInputChange = event => setField(event.target.name, event.target.value);
  const handleFeaturedImage = event => { const file = event.target.files[0]; if (file) setFeaturedImage(file); };
  const handlePhotosUpload = event => {
    const files = Array.from(event.target.files); event.target.value = "";
    if (!files.length) return;
    if (files.some(file => !/\.(png|jpe?g|mp4)$/i.test(file.name))) { toast.error("Choose PNG, JPG, JPEG or MP4 files."); return; }
    if (photos.filter(photo => photo.file).length + files.length > 10) { toast.error("Upload up to 10 new gallery files per save."); return; }
    setPhotos(previous => [...previous, ...files.map(file => ({ key: `new-${nextPhotoKey.current++}`, file, type: file.type.startsWith("video/") || /\.mp4$/i.test(file.name) ? "video" : "image" }))]);
  };
  if (editor) return <JobForm isEditing={!editor.creating} formData={draft} setFormData={setDraft}
    {...{ featuredImage, featuredImageRef, photos, photosRef, setFeaturedImage, handleInputChange, handleFeaturedImage, handlePhotosUpload, formError }}
    removePhoto={index => setPhotos(previous => previous.filter((_, i) => i !== index))}
    applicationErrors={errors} salaryErrors={errors} deadlineMessage={errors.deadlineDate || ""} savedDeadline={jobDateKey(editor.job?.deadlineDate)} saving={pending}
    onCancel={() => { if (!pending) setEditor(null); }} onSubmit={save} />;
  return <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8 text-white">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="h-8 w-1 rounded-full bg-blue-600" /><h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold md:text-3xl">Admin Jobs</h1></div>
      <button className={buttonClass} disabled={pending} onClick={openCreate}><Plus className="mr-2 inline h-4 w-4" />Post Job</button>
    </div>
    <p className="mb-5 text-sm text-gray-400">Published jobs appear in public and Talent job search. Talent applications are stored; Admin application review and meeting scheduling are pending. <Link to="/admin-dashboard/jobs" className="text-blue-400 underline">Manage Employer jobs</Link></p>
    <div className="rounded-lg border border-white/5 bg-[#1A1A1E] p-4 md:p-6">
      <ListToolbar search={search} onSearchChange={value => { setSearch(value); setPage(1); }} placeholder="Search Admin jobs by title or location" sortOptions={sortOptions} sortValue={sort} onSortChange={value => { setSort(value); setPage(1); }} />
      <div className="mb-4 flex flex-wrap items-center gap-3"><label htmlFor="admin-job-filter" className="text-sm text-gray-400">Status</label><JobFormSelect id="admin-job-filter" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded border border-white/10 bg-[#0E0E10] p-2"><option value="all">All statuses</option>{statuses.map(status => <option key={status}>{status}</option>)}</JobFormSelect><button className="min-h-11 px-3 text-sm text-blue-400" disabled={loading} onClick={() => setReload(value => value + 1)}>Refresh Admin Jobs</button></div>
      {error && <p role="alert" className="mb-4 text-red-400">{error}</p>}
      {loading && <p role="status" className="text-sm text-gray-400">Loading Admin jobs…</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[820px]"><thead><tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-gray-500"><th className="pb-3">Jobs</th><th className="pb-3">Posted by</th><th className="pb-3">Created &amp; Expiry</th><th className="pb-3">Status</th><th className="pb-3 text-right">Action</th></tr></thead>
        <tbody className="divide-y divide-white/5">{!loading && !jobs.length && <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-500">No Admin jobs match your filters.</td></tr>}
          {jobs.map(job => <tr key={`admin:${job.jobId}`}><td className="py-5 pr-4"><p className="font-semibold">{job.jobTitle} {job.flagged && <span className="rounded bg-orange-500/15 px-2 py-1 text-xs text-orange-400">Flagged</span>}</p><p className="mt-1 text-sm text-gray-500"><MapPin className="mr-1 inline h-3.5 w-3.5" />{job.location || "Location not specified"}</p></td>
            <td className="py-5 pr-4 text-sm text-gray-300">{job.postedByName || "Admin account unavailable"}</td><td className="py-5 pr-4 text-sm text-gray-300"><p>Created: {formatAdminProfileDate(job.createdAt)}</p><p className="text-gray-500">Expiry: {formatAdminProfileDate(jobDateKey(job.deadlineDate))}</p></td>
            <td className="py-5 pr-4"><span className={`rounded-full px-3 py-1 text-xs capitalize ${badgeClass(job.effectiveStatus)}`}>{job.effectiveStatus}</span></td>
            <td className="py-5"><div className="flex justify-end gap-2"><button className={buttonClass} disabled={pending} aria-label={`${job.flagged ? "Unflag" : "Flag"} ${job.jobTitle}`} onClick={() => flag(job)}><Flag className="h-4 w-4" /></button><button className={buttonClass} disabled={pending} aria-label={`Edit ${job.jobTitle}`} onClick={() => details(job, true)}><Pencil className="h-4 w-4" /></button><button className={buttonClass} disabled={pending} onClick={event => ask("status", job, event.currentTarget)}>Change status</button><button className="min-h-11 rounded bg-red-600 px-3 disabled:opacity-50" disabled={pending} aria-label={`Delete ${job.jobTitle}`} onClick={event => ask("delete", job, event.currentTarget)}><Trash2 className="h-4 w-4" /></button><button className={buttonClass} disabled={pending} onClick={() => details(job)}>View Job Info</button></div></td></tr>)}
        </tbody></table></div><PaginationBar page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
    </div>
    <Dialog open={!!view} onOpenChange={open => { if (!open) setView(null); }}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-[#1A1A1E] text-white"><DialogHeader><DialogTitle>{view?.jobTitle || "Admin job"}</DialogTitle><DialogDescription>Admin post details</DialogDescription></DialogHeader>{view && <><dl className="grid grid-cols-2 gap-3 text-sm">{[["Organization", view.organization], ["Location", view.location], ["Work type", view.workType], ["Job type", view.jobCategory], ["Job Apply Type", view.jobApplyType], ["Application Type", view.applicationType === "external" ? "External" : "Internal"], ["Application URL", view.applicationType === "external" ? view.applicationUrl : "Not required"], ["Status", view.effectiveStatus], ["Posted by", view.postedByName || "Admin account unavailable"], ["Admin ID", view.postedBy], ["Created", formatAdminProfileDate(view.createdAt)], ["Expiry", formatAdminProfileDate(jobDateKey(view.deadlineDate))], ["Salary period", view.salary?.type], ["Minimum salary", view.salary?.min], ["Maximum salary", view.salary?.max], ["Experience", view.experience], ["Qualification", view.qualification], ["Career level", view.careerLevel], ["Category", view.category], ["Address", view.address]].map(([label, value]) => <div key={label}><dt className="text-gray-400">{label}</dt><dd className="break-words">{value ?? "Not specified"}</dd></div>)}</dl>{view.featuredImage?.url && <img src={profileImageUrl(view.featuredImage.url)} alt="Featured job" className="max-h-60 w-full rounded-lg object-cover" />}
      {view.gallery?.length > 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{view.gallery.map(item => item.type === "video" ? <video key={item._id} src={profileImageUrl(item.url)} controls playsInline className="w-full rounded-lg" /> : <img key={item._id} src={profileImageUrl(item.url)} alt="Job gallery" className="w-full rounded-lg" />)}</div>}
      <JobDescriptionText value={view.jobDescription} className="text-sm leading-relaxed text-gray-200" /></>}</DialogContent></Dialog>
    <Dialog open={!!action} onOpenChange={open => { if (!open && !pending) setAction(null); }}><DialogContent className="border-white/10 bg-[#1A1A1E] text-white" onOpenAutoFocus={event => { event.preventDefault(); cancelButton.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); (actionTrigger.current?.isConnected ? actionTrigger.current : heading.current)?.focus(); }}><DialogHeader><DialogTitle>{action?.kind === "delete" ? "Delete Admin job?" : "Change Admin job status?"}</DialogTitle><DialogDescription>Confirm the action for “{action?.job.jobTitle}”.</DialogDescription></DialogHeader>
      {action?.kind === "status" && <label className="text-sm">New status<JobFormSelect className={inputClass} value={action.status} onChange={event => setAction(previous => ({ ...previous, status: event.target.value }))}>{statuses.map(status => <option key={status}>{status}</option>)}</JobFormSelect></label>}
      {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}<div className="flex justify-end gap-3"><button ref={cancelButton} className="min-h-11 rounded border border-white/20 px-4" disabled={pending} onClick={() => setAction(null)}>Cancel</button><button className={action?.kind === "delete" ? "min-h-11 rounded bg-red-600 px-4 disabled:opacity-50" : buttonClass} disabled={pending} onClick={change}>{pending ? "Saving…" : action?.kind === "delete" ? "Delete Admin Job" : "Confirm status"}</button></div>
    </DialogContent></Dialog>
  </div>;
}
