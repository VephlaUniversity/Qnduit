import React from "react";
import {
  MapPin,
  Edit,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { FaPinterest } from "react-icons/fa";
export const EmployerProfile = () => {
  const navigate = useNavigate();

  const availableJobs = [
    {
      company: "Tarnsal Law Group LLC",
      title: "HR Administration",
      verified: true,
      location: "Las Vegas, NV 89107, USA",
      postedDate: "2 days ago",
      tags: ["Part-time", "Remote"],
      rating: 5,
      salary: "$83,000 - $110,000",
      daysLeft: 22,
    },
    {
      company: "Tarnsal Law Group LLC",
      title: "HR Administration",
      verified: true,
      location: "Las Vegas, NV 89107, USA",
      postedDate: "2 days ago",
      tags: ["Part-time", "Remote"],
      rating: 5,
      salary: "$83,000 - $110,000",
      daysLeft: 22,
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          Profile
        </h1>
      </div>

      {/* Profile Header */}
      <div className="bg-[#1A1A1E] rounded-lg p-6 border border-white/5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-600 flex-shrink-0"></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">
                  Avitex Agency
                </h2>
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>Las Vegas, NV 89107, USA</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard/profile-settings")}
            className="px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="bg-[#0E0E10] rounded-lg p-4 h-64 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-2xl text-gray-400">▶</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Website</span>
                <a href="#" className="text-blue-500 hover:underline">
                  avitex.vn
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">hi.avitex@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Industry</span>
                <span className="text-white">Internet Publishing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Company size</span>
                <span className="text-white">51-200 Employees</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Headquarters</span>
                <span className="text-white">Valley, Las Vegas, USA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Founded</span>
                <span className="text-white">2017</span>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-3">Socials:</p>
              <div className="flex gap-2">
                {[
                  Facebook,
                  Linkedin,
                  Twitter,
                  FaPinterest,
                  Instagram,
                  Youtube,
                ].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* About Company */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                About Company
              </h3>
              <p className="text-gray-400 leading-relaxed mb-4">
                Are you a User Experience Designer with a track record of
                delivering intuitive digital experiences that drive results? Are
                you a strategic storyteller and systems thinker who can concept
                and craft smart, world-class campaigns across a variety of
                mediums?
              </p>
              <p className="text-gray-400 leading-relaxed">
                Deloitte's Green Dot Agency is looking to add a Lead User
                Experience Designer to our experience design team. We want a
                passionate creative who's inspired by new trends and emerging
                technologies, and is able to integrate them into memorable user
                experiences. A problem solver who is entrepreneurial,
                collaborative, hungry, and humble; can deliver beautifully
                designed, leading-edge experiences under tight deadlines; and
                who has demonstrated a proven expertise.
              </p>
            </div>

            {/* Video Gallery */}
            <div>
              <div className="bg-[#0E0E10] rounded-lg p-8 h-80 flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                  <span className="text-2xl text-white">▶</span>
                </div>
              </div>
              <div className="flex justify-center items-center gap-4">
                <button className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-32 h-20 bg-gray-700 rounded-lg"
                    ></div>
                  ))}
                </div>
                <button className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Available Jobs */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Available Jobs
              </h3>
              <div className="space-y-4">
                {availableJobs.map((job, index) => (
                  <div
                    key={index}
                    className="bg-[#0E0E10] rounded-lg p-6 border border-white/5 hover:border-blue-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-16 h-16 rounded bg-gray-600 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-blue-500 text-sm">
                              {job.company}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-white font-semibold text-lg">
                              {job.title}
                            </h4>
                            {job.verified && (
                              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                            <span>•</span>
                            <span>{job.postedDate}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4 fill-yellow-500 text-yellow-500"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                        <Heart className="w-6 h-6 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <span className="font-semibold text-white">
                          {job.salary}
                        </span>
                        <span>/year</span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {job.daysLeft} days left to apply
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerProfile;
