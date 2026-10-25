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
    blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = cvLabel(file);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    onError?.();
  }
};

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
  const [newCvFiles, setNewCvFiles] = useState([]);
  const [existingPortfolio, setExistingPortfolio] = useState([]);
  const [newPortfolio, setNewPortfolio] = useState([]); // [{ file, preview }]

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
        accepted.push({ file, preview: URL.createObjectURL(file) });
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

  const removeNewPortfolio = (index) => {
    setNewPortfolio((prev) => {
      URL.revokeObjectURL(prev[index]?.preview);
      return prev.filter((_, i) => i !== index);
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

  const handleSave = async () => {
    try {
      setSaving(true);

      const formData = new FormData();

      newCvFiles.forEach((file) => formData.append("cvFiles", file));
      newPortfolio.forEach((item) =>
        formData.append("portfolioImages", item.file),
      );

      // Tell the server which saved files to keep; the rest are removed.
      formData.append(
        "keepCvIds",
        JSON.stringify(existingCv.map((f) => f.public_id)),
      );
      formData.append(
        "keepPortfolioIds",
        JSON.stringify(existingPortfolio.map((f) => f.public_id)),
      );

      formData.append("aboutMe", aboutMe);
      formData.append("education", JSON.stringify(education));
      formData.append("experience", JSON.stringify(experience));
      formData.append("skills", JSON.stringify(skills));

      await axios.put(`${API_BASE_URL}/api/resume`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast({
        title: "Saved!",
        description: "Your resume has been saved successfully.",
      });

      navigate("/talent-dashboard/profile");
    } catch (error) {
      toast({
        title: "Error",
        description: friendlyError(
          error,
          "We couldn't save your resume. Please try again.",
        ),
        variant: "destructive",
      });
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

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl space-y-8">
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
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-400 bg-blue-600/10 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCvFile(file, () =>
                        toast({
                          title: "Unable to download CV",
                          description: "Please try again later.",
                          variant: "destructive",
                        }),
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-200 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    aria-label="Remove CV"
                    title="Remove CV"
                    onClick={() =>
                      setExistingCv(
                        existingCv.filter((f) => f.public_id !== file.public_id),
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
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
          {existingPortfolio.length + newPortfolio.length > 0 && (
            <div className="flex gap-4 mb-4 flex-wrap">
              {existingPortfolio.map((img, index) => (
                <div key={img.public_id} className="relative group">
                  <div className="w-40 h-32 bg-[#2A2A2E] rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={img.url}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() =>
                      setExistingPortfolio(
                        existingPortfolio.filter(
                          (f) => f.public_id !== img.public_id,
                        ),
                      )
                    }
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {newPortfolio.map((item, index) => (
                <div key={item.preview} className="relative group">
                  <div className="w-40 h-32 bg-[#2A2A2E] rounded-lg overflow-hidden border border-blue-500/40">
                    <img
                      src={item.preview}
                      alt={`New portfolio ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => removeNewPortfolio(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
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
            Browse
          </button>
          <span className="ml-3 text-gray-400 text-sm">
            Select one or more images (PNG or JPG, 5MB each) ·{" "}
            {existingPortfolio.length + newPortfolio.length}/{MAX_PORTFOLIO}
          </span>
        </section>

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
            Add your main skills and rate how strong you are in each one, from
            0 to 100. They show as progress bars on your profile overview.
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

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TalentResumes;
