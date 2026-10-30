import React, { useState, useRef, useEffect } from "react";
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
import { portfolioMetadata } from "../../../backend/src/utils/portfolioMetadata.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const MAX_CV_FILES = 5;
const MAX_PORTFOLIO = 10;
const PORTFOLIO_TYPES = ["image/png", "image/jpeg", "image/jpg"];

let localId = 0;
const nextId = () => `local-${Date.now()}-${localId++}`;

const blankEducation = () => ({
  id: nextId(),
  academy: "",
  title: "",
  startDate: "",
  endDate: "",
  description: "",
});
const blankExperience = () => ({
  id: nextId(),
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

const TalentResumes = () => {
  const { toast } = useToast();
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
  const [existingPortfolio, setExistingPortfolio] = useState([]);
  const [newPortfolio, setNewPortfolio] = useState([]);
  const [portfolioErrors, setPortfolioErrors] = useState({});
  const [talentProjects, setTalentProjects] = useState([]);
  const [portfolioRevision, setPortfolioRevision] = useState("");
  const [awaitingReceipt, setAwaitingReceipt] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const saveAttempt = useRef(null);
  const initialFields = useRef({});

  const [aboutMe, setAboutMe] = useState("");
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [skills, setSkills] = useState([]);

  const [expandedEducation, setExpandedEducation] = useState(new Set());
  const [expandedExperience, setExpandedExperience] = useState(new Set());

  // Free the preview URLs when leaving the page.
  const previewsRef = useRef([]);
  previewsRef.current = newPortfolio;
  useEffect(
    () => () =>
      previewsRef.current.forEach((item) => URL.revokeObjectURL(item.preview)),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchResume = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/resume`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (cancelled) return;

        const resume = data.resume || {};
        setTalentProjects(data.talentProjects || []);
        setPortfolioRevision(data.portfolioRevision || "");
        const edu = (resume.education || []).map((item) => ({
          ...blankEducation(),
          ...item,
          id: nextId(),
        }));
        const exp = (resume.experience || []).map((item) => ({
          ...blankExperience(),
          ...item,
          id: nextId(),
        }));
        const eduList = edu.length ? edu : [blankEducation()];
        const expList = exp.length ? exp : [blankExperience()];

        initialFields.current = {
          aboutMe: resume.aboutMe || "", education: eduList, experience: expList,
          skills: resume.skills?.length ? resume.skills : [{ title: "", percent: "" }],
        };
        setAboutMe(resume.aboutMe || "");
        setEducation(eduList);
        setExperience(expList);
        setExpandedEducation(new Set([eduList[0].id]));
        setExpandedExperience(new Set([expList[0].id]));
        setSkills(
          resume.skills?.length ? resume.skills : [{ title: "", percent: "" }],
        );
        setExistingCv(resume.cvFiles || []);
        setExistingPortfolio(resume.portfolioImages || []);
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          // No resume saved yet: start with an empty form.
          const edu = blankEducation();
          const exp = blankExperience();
          setEducation([edu]);
          setExperience([exp]);
          setExpandedEducation(new Set([edu.id]));
          setExpandedExperience(new Set([exp.id]));
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
      cancelled = true;
    };
  }, [reloadKey]);

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

  const handleCVUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (cvInputRef.current) cvInputRef.current.value = "";
    if (!files.length) return;

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    let room = MAX_CV_FILES - existingCv.length - newCvFiles.length;
    const accepted = [];
    let skipped = 0;

    for (const file of files) {
      if (
        file.size > maxSize ||
        !allowedTypes.includes(file.type) ||
        room <= 0
      ) {
        skipped += 1;
        continue;
      }
      accepted.push(file);
      room -= 1;
    }

    if (accepted.length) setNewCvFiles((prev) => [...prev, ...accepted]);
    if (skipped) {
      toast({
        title: "Some files were not added",
        description: `Only PDF, Doc or Docx files under 10MB are accepted, up to ${MAX_CV_FILES} CV files in total.`,
        variant: "destructive",
      });
    }
  };

  const handlePortfolioUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (portfolioInputRef.current) portfolioInputRef.current.value = "";
    if (!files.length) return;

    let room = MAX_PORTFOLIO - existingPortfolio.length - newPortfolio.length;
    const accepted = [];
    let wrongType = 0;
    let tooBig = 0;
    let noRoom = 0;

    for (const file of files) {
      if (!PORTFOLIO_TYPES.includes(file.type)) wrongType += 1;
      else if (file.size > 5 * 1024 * 1024) tooBig += 1;
      else if (room <= 0) noRoom += 1;
      else {
        accepted.push({ _id: nextId(), file, preview: URL.createObjectURL(file), description: "", projectUrl: "", skills: [] });
        room -= 1;
      }
    }

    if (accepted.length) setNewPortfolio((prev) => [...prev, ...accepted]);

    const problems = [];
    if (wrongType) problems.push(`${wrongType} not a PNG or JPG image`);
    if (tooBig) problems.push(`${tooBig} over 5MB`);
    if (noRoom)
      problems.push(`${noRoom} over the limit of ${MAX_PORTFOLIO} images`);
    if (problems.length) {
      toast({
        title: "Some images were not added",
        description: problems.join(", ") + ".",
        variant: "destructive",
      });
    }
  };

  const removeNewPortfolio = (id) => {
    setNewPortfolio((prev) => {
      URL.revokeObjectURL(prev.find(item => item._id === id)?.preview);
      return prev.filter(item => item._id !== id);
    });
  };

  const addEducation = () => {
    const item = blankEducation();
    setEducation([...education, item]);
    setExpandedEducation((prev) => new Set(prev).add(item.id));
  };
  const removeEducation = (id) =>
    setEducation(education.filter((e) => e.id !== id));
  const updateEducation = (id, field, value) => {
    setEducation(
      education.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const addExperience = () => {
    const item = blankExperience();
    setExperience([...experience, item]);
    setExpandedExperience((prev) => new Set(prev).add(item.id));
  };
  const removeExperience = (id) =>
    setExperience(experience.filter((e) => e.id !== id));
  const updateExperience = (id, field, value) => {
    setExperience(
      experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const removeSkill = (index) =>
    setSkills(skills.filter((_, i) => i !== index));
  const addSkill = () => setSkills([...skills, { title: "", percent: "0" }]);
  const updateSkill = (index, field, value) => {
    setSkills(
      skills.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const updatePortfolio = (id, field, value, isNew) => {
    const setter = isNew ? setNewPortfolio : setExistingPortfolio;
    setter(previous => previous.map(item => item._id === id ? { ...item, [field]: value } : item));
    setPortfolioErrors(previous => ({ ...previous, [id]: "" }));
  };

  const updateTalentProject = (id, field, value) => {
    setTalentProjects(previous => previous.map(item => item.id === id ? { ...item, [field]: value } : item));
    setPortfolioErrors(previous => ({ ...previous, [`talent:${id}`]: "" }));
  };
  const removeTalentProject = id => setTalentProjects(previous => previous.map(item =>
    item.id === id ? { ...item, removed: !item.removed } : item));

  const finishSave = data => {
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
    if (saveAttempt.current) {
      setSaving(true);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/resume/save-receipts/${saveAttempt.current}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        finishSave(data);
      } catch (error) {
        if (error.response?.data?.saveState === "failed") finishSave(error.response.data);
        else setSaveMessage("Save status could not be confirmed. Your draft and files are retained. Check the save status again.");
      } finally { setSaving(false); }
      return;
    }
    const errors = {};
    const metadata = new Map();
    for (const item of [...existingPortfolio, ...newPortfolio]) {
      try { metadata.set(item._id, portfolioMetadata(item)); }
      catch (error) { errors[item._id] = error.message; }
    }
    for (const item of talentProjects.filter(row => !row.removed)) {
      try { portfolioMetadata(item); }
      catch (error) { errors[`talent:${item.id}`] = error.message; }
    }
    setPortfolioErrors(errors);
    if (Object.keys(errors).length) {
      toast({ title: "Check your portfolio", description: "Please correct the project details highlighted below.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);

      setSaveMessage("");
      const formData = new FormData();
      const requestId = crypto.randomUUID();
      formData.append("saveRequestId", requestId);
      formData.append("portfolioRevision", portfolioRevision);
      formData.append("talentItems", JSON.stringify(talentProjects.map(item => item.removed
        ? { ref: item.ref, remove: true } : { ref: item.ref, ...portfolioMetadata(item) })));

      newCvFiles.forEach((file) => formData.append("cvFiles", file));
      const uploadReference = item => `${item._id}.${item.file.type === "image/png" ? "png" : "jpg"}`;
      newPortfolio.forEach(item => formData.append("portfolioImages", item.file, uploadReference(item)));
      formData.append("portfolioItems", JSON.stringify([
        ...existingPortfolio.map(item => ({ id: item._id, ...metadata.get(item._id) })),
        ...newPortfolio.map(item => ({ upload: uploadReference(item), ...metadata.get(item._id) })),
      ]));

      // Tell the server which saved files to keep; the rest are removed.
      formData.append(
        "keepCvIds",
        JSON.stringify(existingCv.map((f) => f.public_id)),
      );

      // Unchanged page fields (including blank UI placeholders) must not rewrite stored data.
      for (const [key, value] of Object.entries({ aboutMe, education, experience, skills })) {
        if (JSON.stringify(value) !== JSON.stringify(initialFields.current[key])) {
          formData.append(key, typeof value === "string" ? value : JSON.stringify(value));
        }
      }

      saveAttempt.current = requestId;
      const { data } = await axios.put(`${API_BASE_URL}/api/resume`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      finishSave(data);
    } catch (error) {
      if (error.response?.data?.saveState === "failed") finishSave(error.response.data);
      else if (saveAttempt.current) {
        setAwaitingReceipt(true);
        setSaveMessage("Save status could not be confirmed. Your draft and files are retained. Check the save status again.");
      } else setSaveMessage(friendlyError(error, "Unable to save. Your draft is retained."));
    } finally {
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
            {existingCv.length + newCvFiles.length === 0 && (
              <p className="text-gray-500 text-sm">No CV uploaded yet.</p>
            )}
            {existingCv.map((file) => (
              <div
                key={file.public_id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#22262D] border border-white/5 rounded-xl p-3 sm:p-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-lg bg-blue-600/15 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-white text-sm font-medium truncate"
                      title={cvLabel(file)}
                    >
                      {cvLabel(file)}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {file.type || "CV"} · Saved
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewCv(file)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-400 bg-blue-600/10 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    type="button"
                    aria-label="Remove CV"
                    title="Remove CV"
                    onClick={() =>
                      setExistingCv(
                        existingCv.filter(
                          (f) => f.public_id !== file.public_id,
                        ),
                      )
                    }
                    className="p-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {newCvFiles.map((file, index) => (
              <div
                key={`new-${index}`}
                className="flex items-center gap-3 bg-[#22262D] border border-dashed border-blue-500/40 rounded-xl p-3 sm:p-4"
              >
                <div className="w-11 h-11 rounded-lg bg-blue-600/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-white text-sm font-medium truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-yellow-400/90 text-xs mt-0.5">
                    Will upload when you save
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove CV"
                  title="Remove CV"
                  onClick={() =>
                    setNewCvFiles(newCvFiles.filter((_, i) => i !== index))
                  }
                  className="p-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={handleCVUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cvInputRef.current?.click()}
            disabled={existingCv.length + newCvFiles.length >= MAX_CV_FILES}
            className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors disabled:opacity-50"
          >
            Browse
          </button>
          <span className="ml-3 text-gray-400 text-sm">
            Upload PDF, Doc, Docx (up to {MAX_CV_FILES}, 10MB each)
          </span>
        </section>

        {/* Portfolio */}
        <fieldset disabled={saving} className="min-w-0">
          <legend className="text-xl font-semibold text-white mb-4">Portfolio</legend>
          <TalentPortfolioProjects projects={talentProjects} errors={portfolioErrors}
            onChange={updateTalentProject} onRemove={removeTalentProject} />
          {existingPortfolio.length + newPortfolio.length > 0 && (
            <div className="grid min-w-0 grid-cols-1 gap-6 mb-4 md:grid-cols-2">
              {[...existingPortfolio, ...newPortfolio].map((item, index) => (
                <article key={item._id} aria-label={`Portfolio project ${index + 1}`} className="min-w-0 space-y-4 rounded-lg border border-white/10 p-4">
                  <div className="relative group w-40 max-w-full">
                    <div className="h-32 bg-[#2A2A2E] rounded-lg overflow-hidden border border-white/10">
                      <img src={item.preview || item.url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <button type="button" aria-label={`Remove portfolio image ${index + 1}`}
                      onClick={() => item.file ? removeNewPortfolio(item._id) : setExistingPortfolio(previous => previous.filter(row => row._id !== item._id))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <PortfolioItemFields item={item} error={portfolioErrors[item._id]}
                    onChange={(field, value) => updatePortfolio(item._id, field, value, Boolean(item.file))} />
                </article>
              ))}
            </div>
          )}
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={handlePortfolioUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => portfolioInputRef.current?.click()}
            disabled={
              existingPortfolio.length + newPortfolio.length >= MAX_PORTFOLIO
            }
            className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors disabled:opacity-50"
          >
            Add portfolio images
          </button>
          <p className="mt-1 text-sm text-gray-400">
            PNG/JPG · 5 MB per image · {existingPortfolio.length + newPortfolio.length}/{MAX_PORTFOLIO} images
          </p>
        </fieldset>

        {/* Education */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Education</h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4">
              <div className="flex items-center justify-between bg-[#0E0E10] rounded-lg px-4 py-3 border border-white/10">
                <span className="text-white font-medium">
                  Education {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEducation(edu.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    {expandedEducation.has(edu.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeEducation(edu.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {expandedEducation.has(edu.id) && (
                <div className="space-y-4 pl-1 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Academy
                    </label>
                    <input
                      type="text"
                      value={edu.academy}
                      onChange={(e) =>
                        updateEducation(edu.id, "academy", e.target.value)
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
                      value={edu.title}
                      onChange={(e) =>
                        updateEducation(edu.id, "title", e.target.value)
                      }
                      className={inputClass}
                    />
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
                            updateEducation(edu.id, "startDate", e.target.value)
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
                            updateEducation(edu.id, "endDate", e.target.value)
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
                        updateEducation(edu.id, "description", e.target.value)
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
            <div key={exp.id} className="mb-4">
              <div className="flex items-center justify-between bg-[#0E0E10] rounded-lg px-4 py-3 border border-white/10">
                <span className="text-white font-medium">
                  Experience {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExperience(exp.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    {expandedExperience.has(exp.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeExperience(exp.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {expandedExperience.has(exp.id) && (
                <div className="space-y-4 pl-1 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <label className="text-gray-400 text-sm sm:w-28 shrink-0">
                      Company
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) =>
                        updateExperience(exp.id, "company", e.target.value)
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
                        updateExperience(exp.id, "title", e.target.value)
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
                              exp.id,
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
                            updateExperience(exp.id, "endDate", e.target.value)
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
                        updateExperience(exp.id, "description", e.target.value)
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
            disabled={saving}
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

export default TalentResumes;
