import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Facebook, Linkedin, Twitter, Instagram, Youtube, X } from "lucide-react";
import RecentApplication from "./RecentApplication"

const TalentProfileOverview = () => {
  const navigate = useNavigate();
  const [resumeData, setResumeData] = useState(null);
  const [aboutData, setAboutData] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);

  useEffect(() => {
    const storedResume = localStorage.getItem("resumeData");
    const storedAbout = localStorage.getItem("aboutData");
    if (storedResume) setResumeData(JSON.parse(storedResume));
    if (storedAbout) setAboutData(JSON.parse(storedAbout));
  }, []);

  if (!resumeData && !aboutData) {
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No profile data found.</p>
          <button onClick={() => navigate("/talent-dashboard/profile")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Go to Resumes
          </button>
        </div>
      </div>
    );
  }

  const displayName = aboutData?.fullName || "";
  const jobTitle = aboutData?.jobTitle || "";
  const location = aboutData?.location || "";
  const salary = aboutData?.offeredSalary ? `$${aboutData.offeredSalary}/${aboutData.salaryType || ""}` : "";
  const phone = aboutData?.phone || "";
  const email = aboutData?.email || "";
  const experience = aboutData?.experienceTime || "";
  const language = aboutData?.language || "";
  const age = aboutData?.age || "";
  const qualification = aboutData?.qualification || "";
  const aboutMe = aboutData?.aboutMe || resumeData?.aboutMe || "";
  const tags = aboutData?.tags || [];
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const socialLinks = [
  { name: "facebook", icon: Facebook, url: aboutData?.facebook },
  { name: "linkedin", icon: Linkedin, url: aboutData?.linkedin },
  { name: "twitter", icon: Twitter, url: aboutData?.twitter },
  { name: "instagram", icon: Instagram, url: aboutData?.instagram },
  { name: "youtube", icon: Youtube, url: aboutData?.youtube },
];

  return (
    <div className="min-h-screen bg-[#0E0E10] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Overview</h1>
      </div>

      {/* Profile Banner */}
      <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-[#2A2A2E] rounded-lg flex items-center justify-center text-gray-400 text-2xl font-bold border border-white/10">
              {aboutData?.avatar ? (
                <img src={aboutData.avatar} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-blue-500 text-sm font-medium">{jobTitle}</p>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                {displayName}
                <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">Available now</span>
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full font-medium">{tag}</span>
                ))}
                {resumeData?.skills.map((skill, i) => (
                  <span key={`skill-${i}`} className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full font-medium">{skill.title}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <MapPin className="w-4 h-4" /> {location}
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <Clock className="w-4 h-4" /> {salary}
            </div>
            <div className="relative">
              <button onClick={() => setShowEditPopup(!showEditPopup)} className="px-6 py-2 border border-blue-600 text-blue-500 rounded-lg text-sm font-medium hover:bg-blue-600/10 transition-colors">
                Edit Profile
              </button>
              {showEditPopup && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEditPopup(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#2A2A2E] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { setShowEditPopup(false); navigate("/talent-dashboard/about"); }}
                      className="w-full px-4 py-3 text-left text-white text-sm hover:bg-white/5 transition-colors"
                    >
                      About Me
                    </button>
                    <button
                      onClick={() => { setShowEditPopup(false); navigate("/talent-dashboard/resumes"); }}
                      className="w-full px-4 py-3 text-left text-white text-sm hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                      Resume
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6 space-y-5">
            {[
              { label: "Career Finding", value: jobTitle },
              { label: "Location", value: location },
              { label: "Phone Number", value: phone },
              { label: "Email", value: email },
              { label: "Offered Salary", value: salary },
              { label: "Experience time", value: experience },
              { label: "Language", value: language },
              { label: "Age", value: age },
              { label: "Qualification", value: qualification },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{item.label}</span>
                <span className="text-white text-sm font-medium">{item.value}</span>
              </div>
            ))}
            
            <div>
  <span className="text-gray-400 text-sm">Socials:</span>
  <div className="flex gap-2 mt-2">
    {socialLinks.map((social, i) => (
      social.url ? (
        <a 
          key={i} 
          href={social.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-8 h-8 bg-[#2A2A2E] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <social.icon className="w-4 h-4" />
        </a>
      ) : (
        <div key={i} className="w-8 h-8 bg-[#2A2A2E] rounded-full flex items-center justify-center text-gray-500 opacity-50">
          <social.icon className="w-4 h-4" />
        </div>
      )
    ))}
  </div>
</div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 space-y-6">
          {/* About Me */}
          <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">About Me</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{aboutMe}</p>
          </div>

          {/* Education */}
          {resumeData && resumeData.education.length > 0 && (
            <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Education</h3>
              <div className="space-y-6">
                {resumeData.education.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-semibold text-sm">{edu.academy}</span>
                      <span className="text-gray-500 text-xs">{edu.startDate} – {edu.endDate}</span>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">{edu.title}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{edu.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {resumeData && resumeData.experience.length > 0 && (
            <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Experience</h3>
              <div className="space-y-6">
                {resumeData.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-semibold text-sm">{exp.company}</span>
                      <span className="text-gray-500 text-xs">{exp.startDate} – {exp.endDate}</span>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">{exp.title}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {resumeData && resumeData.skills.length > 0 && (
            <div className="bg-[#1A1A1E] rounded-lg border border-white/5 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {resumeData.skills.map((skill, i) => {
                  const percent = Math.min(100, Math.max(0, parseInt(skill.percent) || 0));
                  return (
                    <div key={i}>
                      <p className="text-white text-sm font-medium mb-2">{skill.title}</p>
                      <div className="relative h-2 bg-[#2A2A2E] rounded-full">
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md transition-all duration-500"
                          style={{ left: `calc(${percent}% - 8px)` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <RecentApplication />
        </div>
      </div>
    </div>
  );
};

export default TalentProfileOverview;