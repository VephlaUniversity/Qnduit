import { changePortfolioField, portfolioEditorDraft, portfolioEditorMetadata, portfolioEditorProject, portfolioProjectAllowance, portfolioSaveFailure, queuePortfolioFiles, takePortfolioFiles } from "../utils/portfolioSelection.js";
import { validatePortfolioFieldSize } from "../../../backend/src/utils/portfolioMetadata.js";
import SavedChoiceSelect from "./SavedChoiceSelect";
import EducationExtractionReview from "./EducationExtractionReview";
import { appendCvDraft } from "../utils/educationDraft";
import { useAuth } from "../hooks/useAuth";
import { useTalentSubscription } from "../hooks/useTalentSubscription";
import { hasTalentPublicAccess } from "../utils/talentEntitlements";
import { browserSessions } from "../utils/requestSafety";
import { DEGREE_OPTIONS, prepareEducation } from "../../../backend/src/utils/talentFieldChoices.js";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { friendlyError } from "../utils/userMessage";
import { API_BASE_URL } from "../utils/api";
import { cvExtension, nameWithExtension } from "../utils/cvFile";
import PortfolioItemFields from "./PortfolioItemFields";
import TalentPortfolioProjects from "./TalentPortfolioProjects";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

let localId = 0;
const nextId = () => `local-${Date.now()}-${localId++}`;

const blankEducation = () => ({
  _editorKey: nextId(),
  _sourceIndex: null,
  academy: "",
  title: "",
  startDate: "",
  endDate: "",
  description: "",
});
const blankExperience = () => ({
  _editorKey: nextId(),
  _sourceIndex: null,
  company: "",
  title: "",
  startDate: "",
  endDate: "",
  description: "",
});

const cvLabel = (item) => {
  if (item?.name) return item.name;
  try {
    return decodeURIComponent(
      String(item?.url || "")
        .split("/")
        .pop() || "CV file",
    );
  } catch {
    return "CV file";
  }
};

// Saves a CV to the device (the browser would otherwise just open it).
const downloadCvFile = async (file, onError) => {
  let blobUrl;
  try {
    const response = await fetch(file.url, { credentials: "omit" });
    if (!response.ok) throw new Error();
    const blob = await response.blob();
    blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = await nameWithExtension(cvLabel(file), blob);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    onError?.();
  }
};

// Shows a CV inside the app. PDFs are displayed in a viewer; Word files cannot be displayed by a browser, so the person is pointed to Download instead.
function CvPreview({ file }) {
  const [state, setState] = useState({ loading: true, url: "", message: "" });
  useEffect(() => {
    const controller = new AbortController();
    let pdfUrl;
    (async () => {
      try {
        const response = await fetch(file.url, {
          signal: controller.signal,
          credentials: "omit",
        });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        if ((await cvExtension(blob)) !== ".pdf") {
          setState({
            loading: false,
            url: "",
            message:
              "Preview is not available for Word files. Use Download to open it.",
          });
          return;
        }
        pdfUrl = URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" }),
        );
        setState({ loading: false, url: pdfUrl, message: "" });
      } catch {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            url: "",
            message: "Unable to load this CV. Please try again.",
          });
      }
    })();
    return () => {
      controller.abort();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [file.url]);

  if (state.loading)
    return (
      <p role="status" className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading CV...
      </p>
    );
  if (!state.url)
    return (
      <p role="status" className="text-gray-300 text-sm">
        {state.message}
      </p>
    );
  return (
    <iframe
      src={state.url}
      title={`Preview of ${cvLabel(file)}`}
      className="w-full h-[65dvh] min-h-64 rounded border border-white/10 bg-white"
    />
  );
}

const TalentResumeEditor = ({ extractionOwner }) => {
  const editorActor = extractionOwner?.actor, editorToken = extractionOwner?.token;
  const isCurrentOwner = useCallback(() => browserSessions().some(row => row.actor === editorActor && row.token === editorToken), [editorActor, editorToken]);
  const pendingSave = useRef(null);
  useEffect(() => () => pendingSave.current?.abort(), []);
  const extraction = useRef(null);
  const imports = useRef(new Map());
  const { toast } = useToast();
  const entitlement = useTalentSubscription();
  const entitlementReady = !entitlement.loading && !entitlement.error &&
    entitlement.subscriptionStatus?.role === "talent" &&
    typeof entitlement.subscriptionStatus.paidEligible === "boolean";
  const paidPortfolio = hasTalentPublicAccess(entitlement);
  const portfolioLimit = entitlementReady ? (paidPortfolio ? 20 : 4) : null;
  const navigate = useNavigate();
  const cvInputRef = useRef(null);
  const portfolioInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);

  // Files already saved on the server, and files picked in this session.
  const [existingCv, setExistingCv] = useState([]);
  const [previewCv, setPreviewCv] = useState(null);
  const [newCvFiles, setNewCvFiles] = useState([]);
  const [cvChoices, setCvChoices] = useState([]), [retainedCv, setRetainedCv] = useState(null);
  const [cvAction, setCvAction] = useState("keep"), [replacementArmed, setReplacementArmed] = useState(false);
  const displayedCv = newCvFiles[0] || (existingCv.length === 1 ? existingCv[0] : existingCv.find((_, index) => cvChoices[index]?.ref === retainedCv));
  const [existingPortfolio, setExistingPortfolio] = useState([]);
  const [newPortfolio, setNewPortfolio] = useState([]);
  const pendingPortfolio = useRef(new Map());
  const [pendingPortfolioCount, setPendingPortfolioCount] = useState(0);
  useEffect(() => () => {
    pendingPortfolio.current.clear();
  }, []);
  const [portfolioErrors, setPortfolioErrors] = useState({});
  const [talentProjects, setTalentProjects] = useState([]);
  const savedProjectCount = useRef(0);
  const talentProjectCount = talentProjects.filter(item => !item.removed).length;
  const projectCount = talentProjectCount + existingPortfolio.length + newPortfolio.length;
  const { ceiling: projectCeiling, room: portfolioRoom } = portfolioProjectAllowance({
    ready: entitlementReady, paid: paidPortfolio, savedCount: savedProjectCount.current, projectCount,
  });
  const [portfolioRevision, setPortfolioRevision] = useState("");
  const [awaitingReceipt, setAwaitingReceipt] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const saveAttempt = useRef(null);
  const initialFields = useRef({});

  const [aboutMe, setAboutMe] = useState("");
  const [education, setEducation] = useState([]);
  const educationDraft = useRef(education);
  educationDraft.current = education;
  const educationSources = useRef([]);
  const [experience, setExperience] = useState([]);
  const [skills, setSkills] = useState([]);
  const sectionImports = useRef({ education: imports.current, experience: new Map(), skills: new Map() });
  const currentSections = useRef({}); currentSections.current = { education, experience, skills };

  const [expandedEducation, setExpandedEducation] = useState(new Set());
  const [expandedExperience, setExpandedExperience] = useState(new Set());

  // Allocate previews once outside state updaters. Reconcile removals and revoke
  // every remaining URL when this owner's editor unmounts.
  const previewsRef = useRef(new Map());
  const projectState = useRef({});
  projectState.current = { talent: talentProjects, existing: existingPortfolio, new: newPortfolio };
  useEffect(() => {
    const active = new Set([...talentProjects, ...existingPortfolio, ...newPortfolio]
      .flatMap(project => (project.images || []).map(image => image.preview)).filter(Boolean));
    for (const [key, url] of previewsRef.current) if (!active.has(url)) {
      URL.revokeObjectURL(url);
      previewsRef.current.delete(key);
    }
  }, [talentProjects, existingPortfolio, newPortfolio]);
  useEffect(() => {
    const previews = previewsRef.current;
    return () => { for (const url of previews.values()) URL.revokeObjectURL(url); previews.clear(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchResume = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/resume`, {
          signal: controller.signal, headers: { Authorization: `Bearer ${editorToken}` },
        });
        if (cancelled || !isCurrentOwner()) return;

        const resume = data.resume || {};
        savedProjectCount.current = (data.talentProjects || []).length + (resume.portfolioImages || []).length;
        setTalentProjects((data.talentProjects || []).map(portfolioEditorProject));
        setPortfolioRevision(data.portfolioRevision || "");
        educationSources.current = resume.education || [];
        const edu = educationSources.current.map((item, index) => ({
          ...blankEducation(),
          ...item,
          _editorKey: nextId(),
          ...(!item._id && !item.id ? { _sourceIndex: index } : {}),
        }));
        const exp = (resume.experience || []).map((item, index) => ({
          ...blankExperience(),
          ...item,
          _editorKey: nextId(),
          ...(!item._id && !item.id ? { _sourceIndex: index } : {}),
        }));
        const eduList = edu.length ? edu : [{ ...blankEducation(), _placeholder: true }];
        const expList = exp.length ? exp : [{ ...blankExperience(), _placeholder: true }];
        const skillList = resume.skills?.length ? resume.skills.map((row, index) => ({ ...row, _editorKey: nextId(), ...(!row._id && !row.id ? { _sourceIndex: index } : {}) })) : [{ title: "", percent: "", _sourceIndex: null, _placeholder: true }];

        initialFields.current = {
          aboutMe: resume.aboutMe || "", education: eduList, experience: expList,
          skills: skillList,
        };
        setAboutMe(resume.aboutMe || "");
        setEducation(eduList);
        setExperience(expList);
        setExpandedEducation(new Set([eduList[0]._editorKey]));
        setExpandedExperience(new Set([expList[0]._editorKey]));
        setSkills(skillList);
        setExistingCv(resume.cvFiles || []);
        setCvChoices(data.cvChoices || []);
        setRetainedCv(resume.cvFiles?.length === 1 ? data.cvChoices?.[0]?.ref : null);
        setExistingPortfolio((resume.portfolioImages || []).map(portfolioEditorProject));
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          // No resume saved yet: start with an empty form.
          const edu = blankEducation();
          const exp = blankExperience();
          setEducation([edu]);
          setExperience([exp]);
          setExpandedEducation(new Set([edu._editorKey]));
          setExpandedExperience(new Set([exp._editorKey]));
          setSkills([{ title: "", percent: "" }]);
        } else {
          setLoadError(
            friendlyError(
              err,
              "We couldn't load your resume. Please try again.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResume();
    return () => {
      cancelled = true; controller.abort();
    };
  }, [reloadKey, editorToken, isCurrentOwner]);

  const toggleEducation = (id) => {
    setExpandedEducation((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleExperience = (id) => {
    setExpandedExperience((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCVUpload = (event) => {
    const files = Array.from(event.target.files || []); event.target.value = "";
    if (!files.length) return;
    if (files.length !== 1 || existingCv.length > 1 || existingCv.length && !replacementArmed) {
      toast({ title: "Choose one CV", description: existingCv.length > 1 ? "Choose which saved CV to retain, then save before replacing it." : "Use Replace CV to confirm replacement.", variant: "destructive" }); return;
    }
    const file = files[0];
    if (!file.size || file.size > 10 * 1024 * 1024 || !/\.(pdf|docx?)$/i.test(file.name)
      || !["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      toast({ title: "CV not selected", description: "Choose one PDF, DOC or DOCX up to 10 MiB.", variant: "destructive" }); return;
    }
    setNewCvFiles([file]); setCvAction("replace"); extraction.current?.select([file]);
  };

  const queueGalleryImages = (source, id, files) => {
    if (!files.length || !isCurrentOwner() || saving || awaitingReceipt) return;
    const key = `${source}:${id}`;
    const entry = pendingPortfolio.current.get(key) || { source, id, files: [] };
    const project = projectState.current[source]?.find(item => (source === "talent" ? item.id : item._id) === id);
    const problems = queuePortfolioFiles(entry.files, files, (project?.images || []).filter(image => image.file).map(image => image.file));
    if (entry.files.length) pendingPortfolio.current.set(key, entry);
    setPendingPortfolioCount([...pendingPortfolio.current.values()].reduce((total, row) => total + row.files.length, 0));
    if (problems.length) toast({ title: "Some images were not added", description: problems.join(" "), variant: "destructive" });
  };

  const addProject = () => {
    if (!isCurrentOwner() || !entitlementReady || !portfolioRoom || saving || awaitingReceipt) return;
    setNewPortfolio(previous => [...previous, { ...portfolioEditorProject({ _id: nextId(), title: "", images: [] }), _new: true }]);
  };

  const handlePortfolioUpload = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) queueGalleryImages("create", nextId(), files);
  };

  useEffect(() => {
    if (!pendingPortfolioCount || saving || awaitingReceipt || loading) return;
    if (!isCurrentOwner()) { pendingPortfolio.current.clear(); setPendingPortfolioCount(0); return; }
    let room = portfolioRoom;
    for (const [key, entry] of pendingPortfolio.current) {
      const creating = entry.source === "create";
      if (creating && !entitlementReady) continue;
      const project = creating ? null : projectState.current[entry.source]?.find(item => (entry.source === "talent" ? item.id : item._id) === entry.id);
      if (!creating && (!project || project.removed)) { pendingPortfolio.current.delete(key); continue; }
      const { files, rejected } = takePortfolioFiles(entry.files, {
        ready: true, currentOwner: true,
        room: creating ? room > 0 ? 6 : 0 : Math.max(0, 6 - project.images.length),
      });
      // Drain before state updates to prevent StrictMode replay or duplicate URLs.
      pendingPortfolio.current.delete(key);
      const images = files.map(file => {
        const image = { _editorKey: nextId(), file, preview: URL.createObjectURL(file), alt: "", caption: "", comparisonLabel: "" };
        previewsRef.current.set(image._editorKey, image.preview);
        return image;
      });
      if (creating && images.length) {
        room--;
        setNewPortfolio(previous => [...previous, { ...portfolioEditorProject({ _id: entry.id, title: "", images: [] }), _new: true, images }]);
      } else if (images.length) {
        const setter = entry.source === "talent" ? setTalentProjects : entry.source === "new" ? setNewPortfolio : setExistingPortfolio;
        setter(previous => previous.map(item => (entry.source === "talent" ? item.id : item._id) === entry.id
          ? changePortfolioField(item, "images", [...item.images, ...images]) : item));
      }
      if (rejected) toast({ title: "Some images were not added", description: creating && !images.length
        ? "Your project allowance has been reached. Gallery images in existing projects do not use extra project slots."
        : "A project can contain up to six images, including its cover.", variant: "destructive" });
    }
    setPendingPortfolioCount([...pendingPortfolio.current.values()].reduce((total, row) => total + row.files.length, 0));
  }, [pendingPortfolioCount, entitlementReady, saving, awaitingReceipt, loading, isCurrentOwner, portfolioRoom, toast]);

  const removeNewPortfolio = id => setNewPortfolio(previous => previous.filter(item => item._id !== id));

  const addEducation = () => {
    const item = blankEducation();
    setEducation([...education, item]);
    setExpandedEducation((prev) => new Set(prev).add(item._editorKey));
  };
  const removeEducation = (id) =>
    setEducation(education.filter((e) => e._editorKey !== id));
  const updateEducation = (id, field, value) => {
    setEducation(
      education.map((e) => (e._editorKey === id ? { ...e, [field]: value } : e)),
    );
  };

  const addExperience = () => {
    const item = blankExperience();
    setExperience([...experience, item]);
    setExpandedExperience((prev) => new Set(prev).add(item._editorKey));
  };
  const removeExperience = (id) =>
    setExperience(experience.filter((e) => e._editorKey !== id));
  const updateExperience = (id, field, value) => {
    setExperience(
      experience.map((e) => (e._editorKey === id ? { ...e, [field]: value } : e)),
    );
  };

  const removeSkill = (index) =>
    setSkills(skills.filter((_, i) => i !== index));
  const addSkill = () => setSkills([...skills, { title: "", percent: "0", _editorKey: nextId(), _sourceIndex: null }]);
  const updateSkill = (index, field, value) => {
    setSkills(
      skills.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const updatePortfolio = (id, field, value, isNew) => {
    const setter = isNew ? setNewPortfolio : setExistingPortfolio;
    setter(previous => previous.map(item => item._id === id ? changePortfolioField(item, field, value) : item));
    setPortfolioErrors(previous => ({ ...previous, [id]: "" }));
  };

  const updateTalentProject = (id, field, value) => {
    setTalentProjects(previous => previous.map(item => item.id === id ? changePortfolioField(item, field, value) : item));
    setPortfolioErrors(previous => ({ ...previous, [`talent:${id}`]: "" }));
  };
  const removeTalentProject = id => setTalentProjects(previous => previous.map(item =>
    item.id === id ? { ...item, removed: !item.removed } : item));

  const finishSave = data => {
    if (!extractionOwner || !browserSessions().some(owner => owner.actor === extractionOwner.actor && owner.token === extractionOwner.token)) return;
    if (data.saveState === "committed") {
      saveAttempt.current = null;
      setAwaitingReceipt(false);
      setSaveMessage("");
      toast({ title: "Saved!", description: "All changes have been saved successfully." });
      navigate("/talent-dashboard/profile");
      return;
    }
    if (data.saveState === "failed") {
      saveAttempt.current = null;
      setAwaitingReceipt(false);
    } else setAwaitingReceipt(true);
    setSaveMessage(data.message || "Save status could not be confirmed. Your draft is retained. Check the save status again.");
  };

  const handleSave = async () => {
    if (!isCurrentOwner() || pendingSave.current) return;
    if (saveAttempt.current) {
      const controller = new AbortController(); pendingSave.current = controller;
      setSaving(true);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/resume/save-receipts/${saveAttempt.current}`, {
          signal: controller.signal, headers: { Authorization: `Bearer ${editorToken}` },
        });
        finishSave(data);
      } catch (error) {
        if (portfolioSaveFailure(error)) finishSave(portfolioSaveFailure(error));
        else setSaveMessage("Save status could not be confirmed. Your draft and files are retained. Check the save status again.");
      } finally { pendingSave.current = null; setSaving(false); }
      return;
    }
    if (pendingPortfolio.current.size) return;
    if (projectCount > projectCeiling) {
      toast({ title: "Check your portfolio count", description: entitlementReady
        ? `Your allowance is ${portfolioLimit} projects. Remove a project or undo a new upload before saving. Your saved projects and draft are retained.`
        : "Confirm your portfolio allowance before adding projects. Your draft and files are retained.", variant: "destructive" });
      return;
    }
    const errors = {};
    for (const item of [...existingPortfolio, ...newPortfolio]) {
      try {
        portfolioEditorMetadata(item);
      }
      catch (error) { errors[item._id] = error.message; }
    }
    for (const item of talentProjects.filter(row => !row.removed)) {
      try { portfolioEditorMetadata(item); }
      catch (error) { errors[`talent:${item.id}`] = error.message; }
    }
    setPortfolioErrors(errors);
    if (Object.keys(errors).length) {
      toast({ title: "Check your portfolio", description: "Please correct the project details highlighted below.", variant: "destructive" });
      return;
    }
    try {
      if (JSON.stringify(education) !== JSON.stringify(initialFields.current.education)) prepareEducation(education, educationSources.current);
      setSaving(true);

      setSaveMessage("");
      const formData = new FormData();
      const requestId = crypto.randomUUID();
      formData.append("saveRequestId", requestId);
      formData.append("portfolioRevision", portfolioRevision);
      const draft = portfolioEditorDraft({ talentProjects, existingPortfolio, newPortfolio, cvFiles: newCvFiles });
      formData.append("talentItems", JSON.stringify(draft.talentItems));
      formData.append("portfolioItems", JSON.stringify(draft.portfolioItems));
      newCvFiles.forEach(file => formData.append("cvFiles", file));
      for (const [reference, file] of draft.uploads) formData.append("portfolioImages", file, reference);

      formData.append("cvSelection", JSON.stringify({ action: cvAction, ref: retainedCv }));
      // Compatibility list; the owner-scoped explicit selection is authoritative.
      formData.append(
        "keepCvIds",
        JSON.stringify(existingCv.map((f) => f.public_id)),
      );

      // Unchanged page fields (including blank UI placeholders) must not rewrite stored data.
      for (const [key, value] of Object.entries({ aboutMe, education, experience, skills })) {
        if (JSON.stringify(value) !== JSON.stringify(initialFields.current[key])) {
          formData.append(key, typeof value === "string" ? value : JSON.stringify(value.map(row => { const { _editorKey, _placeholder, ...stored } = row; return stored; })));
        }
      }

      // Include CV selections and other edited Resume sections in the same
      // per-field preflight, before assigning an attempt or making a request.
      for (const [field, value] of formData) if (typeof value === "string") validatePortfolioFieldSize(value, field);
      saveAttempt.current = requestId;
      const controller = new AbortController(); pendingSave.current = controller;
      const { data } = await axios.put(`${API_BASE_URL}/api/resume`, formData, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${editorToken}`,
        },
      });

      finishSave(data);
    } catch (error) {
      if (error.response?.status === 403 && error.response.data?.code === "PORTFOLIO_PROJECT_LIMIT") {
        const limit = error.response.data.limit;
        const message = `${[4, 20].includes(limit)
          ? `Your portfolio allowance is ${limit} projects. `
          : "Your portfolio allowance has been reached. "}Remove a project or replace one without increasing the total. Your draft and files are retained.`;
        finishSave({ ...error.response.data, saveState: "failed", message });
        toast({ title: "Portfolio allowance reached", description: message, variant: "destructive" });
        entitlement.refresh();
      } else if (portfolioSaveFailure(error)) finishSave(portfolioSaveFailure(error));
      else if (saveAttempt.current) {
        setAwaitingReceipt(true);
        setSaveMessage("Save status could not be confirmed. Your draft and files are retained. Check the save status again.");
      } else setSaveMessage(error.response ? friendlyError(error, "Unable to save. Your draft is retained.") : error.message || "Unable to save. Your draft is retained.");
    } finally {
      pendingSave.current = null;
      setSaving(false);
    }
  };

  const inputClass =
    "flex-1 min-w-0 w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors";

  if (loading || loadError) {
    return (
      <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-blue-600 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Resumes
          </h1>
        </div>
        <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-10 max-w-5xl flex flex-col items-center justify-center gap-4 text-gray-400">
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading your resume...</span>
            </>
          ) : (
            <>
              <p>{loadError}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Resumes
        </h1>
      </div>

      <Dialog
        open={Boolean(previewCv)}
        onOpenChange={(open) => {
          if (!open) setPreviewCv(null);
        }}
      >
        <DialogContent className="bg-[#1A1A1E] text-white border-white/10 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">
              {previewCv ? cvLabel(previewCv) : "CV"}
            </DialogTitle>
          </DialogHeader>
          {previewCv && (
            <CvPreview key={previewCv.public_id} file={previewCv} />
          )}
          {previewCv && (
            <button
              type="button"
              onClick={() =>
                downloadCvFile(previewCv, () =>
                  toast({
                    title: "Unable to download CV",
                    description: "Please try again later.",
                    variant: "destructive",
                  }),
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white justify-self-start text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </DialogContent>
      </Dialog>
      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl space-y-8">
        <fieldset disabled={saving || awaitingReceipt} className="min-w-0 space-y-8">
        {/* CV File */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">CV File</h2>
          <div className="space-y-3 mb-4">
            {existingCv.length === 0 && newCvFiles.length === 0 && <p className="text-gray-500 text-sm">No CV uploaded yet.</p>}
            {(existingCv.length > 0 || newCvFiles.length > 0) && <div role="group" aria-label="CV file" className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#22262D] border border-white/5 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-lg bg-blue-600/15 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-blue-400" /></div>
                <div className="min-w-0 flex-1">
                  {existingCv.length > 1 && !newCvFiles.length && <label className="text-sm text-gray-300">Saved CV to retain
                    <select aria-label="Saved CV to retain" value={retainedCv || ""} onChange={event => { setRetainedCv(event.target.value); setCvAction("keep"); }} className="mt-1 w-full rounded-lg border border-white/15 bg-[#0E0E10] px-3 py-2 text-white">
                      <option value="" disabled>Choose a CV</option>{existingCv.map((file, index) => <option key={cvChoices[index]?.ref || index} value={cvChoices[index]?.ref}>{index + 1}. {cvLabel(file)}</option>)}
                    </select>
                  </label>}
                  {displayedCv && <><p className={`text-white text-sm font-medium truncate ${cvAction === "remove" ? "line-through" : ""}`} title={newCvFiles.length ? displayedCv.name : cvLabel(displayedCv)}>{newCvFiles.length ? displayedCv.name : cvLabel(displayedCv)}</p>
                    {!newCvFiles.length && <p className="text-gray-400 text-xs mt-0.5">{cvAction === "remove" ? "Removed from draft" : `${displayedCv.type || "CV"} · Saved`}</p>}</>}
                </div>
              </div>
              {displayedCv && <div className="flex items-center gap-2 flex-shrink-0">
                {!newCvFiles.length && <button type="button" onClick={() => setPreviewCv(displayedCv)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-400 bg-blue-600/10"><Eye className="w-4 h-4" />Preview</button>}
                {(newCvFiles.length > 0 || existingCv.length === 1) && <button type="button" aria-label={cvAction === "remove" ? "Restore CV" : "Remove CV"} title={cvAction === "remove" ? "Restore CV" : "Remove CV"}
                  onClick={() => {
                    extraction.current?.dismiss();
                    if (newCvFiles.length) { setNewCvFiles([]); setCvAction("keep"); setReplacementArmed(false); }
                    else setCvAction(cvAction === "remove" ? "keep" : "remove");
                  }} className="p-2 rounded-lg text-red-400 bg-red-500/10">{cvAction === "remove" ? <Plus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}</button>}
              </div>}
            </div>}
          </div>
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleCVUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => { setReplacementArmed(true); cvInputRef.current?.click(); }}
            disabled={existingCv.length > 1 || saving || awaitingReceipt}
            className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {existingCv.length ? "Replace CV" : newCvFiles.length ? "Change selected CV" : "Browse"}
          </button>
          <span className="ml-3 text-gray-400 text-sm">
            PDF, DOC, DOCX · up to 10 MiB
          </span>
          {existingCv.length > 1 && <p role="alert" className="mt-3 text-sm text-yellow-300">Choose one saved CV to retain, then Save Changes. The other CV records and storage assets will be retained.</p>}
          <EducationExtractionReview ref={extraction} owner={extractionOwner} imports={sectionImports.current}
            education={education} experience={experience} skills={skills} disabled={saving || awaitingReceipt}
            onApply={entries => {
              if (!extractionOwner || !browserSessions().some(owner => owner.actor === extractionOwner.actor && owner.token === extractionOwner.token)) return;
              const next = {};
              for (const section of ["education", "experience", "skills"]) next[section] = appendCvDraft(section, currentSections.current[section], entries[section], nextId, sectionImports.current[section]);
              currentSections.current = next; educationDraft.current = next.education;
              setEducation(next.education); setExperience(next.experience); setSkills(next.skills);
              setExpandedEducation(new Set(next.education.map(row => row._editorKey)));
              setExpandedExperience(new Set(next.experience.map(row => row._editorKey)));
            }} />
        </section>

        {/* Portfolio */}
        <fieldset disabled={saving} className="min-w-0">
          <legend className="text-xl font-semibold text-white mb-4">Your portfolio projects</legend>
          <p id="portfolio-project-count" role="status" aria-live="polite" className="mb-2 break-words text-sm text-gray-300">
            {entitlementReady ? `${projectCount} of ${portfolioLimit} projects used` : `${projectCount} projects used`}
          </p>
          {!entitlementReady && <div role="status" className="mb-4 space-y-2 text-sm text-gray-400">
            <p>{entitlement.loading ? "Checking your portfolio allowance..." : "Your portfolio allowance could not be confirmed. You can still edit or remove saved projects."}</p>
            {!entitlement.loading && <button type="button" onClick={() => entitlement.refresh()}
              disabled={entitlement.retryAt > Date.now()}
              className="min-h-11 rounded-lg border border-blue-600 px-4 py-2 text-blue-400 disabled:opacity-50">Check allowance</button>}
          </div>}
          {entitlementReady && !paidPortfolio && <p className="mb-4 break-words text-sm leading-relaxed text-blue-300">
            Upgrade for up to 20 projects and removal of Qnduit branding with other paid features.
          </p>}
          <p id="portfolio-project-guidance" className="mb-4 break-words text-sm text-gray-400">
            {entitlementReady && savedProjectCount.current > portfolioLimit
              ? "Your saved projects are retained. You can edit or remove projects, but the total saved count cannot increase."
              : entitlementReady && !paidPortfolio && projectCount >= portfolioLimit
                ? "You've reached your free plan limit." : null}
          </p>
          {pendingPortfolioCount > 0 && <p role="status" aria-live="polite" className="mb-4 text-sm text-gray-400">
            {entitlementReady ? "Preparing selected images..." : "Checking your portfolio allowance. Your selected images are retained."}
          </p>}
          <TalentPortfolioProjects projects={talentProjects} errors={portfolioErrors}
            onChange={updateTalentProject} onRemove={removeTalentProject}
            onAddImages={(id, files) => queueGalleryImages("talent", id, files)} />
          {existingPortfolio.length + newPortfolio.length > 0 && (
            <div className="grid min-w-0 grid-cols-1 gap-6 mb-4 md:grid-cols-2">
              {[...existingPortfolio, ...newPortfolio].map((item, index) => (
                <article key={item._id} aria-label={`Portfolio project ${index + 1}`} className="min-w-0 space-y-4 rounded-lg border border-white/10 p-4">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold text-white">{item.title || `Project ${index + 1}`}{item._new ? " · New" : ""}</h3>
                    <button type="button" aria-label={`Remove project ${index + 1}`}
                      onClick={() => item._new ? removeNewPortfolio(item._id) : setExistingPortfolio(previous => previous.filter(row => row._id !== item._id))}
                      className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-sm text-red-300 focus-visible:outline-2">Remove project</button>
                  </div>
                  <PortfolioItemFields item={item} error={portfolioErrors[item._id]}
                    onChange={(field, value) => updatePortfolio(item._id, field, value, Boolean(item._new))}
                    onAddImages={files => queueGalleryImages(item._new ? "new" : "existing", item._id, files)} />
                </article>
              ))}
            </div>
          )}
          <input ref={portfolioInputRef} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" multiple
            disabled={saving || awaitingReceipt} onChange={handlePortfolioUpload} className="hidden" />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addProject} disabled={!entitlementReady || portfolioRoom === 0 || awaitingReceipt}
              aria-describedby="portfolio-project-count portfolio-project-guidance"
              className="min-h-11 max-w-full rounded-lg border border-blue-600 px-5 py-2.5 text-blue-400 focus-visible:outline-2 disabled:opacity-50">Add project</button>
            <button type="button" onClick={() => portfolioInputRef.current?.click()}
              disabled={entitlementReady && portfolioRoom === 0 || awaitingReceipt}
              aria-describedby="portfolio-project-count portfolio-project-guidance"
              className="min-h-11 max-w-full rounded-lg border border-blue-600 px-5 py-2.5 text-blue-400 focus-visible:outline-2 disabled:opacity-50">Create project with images</button>
          </div>
          <p className="mt-2 text-sm text-gray-400">Each project can include six images and uses one project slot. Up to 20 new images and 30 MiB of files per save, including your CV.</p>
        </fieldset>

        {/* Education */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Education</h2>
          {education.map((edu, index) => (
            <div key={edu._editorKey} className="mb-4">
              <div className="flex items-center justify-between bg-[#0E0E10] rounded-lg px-4 py-3 border border-white/10">
                <span className="text-white font-medium">
                  Education {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={`${expandedEducation.has(edu._editorKey) ? "Collapse" : "Expand"} education ${index + 1}`}
                    onClick={() => toggleEducation(edu._editorKey)}
                    className="text-gray-400 hover:text-white"
                  >
                    {expandedEducation.has(edu._editorKey) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    aria-label={`Remove education ${index + 1}`}
                    onClick={() => removeEducation(edu._editorKey)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {expandedEducation.has(edu._editorKey) && (
                <div className="space-y-4 pl-1 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label htmlFor={`institution-${edu._editorKey}`} className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Institution
                    </label>
                    <input
                      type="text"
                      id={`institution-${edu._editorKey}`}
                      value={edu.academy}
                      onChange={(e) =>
                        updateEducation(edu._editorKey, "academy", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label htmlFor={`degree-${edu._editorKey}`} className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Degree level
                    </label>
                    <SavedChoiceSelect id={`degree-${edu._editorKey}`} value={edu.title ?? ""}
                      previous={educationSources.current.find(row => edu._id ? String(row._id) === String(edu._id) : edu.id ? row.id === edu.id : row === educationSources.current[edu._sourceIndex])?.title}
                      options={DEGREE_OPTIONS} placeholder="Select degree level" className={inputClass}
                      onChange={event => updateEducation(edu._editorKey, "title", event.target.value)} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Dates Attended
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input
                          type="text"
                          value={edu.startDate}
                          onChange={(e) =>
                            updateEducation(edu._editorKey, "startDate", e.target.value)
                          }
                          className="w-12 bg-transparent text-white focus:outline-none"
                        />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-gray-400 text-sm">to</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input
                          type="text"
                          value={edu.endDate}
                          onChange={(e) =>
                            updateEducation(edu._editorKey, "endDate", e.target.value)
                          }
                          className="w-12 bg-transparent text-white focus:outline-none"
                        />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0 pt-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={edu.description}
                      onChange={(e) =>
                        updateEducation(edu._editorKey, "description", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={addEducation}
            className="w-full py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-5 h-5" /> Add Another Education
          </button>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Experience</h2>
          {experience.map((exp, index) => (
            <div key={exp._editorKey} className="mb-4">
              <div className="flex items-center justify-between bg-[#0E0E10] rounded-lg px-4 py-3 border border-white/10">
                <span className="text-white font-medium">
                  Experience {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExperience(exp._editorKey)}
                    className="text-gray-400 hover:text-white"
                  >
                    {expandedExperience.has(exp._editorKey) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeExperience(exp._editorKey)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {expandedExperience.has(exp._editorKey) && (
                <div className="space-y-4 pl-1 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Company
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(exp._editorKey, "company", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Title
                    </label>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) =>
                        updateExperience(exp._editorKey, "title", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Dates
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) =>
                            updateExperience(
                              exp._editorKey,
                              "startDate",
                              e.target.value,
                            )
                          }
                          className="w-12 bg-transparent text-white focus:outline-none"
                        />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-gray-400 text-sm">to</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) =>
                            updateExperience(exp._editorKey, "endDate", e.target.value)
                          }
                          className="w-12 bg-transparent text-white focus:outline-none"
                        />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0 pt-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={exp.description}
                      onChange={(e) =>
                        updateExperience(exp._editorKey, "description", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={addExperience}
            className="w-full py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-5 h-5" /> Add Another Experience
          </button>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-1">Skills</h2>
          <p className="text-gray-400 text-sm mb-4">
            Add your main skills and rate how strong you are in each one, from 0
            to 100. They show as progress bars on your profile overview.
          </p>
          <div className="space-y-3">
            {skills.map((skill, index) => {
              const percent = Math.min(
                100,
                Math.max(0, parseInt(skill.percent) || 0),
              );
              return (
                <div
                  key={index}
                  className="bg-[#22262D] border border-white/5 rounded-xl p-3 sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={skill.title}
                      placeholder="Skill, e.g. React"
                      aria-label={`Skill ${index + 1} name`}
                      onChange={(e) =>
                        updateSkill(index, "title", e.target.value)
                      }
                      className="flex-1 min-w-0 px-4 py-2 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={skill.percent}
                        aria-label={`Skill ${index + 1} level in percent`}
                        onChange={(e) =>
                          updateSkill(index, "percent", e.target.value)
                        }
                        className="w-16 px-3 py-2 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove skill"
                      title="Remove skill"
                      onClick={() => removeSkill(index)}
                      className="p-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percent}
                    aria-label={`Skill ${index + 1} level slider`}
                    onChange={(e) =>
                      updateSkill(index, "percent", e.target.value)
                    }
                    className="w-full mt-3 accent-blue-600 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addSkill}
            className="w-full mt-4 py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-5 h-5" /> Add More Skill
          </button>
        </section>

        </fieldset>
        {saveMessage && <p role="alert" className="text-sm text-red-400">{saveMessage}</p>}
        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !awaitingReceipt && (pendingPortfolioCount > 0 || existingCv.length > 1 && !retainedCv)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : awaitingReceipt ? "Check save status" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TalentResumes = () => {
  const { user } = useAuth();
  const actor = user?.userType === "talent" ? `talent:${user.id || user._id}` : null;
  const owner = browserSessions().find(row => row.actor === actor);
  if (!owner) return <p role="status" className="p-6 text-gray-400">Loading your resume...</p>;
  return <TalentResumeEditor key={`${actor}:${owner?.token || ""}`} extractionOwner={owner} />;
};

export default TalentResumes;
