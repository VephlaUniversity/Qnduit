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
import { AnimatePresence, motion } from "framer-motion";

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
    <>
      <div className="min-h-screen bg-[#0F1419] text-white p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <motion.button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 mb-6 flex items-center gap-2"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <ChevronLeft className="w-4 h-4" /> Back to Results
          </motion.button>

          {/* Header */}
          <motion.div
            className="bg-[#191D23] rounded-2xl p-5 md:p-8 mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <motion.div
                className="flex flex-col gap-4 sm:flex-row sm:gap-6"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-600 rounded-lg flex-shrink-0" />
                <div>
                  <span className="text-green-400 text-sm">
                    {candidate.availability}
                  </span>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    {candidate.name}
                  </h1>
                  <h5 className="mb-2 text-sm md:text-base text-gray-300">
                    {candidate.title}
                  </h5>
                  {candidate.verified && (
                    <span className="text-blue-400 text-sm">⚡ Verified</span>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {candidate.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs md:text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                    <span className="text-gray-400 flex items-center gap-1 ml-0 sm:ml-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      {candidate.location}
                    </span>
                    <span className="text-gray-400 flex items-center gap-1 text-sm">
                      <DollarSign className="w-4 h-4" />
                      {candidate.salary}
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex gap-3 flex-wrap"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              >
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium flex items-center gap-2 text-sm md:text-base">
                  <Download className="w-4 h-4" />
                  Download CV
                </button>
                <button className="bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium flex items-center gap-2 text-sm md:text-base">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              </motion.div>
            </div>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <motion.div
              className="flex-1 min-w-0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
            >
              <div className="rounded-2xl p-4 md:p-8">
                {/* Tabs */}
                <div className="border-b border-gray-700 mb-6 overflow-x-auto">
                  <div className="flex gap-4 md:gap-8 min-w-max">
                    {["resume", "portfolio", "contact"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 font-medium capitalize whitespace-nowrap text-sm md:text-base ${
                          activeTab === tab
                            ? "text-white border-b-2 border-blue-500"
                            : "text-gray-400"
                        }`}
                      >
                        {tab === "resume"
                          ? "Resumes"
                          : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {/* Resume Tab */}
                  {activeTab === "resume" && (
                    <motion.div
                      key="resume"
                      className="space-y-8"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div>
                        <h2 className="text-lg md:text-xl font-bold mb-4">
                          About Me
                        </h2>
                        <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                          {candidate.about}
                        </p>
                      </div>

                      <div>
                        <h2 className="text-lg md:text-xl font-bold mb-4">
                          Education
                        </h2>
                        {candidate.education.map((edu, index) => (
                          <motion.div
                            key={index}
                            className="border-l-2 border-gray-700 pl-4 md:pl-6 pb-6"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.4,
                              ease: "easeOut",
                              delay: index * 0.08,
                            }}
                          >
                            <p className="text-gray-400 text-sm">
                              {edu.school}
                            </p>
                            <p className="text-gray-500 text-sm">{edu.year}</p>
                            <h3 className="text-white font-semibold mt-2 text-sm md:text-base">
                              {edu.degree}
                            </h3>
                            <p className="text-gray-400 mt-2 text-sm md:text-base">
                              {edu.description}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      <div>
                        <h2 className="text-lg md:text-xl font-bold mb-4">
                          Experience
                        </h2>
                        {candidate.experience.map((exp, index) => (
                          <motion.div
                            key={index}
                            className="border-l-2 border-gray-700 pl-4 md:pl-6 pb-6"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.4,
                              ease: "easeOut",
                              delay: index * 0.08,
                            }}
                          >
                            <p className="text-gray-400 text-sm">
                              {exp.company}
                            </p>
                            <p className="text-gray-500 text-sm">{exp.year}</p>
                            <h3 className="text-white font-semibold mt-2 text-sm md:text-base">
                              {exp.position}
                            </h3>
                            <p className="text-gray-400 mt-2 text-sm md:text-base">
                              {exp.description}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                        {[
                          {
                            title: "Management Skills",
                            skills: [
                              { name: "HTML & CSS", value: 75 },
                              { name: "Word", value: 90 },
                              { name: "Excel", value: 85 },
                            ],
                          },
                          {
                            title: "Design",
                            skills: [
                              { name: "Figma", value: 85 },
                              { name: "Photoshop", value: 80 },
                              { name: "Illustration", value: 90 },
                            ],
                          },
                        ].map((group, groupIdx) => (
                          <div key={groupIdx}>
                            <h2 className="text-lg md:text-xl font-bold mb-6">
                              {group.title}
                            </h2>
                            <div className="space-y-4">
                              {group.skills.map((skill, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    duration: 0.4,
                                    ease: "easeOut",
                                    delay: index * 0.1,
                                  }}
                                >
                                  <div className="flex justify-between mb-2">
                                    <span className="text-white text-sm md:text-base">
                                      {skill.name}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-700 rounded-full h-2">
                                    <motion.div
                                      className="bg-blue-500 h-2 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${skill.value}%` }}
                                      transition={{
                                        duration: 0.8,
                                        ease: "easeOut",
                                        delay: 0.3 + index * 0.1,
                                      }}
                                    />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Portfolio Tab */}
                  {activeTab === "portfolio" && (
                    <motion.div
                      key="portfolio"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <h2 className="text-lg md:text-xl font-bold mb-6">
                        Portfolio
                      </h2>
                      <div className="bg-gray-600 rounded-lg mb-6 aspect-video flex items-center justify-center">
                        {portfolioItems[currentPortfolioIndex].type ===
                        "video" ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <button className="w-12 h-12 md:w-16 md:h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                              <Play className="w-6 h-6 md:w-8 md:h-8 text-white ml-1" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-600 rounded-lg" />
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setCurrentPortfolioIndex(
                              Math.max(0, currentPortfolioIndex - 1),
                            )
                          }
                          className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                          disabled={currentPortfolioIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-800" />
                        </button>
                        <div className="grid grid-cols-3 gap-2 md:gap-4 px-10 md:px-0">
                          {portfolioItems.slice(0, 3).map((item, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentPortfolioIndex(index)}
                              className={`bg-gray-600 rounded-lg aspect-video ${currentPortfolioIndex === index ? "ring-2 ring-blue-500" : ""}`}
                            >
                              {item.type === "video" && index === 0 && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="w-6 h-6 md:w-8 md:h-8 text-white" />
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
                                currentPortfolioIndex + 1,
                              ),
                            )
                          }
                          className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                          disabled={
                            currentPortfolioIndex === portfolioItems.length - 1
                          }
                        >
                          <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-800" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Contact Tab */}
                  {activeTab === "contact" && (
                    <motion.div
                      key="contact"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <h2 className="text-lg md:text-xl font-bold mb-6">
                        Contact Candidate
                      </h2>
                      <form className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-300 mb-2 text-sm md:text-base">
                              Subject
                            </label>
                            <input
                              type="text"
                              placeholder="Subject"
                              className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 mb-2 text-sm md:text-base">
                              Name
                            </label>
                            <input
                              type="text"
                              placeholder="Tony Nguyen"
                              className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2 text-sm md:text-base">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="jobtex@mail.com"
                            className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2 text-sm md:text-base">
                            Message
                          </label>
                          <textarea
                            rows="6"
                            placeholder="Message..."
                            className="w-full bg-[#0F1419] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none text-sm md:text-base"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 md:px-8 py-3 rounded-lg font-medium transition-colors text-sm md:text-base w-full sm:w-auto"
                        >
                          Send Private Message
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              className="w-full lg:w-80 xl:w-96 flex-shrink-0"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            >
              <div className="bg-[#191D23] rounded-2xl p-5 md:p-6 space-y-6">
                <div className="space-y-1">
                  {[
                    { label: "Career Finding", value: "UI UX Designer" },
                    { label: "Location", value: "Hanoi City, VietNam" },
                    { label: "Phone Number", value: candidate.phone },
                    { label: "Email", value: candidate.email },
                    { label: "Offered Salary", value: candidate.offeredSalary },
                    {
                      label: "Experience time",
                      value: candidate.experienceTime,
                    },
                    { label: "Language", value: candidate.language },
                    { label: "Age", value: candidate.age },
                    { label: "Qualification", value: candidate.qualification },
                  ].map(({ label, value }, index) => (
                    <motion.div
                      key={label}
                      className="flex justify-between py-3 border-b border-gray-700 gap-4"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: "easeOut",
                        delay: 0.35 + index * 0.05,
                      }}
                    >
                      <span className="text-gray-400 text-sm flex-shrink-0">
                        {label}
                      </span>
                      <span className="text-white font-medium text-sm text-right break-all">
                        {value}
                      </span>
                    </motion.div>
                  ))}

                  <motion.div
                    className="py-3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.85 }}
                  >
                    <span className="text-gray-400 block mb-3 text-sm">
                      Socials:
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        Facebook,
                        Linkedin,
                        Twitter,
                        Share2,
                        Instagram,
                        Youtube,
                      ].map((Icon, idx) => (
                        <button
                          key={idx}
                          className="w-9 h-9 md:w-10 md:h-10 bg-[#0F1419] rounded flex items-center justify-center hover:bg-blue-500 transition-colors"
                        >
                          <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  className="bg-[#0F1419] rounded-lg p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.9 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                      <Download className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">SAMLE_CV_JOBITEX</p>
                      <p className="text-white font-medium text-sm md:text-base">
                        PDF
                      </p>
                    </div>
                  </div>
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 text-sm md:text-base">
                    <Download className="w-4 h-4" />
                    Download CV
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <CTA />
    </>
  );
};
