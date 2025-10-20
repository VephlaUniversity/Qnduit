import React, { useState, useRef } from "react";
import { FileText, X, Plus, Edit2 } from "lucide-react";
import { TextEditor } from "../TextEditor";
import { validateFile } from "../utils/formValidation";
import { useToast } from "../hooks/useToast";

export const TalentResumes = () => {
  const { toast } = useToast();
  const cvInputRef = useRef(null);
  const portfolioInputRef = useRef(null);

  const [cvFiles, setCvFiles] = useState([
    { name: "SAMPLE_CV_JOBITEX", type: "PDF" },
    { name: "SAMPLE_CV_JOBITEX", type: "Doc" },
  ]);

  const [portfolioImages, setPortfolioImages] = useState([null, null, null]);
  const [aboutMe, setAboutMe] = useState(
    "Are you a User Experience Designer with a track record of delivering intuitive digital experiences that drive results? Are you a strategic storyteller and systems thinker who can concept and craft smart, world-class campaigns across a variety of mediums"
  );

  const [education, setEducation] = useState([
    {
      id: 1,
      academy: "Fine Arts University",
      title: "Design",
      startDate: "2008",
      endDate: "2013",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    },
  ]);

  const [experience, setExperience] = useState([
    {
      id: 1,
      company: "Avitex Inc",
      title: "UI UX Designer",
      startDate: "2008",
      endDate: "2013",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    },
  ]);

  const [skills, setSkills] = useState([
    { title: "Figma", percent: "80" },
    { title: "Photoshop", percent: "80" },
    { title: "PHP", percent: "80" },
    { title: "HTML/CSS", percent: "80" },
  ]);

  const handleCVUpload = (e) => {
    const file = e.target.files[0];
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024,
      allowedTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    });

    if (!validation.valid) {
      toast({
        title: "Upload Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setCvFiles([
      ...cvFiles,
      { name: file.name, type: file.type.includes("pdf") ? "PDF" : "Doc" },
    ]);
    toast({ title: "Success", description: "CV uploaded successfully" });
  };

  const handlePortfolioUpload = (e) => {
    const file = e.target.files[0];
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    });

    if (!validation.valid) {
      toast({
        title: "Upload Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const firstEmpty = portfolioImages.findIndex((img) => img === null);
      if (firstEmpty !== -1) {
        const newImages = [...portfolioImages];
        newImages[firstEmpty] = event.target.result;
        setPortfolioImages(newImages);
        toast({ title: "Success", description: "Image uploaded successfully" });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Resumes
        </h1>
      </div>

      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 md:p-8 max-w-5xl space-y-8">
        {/* CV File Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">CV File</h2>
          <div className="flex gap-4 mb-4 flex-wrap">
            {cvFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="w-32 h-32 bg-[#2A2A2E] rounded-lg border border-white/10 flex flex-col items-center justify-center p-4">
                  <FileText className="w-12 h-12 text-blue-500 mb-2" />
                  <p className="text-white text-xs text-center font-medium truncate w-full">
                    {file.name}
                  </p>
                  <p className="text-gray-400 text-xs">{file.type}</p>
                </div>
                <button
                  onClick={() =>
                    setCvFiles(cvFiles.filter((_, i) => i !== index))
                  }
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleCVUpload}
            className="hidden"
          />
          <button
            onClick={() => cvInputRef.current?.click()}
            className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors"
          >
            Browse
          </button>
          <span className="ml-3 text-gray-400 text-sm">
            Upload file PDF, Doc, Docx (max 10MB)
          </span>
        </div>

        {/* About Me with Text Editor */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">About Me</h2>
          <TextEditor value={aboutMe} onChange={setAboutMe} />
        </div>

        {/* Portfolio Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
          <div className="flex gap-4 mb-4 flex-wrap">
            {portfolioImages.map((img, index) => (
              <div key={index} className="relative group">
                <div className="w-40 h-40 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={`Portfolio ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400">Image {index + 1}</div>
                  )}
                </div>
                {img && (
                  <button
                    onClick={() => {
                      const newImages = [...portfolioImages];
                      newImages[index] = null;
                      setPortfolioImages(newImages);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*"
            onChange={handlePortfolioUpload}
            className="hidden"
          />
          <button
            onClick={() => portfolioInputRef.current?.click()}
            className="px-6 py-2.5 bg-transparent border border-blue-600 hover:bg-blue-600/10 text-blue-500 rounded-lg transition-colors"
          >
            Browse
          </button>
          <span className="ml-3 text-gray-400 text-sm">
            Upload image (max 5MB)
          </span>
        </div>

        {/* Introduction Video */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">
            Introduction Video
          </label>
          <input
            type="text"
            defaultValue="https://www.youtube.com/watch?v=IzIZLgjk_ba90"
            className="w-full px-4 py-3 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        {/* Education Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Education</h2>
          {education.map((edu, index) => (
            <div
              key={edu.id}
              className="mb-4 bg-[#0E0E10] rounded-lg border border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">
                  Education {index + 1}
                </span>
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Academy
                  </label>
                  <input
                    type="text"
                    defaultValue={edu.academy}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    defaultValue={edu.title}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-blue-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Dates Attended
                  </label>
                  <input
                    type="text"
                    defaultValue={edu.startDate}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Dates Attended
                  </label>
                  <input
                    type="text"
                    defaultValue={edu.endDate}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={edu.description}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
          <button className="w-full py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Add Another Education
          </button>
        </div>

        {/* Experience Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Experience</h2>
          {experience.map((exp, index) => (
            <div
              key={exp.id}
              className="mb-4 bg-[#0E0E10] rounded-lg border border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">
                  Experience {index + 1}
                </span>
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    defaultValue={exp.company}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-blue-500 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    defaultValue={exp.title}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Dates
                  </label>
                  <input
                    type="text"
                    defaultValue={exp.startDate}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Dates Attended
                  </label>
                  <input
                    type="text"
                    defaultValue={exp.endDate}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={exp.description}
                    className="w-full px-4 py-2 bg-[#1A1A1E] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
          <button className="w-full py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Add Another Experience
          </button>
        </div>

        {/* Skills Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Skill</h2>
          <div className="space-y-4">
            {skills.map((skill, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                  <label className="block text-gray-400 text-sm mb-2">
                    Title
                  </label>
                  <select className="w-full px-4 py-2 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    <option>{skill.title}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">
                    Percent
                  </label>
                  <input
                    type="text"
                    defaultValue={skill.percent}
                    className="w-full px-4 py-2 bg-[#0E0E10] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1 flex items-end pb-2">
                  <span className="text-gray-400">%</span>
                </div>
                <div className="col-span-1 flex items-end pb-2">
                  <button className="text-gray-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-3 border border-blue-600 text-blue-500 rounded-lg hover:bg-blue-600/10 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Add More Skill
          </button>
        </div>
      </div>
    </div>
  );
};

export default TalentResumes;
