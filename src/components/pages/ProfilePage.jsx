import {
  MapPin,
  DollarSign,
  Download,
  MessageSquare,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Play,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { CTA } from "../home/CTA";
import { AnimatedPage } from "../AnimatedPage";

export const ProfilePage = ({ candidate, onBack }) => {
  const [activeTab, setActiveTab] = useState("resume");
  const [currentPortfolioIndex, setCurrentPortfolioIndex] = useState(0);

  const portfolioItems = [
    { type: "video" },
    { type: "image" },
    { type: "image" },
    { type: "image" },
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#0F1419] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 mb-6 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Results
          </button>

          {/* Header */}
          <div className="bg-[#191D23] rounded-2xl p-8 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-6">
                <div className="w-24 h-24 bg-gray-600 rounded-lg flex-shrink-0"></div>
                <div>
                  <span className="text-green-400 text-sm">
                    {candidate.availability}
                  </span>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {candidate.title}
                  </h1>
                  {candidate.verified && (
                    <span className="text-blue-400 text-sm">⚡ Verified</span>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {candidate.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-white text-gray-800 px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                    <span className="text-gray-400 flex items-center gap-1 ml-2">
                      <MapPin className="w-4 h-4" />
                      {candidate.location}
                    </span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {candidate.salary}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download CV
                </button>
                <button className="bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              <div className=" rounded-2xl p-8">
                {/* Tabs */}
                <div className="border-b border-gray-700 mb-6">
                  <div className="flex gap-8">
                    <button
                      onClick={() => setActiveTab("resume")}
                      className={`pb-4 font-medium ${
                        activeTab === "resume"
                          ? "text-white border-b-2 border-blue-500"
                          : "text-gray-400"
                      }`}
                    >
                      Resumes
                    </button>
                    <button
                      onClick={() => setActiveTab("portfolio")}
                      className={`pb-4 font-medium ${
                        activeTab === "portfolio"
                          ? "text-white border-b-2 border-blue-500"
                          : "text-gray-400"
                      }`}
                    >
                      Portfolio
                    </button>
                    <button
                      onClick={() => setActiveTab("contact")}
                      className={`pb-4 font-medium ${
                        activeTab === "contact"
                          ? "text-white border-b-2 border-blue-500"
                          : "text-gray-400"
                      }`}
                    >
                      Contact
                    </button>
                  </div>
                </div>

                {/* Resume Tab */}
                {activeTab === "resume" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold mb-4">About Me</h2>
                      <p className="text-gray-300 leading-relaxed">
                        {candidate.about}
                      </p>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold mb-4">Education</h2>
                      {candidate.education.map((edu, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-gray-700 pl-6 pb-6"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">
                                {edu.school}
                              </p>
                              <p className="text-gray-500 text-sm">
                                {edu.year}
                              </p>
                            </div>
                          </div>
                          <h3 className="text-white font-semibold mt-2">
                            {edu.degree}
                          </h3>
                          <p className="text-gray-400 mt-2">
                            {edu.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h2 className="text-xl font-bold mb-4">Experience</h2>
                      {candidate.experience.map((exp, index) => (
                        <div
                          key={index}
                          className="border-l-2 border-gray-700 pl-6 pb-6"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">
                                {exp.company}
                              </p>
                              <p className="text-gray-500 text-sm">
                                {exp.year}
                              </p>
                            </div>
                          </div>
                          <h3 className="text-white font-semibold mt-2">
                            {exp.position}
                          </h3>
                          <p className="text-gray-400 mt-2">
                            {exp.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h2 className="text-xl font-bold mb-6">
                          Management Skills
                        </h2>
                        <div className="space-y-4">
                          {[
                            { name: "HTML & CSS", value: 75 },
                            { name: "Word", value: 90 },
                            { name: "Excel", value: 85 },
                          ].map((skill, index) => (
                            <div key={index}>
                              <div className="flex justify-between mb-2">
                                <span className="text-white">{skill.name}</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${skill.value}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold mb-6">Design</h2>
                        <div className="space-y-4">
                          {[
                            { name: "Figma", value: 85 },
                            { name: "Photoshop", value: 80 },
                            { name: "Illustration", value: 90 },
                          ].map((skill, index) => (
                            <div key={index}>
                              <div className="flex justify-between mb-2">
                                <span className="text-white">{skill.name}</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${skill.value}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === "portfolio" && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">Portfolio</h2>

                    {/* Main Portfolio Item */}
                    <div className="bg-gray-600 rounded-lg mb-6 aspect-video flex items-center justify-center">
                      {portfolioItems[currentPortfolioIndex].type ===
                      "video" ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <button className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-600 rounded-lg"></div>
                      )}
                    </div>

                    {/* Thumbnail Navigation */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setCurrentPortfolioIndex(
                            Math.max(0, currentPortfolioIndex - 1)
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                        disabled={currentPortfolioIndex === 0}
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                      </button>

                      <div className="grid grid-cols-3 gap-4">
                        {portfolioItems.slice(0, 3).map((item, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPortfolioIndex(index)}
                            className={`bg-gray-600 rounded-lg aspect-video ${
                              currentPortfolioIndex === index
                                ? "ring-2 ring-blue-500"
                                : ""
                            }`}
                          >
                            {item.type === "video" && index === 0 && (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPortfolioIndex(
                            Math.min(
                              portfolioItems.length - 1,
                              currentPortfolioIndex + 1
                            )
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                        disabled={
                          currentPortfolioIndex === portfolioItems.length - 1
                        }
                      >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact Tab */}
                {activeTab === "contact" && (
                  <div>
                    <h2 className="text-xl font-bold mb-6">
                      Contact Candidate
                    </h2>
                    <form className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 mb-2">
                            Subject
                          </label>
                          <input
                            type="text"
                            placeholder="Subject"
                            className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            placeholder="Tony Nguyen"
                            className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="jobtex@mail.com"
                          className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 mb-2">
                          Message
                        </label>
                        <textarea
                          rows="6"
                          placeholder="Message..."
                          className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                      >
                        Send Private Message
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-96 flex-shrink-0">
              <div className="bg-[#191D23] rounded-2xl p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Career Finding</span>
                    <span className="text-white font-medium">
                      UI UX Designer
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Location</span>
                    <span className="text-white font-medium">
                      Hanoi City, VietNam
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Phone Number</span>
                    <span className="text-white font-medium">
                      {candidate.phone}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white font-medium">
                      {candidate.email}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Offered Salary</span>
                    <span className="text-white font-medium">
                      {candidate.offeredSalary}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Experience time</span>
                    <span className="text-white font-medium">
                      {candidate.experienceTime}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Language</span>
                    <span className="text-white font-medium">
                      {candidate.language}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Age</span>
                    <span className="text-white font-medium">
                      {candidate.age}
                    </span>
                  </div>

                  <div className="flex justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-400">Qualification</span>
                    <span className="text-white font-medium">
                      {candidate.qualification}
                    </span>
                  </div>

                  <div className="py-3">
                    <span className="text-gray-400 block mb-3">Socials:</span>
                    <div className="flex gap-3">
                      <button className="w-10 h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <Facebook className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <Linkedin className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <Twitter className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <Instagram className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors">
                        <Youtube className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0F1419] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">SAMLE_CV_JOBITEX</p>
                      <p className="text-white font-medium">PDF</p>
                    </div>
                  </div>
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download CV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CTA />
    </AnimatedPage>
  );
};
