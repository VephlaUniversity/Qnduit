import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";
import { browserSessions } from "../utils/requestSafety";
import { friendlyError } from "../utils/userMessage";
import { DEGREE_OPTIONS } from "../../../backend/src/utils/talentFieldChoices.js";
import { cvDraftRows, cvDuplicate, validSkillLevel } from "../utils/educationDraft";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

const sections = ["education", "experience", "skills"];
const empty = () => Object.fromEntries(sections.map(section => [section, []]));
const initial = { busy: false, open: false, entries: empty(), error: "", notice: "" };
const labels = { academy: "Institution", company: "Company", title: "Title", startDate: "Start date", endDate: "End date", description: "Description", percent: "Level (%)" };
const fields = { education: ["academy", "title", "startDate", "endDate", "description"], experience: ["company", "title", "startDate", "endDate", "description"], skills: ["title", "percent"] };
const EducationExtractionReview = forwardRef(function EducationExtractionReview({ owner, education, experience = [], skills = [], imports, onApply, disabled }, ref) {
  const [state, setState] = useState(initial), [applying, setApplying] = useState(false);
  const [enabled, setEnabled] = useState({ education: true, experience: true, skills: true });
  const request = useRef(null), lastFile = useRef(null), applied = useRef(false);
  const actor = owner?.actor, token = owner?.token;
  const current = useCallback(() => Boolean(actor && token) && browserSessions().some(row => row.actor === actor && row.token === token), [actor, token]);
  const dismiss = useCallback(() => {
    request.current?.abort(); request.current = null; lastFile.current = null;
    setState(initial); setApplying(false); setEnabled({ education: true, experience: true, skills: true });
  }, []);
  useEffect(() => {
    const changed = () => { if (!current()) dismiss(); };
    window.addEventListener("storage", changed); window.addEventListener("qnduit:polling-session-changed", changed);
    return () => { request.current?.abort(); request.current = null; window.removeEventListener("storage", changed); window.removeEventListener("qnduit:polling-session-changed", changed); };
  }, [current, dismiss]);
  const extract = async file => {
    if (!file || disabled || !current()) return;
    dismiss(); lastFile.current = file; applied.current = false;
    if (!/\.(pdf|docx)$/i.test(file.name)) { setState({ ...initial, error: "CV auto-fill supports text-based PDF and DOCX. Keep this CV and enter details manually." }); return; }
    if (!file.size || file.size > 10 * 1024 * 1024) { setState({ ...initial, error: "Choose a CV of 10 MiB or smaller." }); return; }
    const controller = new AbortController(); request.current = controller; setState({ ...initial, busy: true });
    const form = new FormData(); form.append("cv", file);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/resume/education-draft`, form, { signal: controller.signal, timeout: 15000, headers: { Authorization: `Bearer ${token}` } });
      if (controller.signal.aborted || request.current !== controller || !current()) return;
      if (data?.success !== true || data.accountId !== actor.slice("talent:".length)) throw Error("Unconfirmed CV draft");
      const entries = Object.fromEntries(sections.map(section => [section, cvDraftRows(section, data[section] || (section === "education" ? data.entries : []) || [])
        .map(row => ({ ...row, selected: !row.warnings.length && (section === "skills" ? Boolean(row.title) : section === "education"
          ? Boolean(row.academy && row.title && row.startDate && row.endDate)
          : Boolean(row.company && row.title && row.startDate && row.endDate)) }))]));
      setState({ ...initial, entries, notice: data.partialWarning || "" });
    } catch (error) {
      if (!controller.signal.aborted && request.current === controller && current()) setState({ ...initial, error: friendlyError(error, "This CV could not be read. Keep it and enter details manually.") });
    } finally { if (request.current === controller) request.current = null; }
  };
  useImperativeHandle(ref, () => ({
    select(files) { if (files.length === 1) extract(files[0]); },
    remove(file) { if (lastFile.current === file) dismiss(); },
    dismiss,
  }));
  const edit = (section, index, field, value) => setState(previous => ({ ...previous, entries: { ...previous.entries,
    [section]: previous.entries[section].map((row, i) => i === index ? { ...row, [field]: value, _duplicateReviewed: field === "selected" ? value : false } : row),
  } }));
  const eligible = empty(), duplicates = empty(), existing = { education, experience, skills };
  for (const section of sections) {
    const comparison = [...existing[section]];
    for (const row of state.entries[section]) {
      const duplicate = cvDuplicate(section, row, comparison, imports?.[section]); duplicates[section].push(duplicate);
      const valid = section !== "skills" || row.title.trim() && validSkillLevel(row.percent);
      if (enabled[section] && valid && row.selected && !["duplicate", "imported"].includes(duplicate) && (duplicate !== "ambiguous" || row._duplicateReviewed)) {
        eligible[section].push(row); comparison.push(row);
      }
    }
  }
  const canApply = sections.some(section => eligible[section].length);
  const recognized = sections.flatMap(section => state.entries[section].map((_, index) => duplicates[section][index]));
  const allExisting = recognized.length > 0 && recognized.every(value => ["duplicate", "imported"].includes(value));
  const summary = sections.map(section => `${state.entries[section].length} ${section}`).join(" · ");
  const apply = async () => {
    if (applied.current || !current() || disabled || !canApply) return;
    applied.current = true; setApplying(true); await onApply(eligible); dismiss();
  };
  const inputClass = "w-full rounded-lg border border-white/15 bg-[#0E0E10] px-3 py-2 text-white";
  return <div>
    {state.busy && <p role="status" className="mt-3 text-sm text-gray-300">Reading CV… <button type="button" onClick={dismiss} className="ml-2 text-blue-400">Skip</button></p>}
    {state.error && <div role="alert" className="mt-3 text-sm text-red-400">{state.error}{lastFile.current && <button type="button" disabled={disabled} onClick={() => extract(lastFile.current)} className="ml-2 text-blue-400">Try again</button>}<button type="button" onClick={dismiss} className="ml-2 text-blue-400">Skip</button></div>}
    {!state.busy && !state.open && !state.error && lastFile.current && <div role="status" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-300">
      <span>{recognized.length ? `${summary} suggested` : "No details found"}</span>
      {recognized.length > 0 && <button type="button" onClick={() => setState(previous => ({ ...previous, open: true }))} className="text-blue-400">Review suggestions</button>}
      <button type="button" onClick={dismiss} className="text-gray-400">Skip</button>
    </div>}
    <Dialog open={state.open} onOpenChange={open => { if (!open) dismiss(); }}>
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden border-white/10 bg-[#1A1A1E] text-white sm:max-w-3xl">
        <DialogHeader><DialogTitle>Review CV details</DialogTitle><DialogDescription className="text-gray-400">Apply to your draft, then Save Changes.</DialogDescription></DialogHeader>
        {allExisting && <p role="status" className="text-sm text-gray-300">These details are already on your profile</p>}
        {state.notice && <p role="status" className="text-sm text-yellow-300">{state.notice}</p>}
        {!recognized.length && <p role="status" className="text-sm text-gray-300">No profile details could be read reliably. You can still save this CV and enter details manually.</p>}
        <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
          {sections.map(section => <section aria-label={`Review ${section}`} key={section} className="space-y-3">
            <label className="flex items-center gap-2 font-semibold capitalize"><input type="checkbox" checked={enabled[section]} onChange={event => setEnabled(previous => ({ ...previous, [section]: event.target.checked }))} />{section}</label>
            {!state.entries[section].length && <p className="text-sm text-gray-400">No {section} found.</p>}
            <fieldset disabled={!enabled[section] || applying} className="space-y-3">
            {state.entries[section].map((row, index) => <article key={index} className="rounded-lg border border-white/15 p-3 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" disabled={["duplicate", "imported"].includes(duplicates[section][index])} checked={eligible[section].includes(row)} onChange={event => edit(section, index, "selected", event.target.checked)} />Select {section} entry {index + 1}</label>
              {["duplicate", "imported"].includes(duplicates[section][index]) ? <p className="text-sm text-gray-400">Already in {section}.</p>
                : duplicates[section][index] === "ambiguous" ? <p className="text-sm text-yellow-300">May already be in {section}. Select only if this is a different entry.</p>
                  : duplicates[section][index] === "possible" && <p className="text-sm text-yellow-300">Same institution. Check the qualification and dates.</p>}
              <div className="grid gap-2 sm:grid-cols-2">{fields[section].map(field => <label key={field} className={`block text-sm text-gray-300 ${["academy", "company", "title", "description"].includes(field) ? "sm:col-span-2" : ""}`}>
                {section === "education" && field === "title" ? "Degree level" : section === "skills" && field === "title" ? "Skill" : labels[field]}
                {section === "education" && field === "title" ? <select className={inputClass} value={row.title} onChange={event => edit(section, index, field, event.target.value)}><option value="">Select degree level</option>{DEGREE_OPTIONS.map(value => <option key={value}>{value}</option>)}</select>
                  : field === "description" ? <textarea className={inputClass} maxLength={2000} rows={2} value={row[field]} onChange={event => edit(section, index, field, event.target.value)} />
                    : <input className={inputClass} type={field === "percent" ? "number" : "text"} min={field === "percent" ? 0 : undefined} max={field === "percent" ? 100 : undefined} step={field === "percent" ? "any" : undefined} maxLength={section === "skills" && field === "title" ? 80 : 160} value={row[field]} onChange={event => edit(section, index, field, event.target.value)} />}
              </label>)}</div>
              {section === "skills" && !validSkillLevel(row.percent) && <p role="alert" className="text-sm text-red-400">Enter a level from 0 to 100 or leave it blank.</p>}
              {row.warnings.map((warning, i) => <p key={i} className="text-sm text-yellow-300">{warning}</p>)}
              <details><summary className="cursor-pointer text-sm text-blue-400">Source evidence</summary>{row.evidence.map((evidence, i) => <blockquote key={i} className="mt-2 border-l-2 border-white/20 pl-3 text-sm text-gray-300 break-words"><p className="text-xs text-gray-400">{evidence.location}</p><p className="whitespace-pre-wrap">{evidence.text}</p></blockquote>)}</details>
            </article>)}
            </fieldset>
          </section>)}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 pt-3"><button type="button" onClick={dismiss} className="rounded-lg border border-white/20 px-4 py-2">Cancel</button>{canApply
          ? <button type="button" onClick={apply} disabled={disabled || applying} className="rounded-lg bg-blue-600 px-4 py-2 disabled:opacity-50">{applying ? "Applying…" : "Apply"}</button>
          : <button type="button" onClick={dismiss} disabled={disabled || applying} className="rounded-lg bg-blue-600 px-4 py-2 disabled:opacity-50">Done</button>}</div>
      </DialogContent>
    </Dialog>
  </div>;
});
export default EducationExtractionReview;
