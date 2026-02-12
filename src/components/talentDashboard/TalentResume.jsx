import React, { useState, useRef } from "react";
import { FileText, X, Plus, ChevronDown, ChevronUp, Calendar, Loader2 } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";

const TalentResumes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const cvInputRef = useRef(null);
  const portfolioInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [cvFiles, setCvFiles] = useState([]);
  const [portfolioImages, setPortfolioImages] = useState([null, null, null]);
  const [aboutMe, setAboutMe] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [education, setEducation] = useState([
    { id: 1, academy: "", title: "", startDate: "", endDate: "", description: "" },
  ]);

  const [experience, setExperience] = useState([
    { id: 1, company: "", title: "", startDate: "", endDate: "", description: "" },
  ]);

  const [skills, setSkills] = useState([
    { title: "", percent: "" },
    
  ]);

  const [expandedEducation, setExpandedEducation] = useState(new Set([1]));
  const [expandedExperience, setExpandedExperience] = useState(new Set([1]));

  const toggleEducation = (id) => {
    setExpandedEducation(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleExperience = (id) => {
    setExpandedExperience(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleCVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (file.size > maxSize) { toast({ title: "Upload Error", description: "File exceeds 10MB limit", variant: "destructive" }); return; }
    if (!allowedTypes.includes(file.type)) { toast({ title: "Upload Error", description: "Only PDF, Doc, Docx allowed", variant: "destructive" }); return; }
    setCvFiles([...cvFiles, { name: file.name, type: file.type.includes("pdf") ? "PDF" : "Doc" }]);
    toast({ title: "Success", description: "CV uploaded successfully" });
    if (cvInputRef.current) cvInputRef.current.value = "";
  };

  const handlePortfolioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Upload Error", description: "Image exceeds 5MB limit", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const firstEmpty = portfolioImages.findIndex((img) => img === null);
      if (firstEmpty !== -1) {
        const newImages = [...portfolioImages];
        newImages[firstEmpty] = event.target?.result;
        setPortfolioImages(newImages);
        toast({ title: "Success", description: "Image uploaded successfully" });
      }
    };
    reader.readAsDataURL(file);
    if (portfolioInputRef.current) portfolioInputRef.current.value = "";
  };

  const addEducation = () => { const id = Date.now(); setEducation([...education, { id, academy: "", title: "", startDate: "", endDate: "", description: "" }]); setExpandedEducation(prev => new Set(prev).add(id)); };
  const removeEducation = (id) => setEducation(education.filter((e) => e.id !== id));
  const updateEducation = (id, field, value) => {
    setEducation(education.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addExperience = () => { const id = Date.now(); setExperience([...experience, { id, company: "", title: "", startDate: "", endDate: "", description: "" }]); setExpandedExperience(prev => new Set(prev).add(id)); };
  const removeExperience = (id) => setExperience(experience.filter((e) => e.id !== id));
  const updateExperience = (id, field, value) => {
    setExperience(experience.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeSkill = (index) => setSkills(skills.filter((_, i) => i !== index));
  const addSkill = () => setSkills([...skills, { title: "", percent: "0" }]);
  const updateSkill = (index, field, value) => {
    setSkills(skills.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const data = { cvFiles, portfolioImages, aboutMe, videoUrl, education, experience, skills };
    localStorage.setItem("resumeData", JSON.stringify(data));
    setSaving(false);
    toast({ title: "Saved!", description: "Your resume has been saved successfully." });
    navigate("/talent-dashboard/profile");
  };

  const inputClass = "flex-1 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Resumes</h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl space-y-8">
        {/* CV File */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">CV File</h2>
          <div className="flex gap-4 mb-4 flex-wrap">
            {cvFiles.map((file, index) => (
              <div key={index} className="relative flex items-center gap-3 bg-[#2A2A2E] rounded-full px-4 py-2 pr-10">
                <div>
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  <p className="text-gray-400 text-xs">{file.type}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
                <button onClick={() => setCvFiles(cvFiles.filter((_, i) => i !== index))} className="absolute -right-2 -top-1 text-red-500 hover:text-red-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
          <button onClick={() => cvInputRef.current?.click()} className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors">Browse</button>
          <span className="ml-3 text-gray-400 text-sm">Upload file PDF, Doc, Docx</span>
        </section>

        {/* Portfolio */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
          <div className="flex gap-4 mb-4 flex-wrap">
            {portfolioImages.map((img, index) => (
              <div key={index} className="relative group">
                <div className="w-40 h-32 bg-[#2A2A2E] rounded-lg flex items-center justify-center overflow-hidden border border-white/10 border-dashed">
                  {img ? <img src={img} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" /> : <Plus className="w-6 h-6 text-gray-500" />}
                </div>
                {img && (
                  <button onClick={() => { const n = [...portfolioImages]; n[index] = null; setPortfolioImages(n); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <input ref={portfolioInputRef} type="file" accept="image/*" onChange={handlePortfolioUpload} className="hidden" />
          <button onClick={() => portfolioInputRef.current?.click()} className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors">Browse</button>
          <span className="ml-3 text-gray-400 text-sm">Upload image</span>
        </section>

        {/* Introduction Video */}
        <section>
          <label className="block text-gray-400 text-sm mb-2">Introduction Video</label>
          <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors" placeholder="https://www.youtube.com/watch?v=..." />
        </section>

        {/* Education */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Education</h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4">
              <div className="flex items-center justify-between bg-[#0E0E10] rounded-lg px-4 py-3 border border-white/10">
                <span className="text-white font-medium">Education {index + 1}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleEducation(edu.id)} className="text-gray-400 hover:text-white">
                    {expandedEducation.has(edu.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => removeEducation(edu.id)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                </div>
              </div>
              {expandedEducation.has(edu.id) && (
                <div className="space-y-4 pl-1 mt-4">
                  <div className="flex items-center gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0">Academy</label>
                    <input type="text" value={edu.academy} onChange={e => updateEducation(edu.id, "academy", e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0">Title</label>
                    <input type="text" value={edu.title} onChange={e => updateEducation(edu.id, "title", e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0">Dates Attended</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input type="text" value={edu.startDate} onChange={e => updateEducation(edu.id, "startDate", e.target.value)} className="w-12 bg-transparent text-white focus:outline-none" />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-gray-400 text-sm">to</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input type="text" value={edu.endDate} onChange={e => updateEducation(edu.id, "endDate", e.target.value)} className="w-12 bg-transparent text-white focus:outline-none" />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0 pt-2">Description</label>
                    <textarea rows={3} value={edu.description} onChange={e => updateEducation(edu.id, "description", e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={addEducation} className="w-full py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
            <Plus className="w-5 h-5" /> Add Another Education
          </button>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Experience</h2>
          {experience.map((exp, index) => (
            <div key={exp.id} className="mb-4">
              <div className="flex items-center justify-between bg-[#0E0E10] rounded-lg px-4 py-3 border border-white/10">
                <span className="text-white font-medium">Experience {index + 1}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleExperience(exp.id)} className="text-gray-400 hover:text-white">
                    {expandedExperience.has(exp.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => removeExperience(exp.id)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                </div>
              </div>
              {expandedExperience.has(exp.id) && (
                <div className="space-y-4 pl-1 mt-4">
                  <div className="flex items-center gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0">Company</label>
                    <input type="text" value={exp.company} onChange={e => updateExperience(exp.id, "company", e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0">Title</label>
                    <input type="text" value={exp.title} onChange={e => updateExperience(exp.id, "title", e.target.value)} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0">Dates</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input type="text" value={exp.startDate} onChange={e => updateExperience(exp.id, "startDate", e.target.value)} className="w-12 bg-transparent text-white focus:outline-none" />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-gray-400 text-sm">to</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg">
                        <input type="text" value={exp.endDate} onChange={e => updateExperience(exp.id, "endDate", e.target.value)} className="w-12 bg-transparent text-white focus:outline-none" />
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <label className="text-gray-400 text-sm w-28 shrink-0 pt-2">Description</label>
                    <textarea rows={3} value={exp.description} onChange={e => updateExperience(exp.id, "description", e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={addExperience} className="w-full py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
            <Plus className="w-5 h-5" /> Add Another Experience
          </button>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Skill</h2>
          <div className="space-y-4">
            {skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-4">
                <label className="text-gray-400 text-sm w-16 shrink-0">Title</label>
                <input type="text" value={skill.title} onChange={e => updateSkill(index, "title", e.target.value)} className="px-4 py-2 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 w-40" />
                <label className="text-gray-400 text-sm shrink-0">Percent</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={skill.percent} onChange={e => updateSkill(index, "percent", e.target.value)} className="w-16 px-4 py-2 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500" />
                  <span className="text-gray-400">%</span>
                </div>
                <button onClick={() => removeSkill(index)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
          <button onClick={addSkill} className="w-full mt-4 py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
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